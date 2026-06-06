import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  onDisconnect,
  update,
  serverTimestamp,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBoejQvZ_A8pkoW4ok7lVYGhyBElQVY-mc",
  authDomain: "hackathon-2-6b4aa.firebaseapp.com",
  databaseURL: "https://hackathon-2-6b4aa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hackathon-2-6b4aa",
  storageBucket: "hackathon-2-6b4aa.firebasestorage.app",
  messagingSenderId: "550616375056",
  appId: "1:550616375056:web:fb184f7622a1864c930f95",
  measurementId: "G-6GNCSW3N0G",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const HOST_ROOM_KEY = "nightAction_hostRoom";
const CLIENT_ID_KEY = "nightAction_clientId";

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
let onRemoteLeft = null;
let onJoinFailed = null;

function getOrCreateClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `c_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `c_${Math.random().toString(36).slice(2, 11)}`;
  }
}

function getStoredHostRoom() {
  try {
    return localStorage.getItem(HOST_ROOM_KEY);
  } catch {
    return null;
  }
}

function setStoredHostRoom(id) {
  try {
    localStorage.setItem(HOST_ROOM_KEY, id);
  } catch { /* ignore */ }
}

export function clearStoredHostRoom() {
  try {
    localStorage.removeItem(HOST_ROOM_KEY);
  } catch { /* ignore */ }
}

function shouldRejoinAsHost(existingRoom, roleParam) {
  if (roleParam === "host") return true;
  return getStoredHostRoom() === existingRoom;
}

function bindHostListeners() {
  const guestRef = ref(db, `rooms/${roomId}/guest`);
  let guestJoinNotified = false;
  const unsubGuest = onValue(guestRef, (snap) => {
    if (!snap.exists()) {
      if (guestJoinNotified && onRemoteLeft) onRemoteLeft("guest");
      guestJoinNotified = false;
      return;
    }
    if (!guestJoinNotified) {
      guestJoinNotified = true;
      if (onGuestJoined) onGuestJoined(snap.val());
      if (onRoomReady) onRoomReady();
    }
  });
  unsubscribes.push(unsubGuest);

  listenRemote("guest");

  const winRef = ref(db, `rooms/${roomId}/guestWin`);
  unsubscribes.push(onValue(winRef, (snap) => {
    const data = snap.val();
    if (data && onRemoteWin) onRemoteWin(data);
  }));

  const readyRef = ref(db, `rooms/${roomId}/guestReady`);
  unsubscribes.push(onValue(readyRef, (snap) => {
    if (snap.val() === true && onGuestReady) onGuestReady();
  }));
}

function bindGuestListeners() {
  listenRemote("host");

  const stateRef = ref(db, `rooms/${roomId}/gameState`);
  unsubscribes.push(onValue(stateRef, (snap) => {
    const data = snap.val();
    if (data && onGameState) onGameState(data);
  }));

  const winRef = ref(db, `rooms/${roomId}/hostWin`);
  unsubscribes.push(onValue(winRef, (snap) => {
    const data = snap.val();
    if (data && onRemoteWin) onRemoteWin(data);
  }));

  const hostRef = ref(db, `rooms/${roomId}/host`);
  let hostSeen = false;
  unsubscribes.push(onValue(hostRef, (snap) => {
    if (snap.exists()) {
      hostSeen = true;
      return;
    }
    if (hostSeen && onRemoteLeft) onRemoteLeft("host");
    hostSeen = false;
  }));
}

/**
 * 初始化多人联机
 */
export async function initMultiplayer(callbacks) {
  onRemoteUpdate = callbacks.onRemoteUpdate || null;
  onRemotePunch = callbacks.onRemotePunch || null;
  onRemoteWin = callbacks.onRemoteWin || null;
  onGuestJoined = callbacks.onGuestJoined || null;
  onRoomReady = callbacks.onRoomReady || null;
  onGameState = callbacks.onGameState || null;
  onGuestReady = callbacks.onGuestReady || null;
  onRemoteLeft = callbacks.onRemoteLeft || null;
  onJoinFailed = callbacks.onJoinFailed || null;

  const params = new URLSearchParams(window.location.search);
  const existingRoom = params.get("room");
  const roleParam = params.get("role");

  if (existingRoom && shouldRejoinAsHost(existingRoom, roleParam)) {
    await rejoinAsHost(existingRoom);
  } else if (existingRoom) {
    await joinRoom(existingRoom);
  } else {
    createRoom();
  }
}

function createRoom() {
  isHost = true;
  playerId = "host";
  roomId = generateRoomId();
  setStoredHostRoom(roomId);

  const url = new URL(window.location);
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "host");
  window.history.replaceState({}, "", url);

  roomRef = ref(db, `rooms/${roomId}`);
  myRef = ref(db, `rooms/${roomId}/host`);

  set(ref(db, `rooms/${roomId}/gameState`), null);
  set(ref(db, `rooms/${roomId}/guestReady`), false);
  clearRoundSignals();

  set(myRef, {
    x: 0,
    z: 0,
    rotation: 0,
    clientId: getOrCreateClientId(),
    joinedAt: serverTimestamp(),
  });

  onDisconnect(roomRef).remove();
  bindHostListeners();
}

async function rejoinAsHost(id) {
  isHost = true;
  playerId = "host";
  roomId = id;
  setStoredHostRoom(roomId);

  const url = new URL(window.location);
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "host");
  window.history.replaceState({}, "", url);

  roomRef = ref(db, `rooms/${roomId}`);
  myRef = ref(db, `rooms/${roomId}/host`);

  const hostSnap = await get(myRef);
  if (!hostSnap.exists()) {
    set(ref(db, `rooms/${roomId}/gameState`), null);
    set(ref(db, `rooms/${roomId}/guestReady`), false);
    clearRoundSignals();
  }

  set(myRef, {
    x: hostSnap.val()?.x ?? 0,
    z: hostSnap.val()?.z ?? 0,
    rotation: hostSnap.val()?.rotation ?? 0,
    hp: hostSnap.val()?.hp,
    clientId: getOrCreateClientId(),
    joinedAt: serverTimestamp(),
  });

  onDisconnect(roomRef).remove();
  bindHostListeners();

  const guestSnap = await get(ref(db, `rooms/${roomId}/guest`));
  if (guestSnap.exists()) {
    if (onGuestJoined) onGuestJoined(guestSnap.val());
    if (onRoomReady) onRoomReady();
  }
}

async function joinRoom(id) {
  const clientId = getOrCreateClientId();
  const hostRef = ref(db, `rooms/${id}/host`);
  const hostSnap = await get(hostRef);
  if (!hostSnap.exists()) {
    if (onJoinFailed) onJoinFailed("room_not_found");
    return;
  }

  const guestRef = ref(db, `rooms/${id}/guest`);
  const guestSnap = await get(guestRef);
  if (guestSnap.exists() && guestSnap.val()?.clientId && guestSnap.val().clientId !== clientId) {
    if (onJoinFailed) onJoinFailed("room_full");
    return;
  }

  isHost = false;
  playerId = "guest";
  roomId = id;

  const url = new URL(window.location);
  url.searchParams.set("room", roomId);
  url.searchParams.delete("role");
  window.history.replaceState({}, "", url);

  roomRef = ref(db, `rooms/${roomId}`);
  myRef = ref(db, `rooms/${roomId}/guest`);

  const prev = guestSnap.val();
  set(myRef, {
    x: prev?.x ?? 0,
    z: prev?.z ?? 0,
    rotation: prev?.rotation ?? 0,
    hp: prev?.hp,
    clientId,
    joinedAt: serverTimestamp(),
  });

  onDisconnect(myRef).remove();
  bindGuestListeners();

  const stateSnap = await get(ref(db, `rooms/${roomId}/gameState`));
  if (stateSnap.exists() && onGameState) onGameState(stateSnap.val());

  if (onRoomReady) onRoomReady();
}

function listenRemote(remoteId) {
  const remoteRef = ref(db, `rooms/${roomId}/${remoteId}`);
  unsubscribes.push(onValue(remoteRef, (snap) => {
    const data = snap.val();
    if (data && onRemoteUpdate) onRemoteUpdate(data);
  }));

  const punchRef = ref(db, `rooms/${roomId}/${remoteId}Punch`);
  unsubscribes.push(onValue(punchRef, (snap) => {
    const data = snap.val();
    if (data && onRemotePunch) onRemotePunch(data);
  }));
}

let lastSyncTime = 0;
let lastSyncX = 0;
let lastSyncZ = 0;
let lastSyncRot = 0;

export function syncPosition(x, z, rotation) {
  const now = performance.now();
  const moved = Math.hypot(x - lastSyncX, z - lastSyncZ) > 0.035;
  const rotated = Math.abs(rotation - lastSyncRot) > 0.06;
  if (now - lastSyncTime < 33 && !moved && !rotated) return;
  lastSyncTime = now;
  lastSyncX = x;
  lastSyncZ = z;
  lastSyncRot = rotation;

  if (!myRef) return;
  update(myRef, { x, z, rotation });
}

export function syncPunch(x, z, rotation, extra = {}) {
  if (!roomId) return;
  const punchRef = ref(db, `rooms/${roomId}/${playerId}Punch`);
  set(punchRef, { x, z, rotation, ...extra, t: serverTimestamp() });
}

export function syncHp(hp) {
  if (!myRef) return;
  update(myRef, { hp });
}

export function syncGameState(state) {
  if (!roomId || !isHost) return;
  const stateRef = ref(db, `rooms/${roomId}/gameState`);
  set(stateRef, state);
}

export function syncGuestReady(ready) {
  if (!roomId || isHost) return;
  const readyRef = ref(db, `rooms/${roomId}/guestReady`);
  set(readyRef, ready);
}

export function clearGuestReady() {
  if (!roomId || !isHost) return;
  const readyRef = ref(db, `rooms/${roomId}/guestReady`);
  set(readyRef, false);
}

export function syncWin(data) {
  if (!roomId) return;
  const winRef = ref(db, `rooms/${roomId}/${playerId}Win`);
  set(winRef, { ...data, t: serverTimestamp() });
}

export function clearRoundSignals() {
  if (!roomId) return;
  set(ref(db, `rooms/${roomId}/hostPunch`), null);
  set(ref(db, `rooms/${roomId}/guestPunch`), null);
  set(ref(db, `rooms/${roomId}/hostWin`), null);
  set(ref(db, `rooms/${roomId}/guestWin`), null);
}

export function getShareLink() {
  const url = new URL(window.location);
  url.searchParams.set("room", roomId);
  url.searchParams.delete("role");
  return url.toString();
}

export function getIsHost() {
  return isHost;
}

export function isConnected() {
  return roomId !== null;
}

export function getRoomId() {
  return roomId;
}

export function leaveRoom() {
  unsubscribes.forEach((unsub) => unsub());
  unsubscribes = [];
  if (isHost && roomRef) {
    set(roomRef, null);
    clearStoredHostRoom();
  } else if (myRef) {
    set(myRef, null);
  }
  roomId = null;
  playerId = null;
  isHost = false;
  roomRef = null;
  myRef = null;
  lastSyncTime = 0;
  lastSyncX = 0;
  lastSyncZ = 0;
  lastSyncRot = 0;
}

/** @deprecated 使用 leaveRoom */
export function cleanup() {
  leaveRoom();
}

function generateRoomId() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
