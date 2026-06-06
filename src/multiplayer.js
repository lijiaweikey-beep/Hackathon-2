import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect,
  push,
  update,
  serverTimestamp,
} from "firebase/database";

// ⚠️ 替换为你自己的 Firebase 配置
// 去 https://console.firebase.google.com 创建项目 → 项目设置 → 添加 Web 应用 → 拿到配置
const firebaseConfig = {
  apiKey: "AIzaSyBoejQvZ_A8pkoW4ok7lVYGhyBElQVY-mc",
  authDomain: "hackathon-2-6b4aa.firebaseapp.com",
  databaseURL: "https://hackathon-2-6b4aa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hackathon-2-6b4aa",
  storageBucket: "hackathon-2-6b4aa.firebasestorage.app",
  messagingSenderId: "550616375056",
  appId: "1:550616375056:web:fb184f7622a1864c930f95",
  measurementId: "G-6GNCSW3N0G"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let roomId = null;
let playerId = null;
let isHost = false;
let roomRef = null;
let myRef = null;
let unsubscribes = [];
let onRemoteUpdate = null;
let onRemotePunch = null;
let onRemoteWin = null;
let onGuestJoined = null;
let onRoomReady = null;
let onGameState = null;
let onGuestReady = null;

/**
 * 初始化多人联机
 * @param {object} callbacks
 * @param {function} callbacks.onRemoteUpdate - 收到对手位置更新 {x, z, rotation}
 * @param {function} callbacks.onRemotePunch - 收到对手出拳事件
 * @param {function} callbacks.onRemoteWin - 收到对手胜利事件
 * @param {function} callbacks.onGuestJoined - (host) 客人加入房间
 * @param {function} callbacks.onRoomReady - 房间就绪（两人到齐）
 * @param {function} callbacks.onGameState - (guest) 收到游戏初始状态
 * @param {function} callbacks.onGuestReady - (host) 选手确认就绪
 */
export function initMultiplayer(callbacks) {
  onRemoteUpdate = callbacks.onRemoteUpdate || null;
  onRemotePunch = callbacks.onRemotePunch || null;
  onRemoteWin = callbacks.onRemoteWin || null;
  onGuestJoined = callbacks.onGuestJoined || null;
  onRoomReady = callbacks.onRoomReady || null;
  onGameState = callbacks.onGameState || null;
  onGuestReady = callbacks.onGuestReady || null;

  const params = new URLSearchParams(window.location.search);
  const existingRoom = params.get("room");

  if (existingRoom) {
    joinRoom(existingRoom);
  } else {
    createRoom();
  }
}

function createRoom() {
  isHost = true;
  playerId = "host";
  roomId = generateRoomId();

  // 更新 URL（不刷新页面）
  const url = new URL(window.location);
  url.searchParams.set("room", roomId);
  window.history.replaceState({}, "", url);

  roomRef = ref(db, `rooms/${roomId}`);
  myRef = ref(db, `rooms/${roomId}/host`);

  // 写入主机信息
  set(myRef, { x: 0, z: 0, rotation: 0, joinedAt: serverTimestamp() });

  // 断线清理
  onDisconnect(roomRef).remove();

  // 等待客人加入
  const guestRef = ref(db, `rooms/${roomId}/guest`);
  const unsub = onValue(guestRef, (snap) => {
    if (snap.exists() && onGuestJoined) {
      onGuestJoined(snap.val());
      if (onRoomReady) onRoomReady();
    }
  });
  unsubscribes.push(unsub);

  // 监听客人位置
  listenRemote("guest");

  // 监听客人胜利
  const winRef = ref(db, `rooms/${roomId}/guestWin`);
  const unsubWin = onValue(winRef, (snap) => {
    const data = snap.val();
    if (data && onRemoteWin) onRemoteWin(data);
  });
  unsubscribes.push(unsubWin);

  // 监听选手确认就绪
  const readyRef = ref(db, `rooms/${roomId}/guestReady`);
  const unsubReady = onValue(readyRef, (snap) => {
    if (snap.val() === true && onGuestReady) onGuestReady();
  });
  unsubscribes.push(unsubReady);
}

function joinRoom(id) {
  isHost = false;
  playerId = "guest";
  roomId = id;

  roomRef = ref(db, `rooms/${roomId}`);
  myRef = ref(db, `rooms/${roomId}/guest`);

  // 写入客人信息
  set(myRef, { x: 0, z: 0, rotation: 0, joinedAt: serverTimestamp() });

  // 断线清理（只清理自己的数据）
  onDisconnect(myRef).remove();

  // 监听主机位置
  listenRemote("host");

  // 监听游戏初始状态（NPC位置、目标等）
  const stateRef = ref(db, `rooms/${roomId}/gameState`);
  const unsubState = onValue(stateRef, (snap) => {
    const data = snap.val();
    if (data && onGameState) onGameState(data);
  });
  unsubscribes.push(unsubState);

  // 监听对手胜利
  const winRef = ref(db, `rooms/${roomId}/hostWin`);
  const unsubWin = onValue(winRef, (snap) => {
    const data = snap.val();
    if (data && onRemoteWin) onRemoteWin(data);
  });
  unsubscribes.push(unsubWin);

  // 通知就绪
  if (onRoomReady) onRoomReady();
}

function listenRemote(remoteId) {
  const remoteRef = ref(db, `rooms/${roomId}/${remoteId}`);
  const unsub = onValue(remoteRef, (snap) => {
    const data = snap.val();
    if (data && onRemoteUpdate) {
      onRemoteUpdate(data);
    }
  });
  unsubscribes.push(unsub);

  // 监听对手出拳
  const punchRef = ref(db, `rooms/${roomId}/${remoteId}Punch`);
  const unsubPunch = onValue(punchRef, (snap) => {
    const data = snap.val();
    if (data && onRemotePunch) {
      onRemotePunch(data);
    }
  });
  unsubscribes.push(unsubPunch);
}

/**
 * 同步本地玩家位置（每帧调用，内部节流到 ~20fps）
 */
let lastSyncTime = 0;
export function syncPosition(x, z, rotation) {
  const now = performance.now();
  if (now - lastSyncTime < 50) return; // 20fps
  lastSyncTime = now;

  if (!myRef) return;
  update(myRef, { x, z, rotation });
}

/**
 * 同步出拳事件
 */
export function syncPunch(x, z, rotation) {
  if (!roomId) return;
  const punchRef = ref(db, `rooms/${roomId}/${playerId}Punch`);
  set(punchRef, { x, z, rotation, t: serverTimestamp() });
}

/**
 * 同步游戏初始状态（host 调用，发送 NPC 位置等）
 */
export function syncGameState(state) {
  if (!roomId || !isHost) return;
  const stateRef = ref(db, `rooms/${roomId}/gameState`);
  set(stateRef, state);
}

/**
 * 选手确认就绪
 */
export function syncGuestReady(ready) {
  if (!roomId || isHost) return;
  const readyRef = ref(db, `rooms/${roomId}/guestReady`);
  set(readyRef, ready);
}

/**
 * 重置选手就绪状态（房主选关时调用）
 */
export function clearGuestReady() {
  if (!roomId || !isHost) return;
  const readyRef = ref(db, `rooms/${roomId}/guestReady`);
  set(readyRef, false);
}

/**
 * 同步胜利事件
 */
export function syncWin(data) {
  if (!roomId) return;
  const winRef = ref(db, `rooms/${roomId}/${playerId}Win`);
  set(winRef, { ...data, t: serverTimestamp() });
}

/**
 * 获取分享链接
 */
export function getShareLink() {
  const url = new URL(window.location);
  url.searchParams.set("room", roomId);
  return url.toString();
}

/**
 * 是否房主
 */
export function getIsHost() {
  return isHost;
}

/**
 * 是否已连接（有房间）
 */
export function isConnected() {
  return roomId !== null;
}

/**
 * 获取房间 ID
 */
export function getRoomId() {
  return roomId;
}

/**
 * 清理所有监听和连接
 */
export function cleanup() {
  unsubscribes.forEach((unsub) => unsub());
  unsubscribes = [];
  if (roomRef) {
    set(roomRef, null);
  }
}

/**
 * 生成 6 位房间 ID
 */
function generateRoomId() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
