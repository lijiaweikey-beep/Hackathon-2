import * as THREE from "three";

export const textureCache = { floor: {}, wall: {} };

export function isCachedTexture(tex) {
  for (const key in textureCache.floor) if (textureCache.floor[key] === tex) return true;
  for (const key in textureCache.wall) if (textureCache.wall[key] === tex) return true;
  return false;
}

export function getCachedTexture(cache, key, factory) {
  if (cache[key]) return cache[key];
  cache[key] = factory();
  return cache[key];
}

export function makeFloorTexture(kind) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 1024;
  canvasTexture.height = 1024;
  const ctx = canvasTexture.getContext("2d");

  if (kind === "gaming") {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
    for (let y = 0; y < 1024; y += 64) {
      for (let x = 0; x < 1024; x += 64) {
        ctx.fillStyle = (x + y) % 128 === 0 ? "#141f31" : "#0d1522";
        ctx.fillRect(x, y, 64, 64);
      }
    }
    ctx.fillStyle = "rgba(66, 153, 225, 0.12)";
    for (let i = 0; i < 10; i += 1) {
      ctx.fillRect(90 + i * 92, 128, 46, 150);
      ctx.fillRect(90 + i * 92, 694, 46, 150);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 1024; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();
    }
  } else if (kind === "bloodmoon") {
    const gradient = ctx.createRadialGradient(512, 500, 80, 512, 500, 720);
    gradient.addColorStop(0, "#3f0b12");
    gradient.addColorStop(0.52, "#1f1218");
    gradient.addColorStop(1, "#09080d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
    ctx.fillStyle = "rgba(248, 113, 113, 0.12)";
    for (let y = 0; y < 1024; y += 92) {
      ctx.fillRect(0, y + 34, 1024, 10);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 5;
    for (let x = -120; x < 1120; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 260, 1024);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(185, 28, 28, 0.24)";
    for (let i = 0; i < 12; i += 1) {
      const x = 70 + i * 82;
      const y = 120 + Math.sin(i * 1.7) * 90 + (i % 3) * 190;
      ctx.beginPath();
      ctx.ellipse(x, y, 42 + (i % 4) * 16, 16 + (i % 3) * 10, Math.sin(i) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "library") {
    ctx.fillStyle = "#d9caa5";
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
    for (let y = 0; y < 1024; y += 72) {
      ctx.fillStyle = y % 144 === 0 ? "#cdbb90" : "#e2d5b8";
      ctx.fillRect(0, y, 1024, 72);
    }
    ctx.strokeStyle = "rgba(92, 58, 35, 0.18)";
    ctx.lineWidth = 3;
    for (let x = 0; x < 1024; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(60, 96, 120, 0.16)";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(90 + i * 128, 96, 70, 730);
    }
  } else if (kind === "office") {
    // 灰蓝方块地毯纹理（PRD: 开放式办公室灰蓝地毯）
    ctx.fillStyle = "#1e2a3a";
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
    // 方块地毯纹理
    for (let y = 0; y < 1024; y += 64) {
      for (let x = 0; x < 1024; x += 64) {
        ctx.fillStyle = (x + y) % 128 === 0 ? "#243345" : "#1a2838";
        ctx.fillRect(x, y, 64, 64);
      }
    }
    // 格子分隔线
    ctx.strokeStyle = "rgba(100, 140, 180, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y < 1024; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    // 冷白LED光斑漫射
    ctx.fillStyle = "rgba(200, 220, 255, 0.05)";
    for (let i = 0; i < 6; i += 1) {
      const cx = 170 + i * 140;
      const cy = 280 + Math.sin(i * 1.8) * 200;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 110, 70, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const gradient = ctx.createRadialGradient(512, 500, 90, 512, 500, 690);
    gradient.addColorStop(0, "#dbeafe");
    gradient.addColorStop(0.32, "#9db8c8");
    gradient.addColorStop(1, "#233447");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);

    ctx.fillStyle = "rgba(225, 238, 248, 0.24)";
    for (let y = 0; y < 1024; y += 96) {
      ctx.fillRect(0, y + 28, 1024, 18);
    }

    ctx.strokeStyle = "rgba(19, 41, 55, 0.34)";
    ctx.lineWidth = 7;
    for (let x = -120; x < 1120; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 320, 1024);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(22, 101, 52, 0.22)";
    ctx.lineWidth = 12;
    for (let i = 0; i < 14; i += 1) {
      const x = 70 + i * 74;
      ctx.beginPath();
      ctx.moveTo(x, 180 + Math.sin(i) * 50);
      ctx.bezierCurveTo(x + 34, 360, x - 64, 560, x + 20, 830);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;
  return texture;
}

export function makeWallTexture(kind) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 1024;
  canvasTexture.height = 512;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = kind === "gaming" ? "#121b2d" : kind === "library" ? "#ead7b5" : kind === "bloodmoon" ? "#17070b" : kind === "office" ? "#1c2836" : "#7f90a2";
  ctx.fillRect(0, 0, 1024, 512);

  if (kind === "gaming") {
    ctx.fillStyle = "#1f2a44";
    for (let x = 60; x < 960; x += 180) {
      ctx.fillRect(x, 72, 110, 170);
      ctx.fillStyle = "rgba(80, 200, 255, 0.16)";
      ctx.fillRect(x + 8, 84, 94, 68);
      ctx.fillStyle = "#1f2a44";
    }
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 318, 1024, 8);
  } else if (kind === "library") {
    ctx.fillStyle = "#b58a54";
    for (let x = 36; x < 980; x += 150) {
      ctx.fillRect(x, 60, 110, 300);
      for (let y = 88; y < 330; y += 54) {
        ctx.fillStyle = y % 108 === 0 ? "#7f5132" : "#315b69";
        ctx.fillRect(x + 12, y, 86, 24);
      }
      ctx.fillStyle = "#b58a54";
    }
    ctx.fillStyle = "rgba(120, 90, 58, 0.22)";
    ctx.fillRect(0, 382, 1024, 10);
  } else if (kind === "bloodmoon") {
    ctx.fillStyle = "#241018";
    ctx.fillRect(0, 340, 1024, 28);
    ctx.fillStyle = "rgba(248, 113, 113, 0.12)";
    for (let x = 0; x < 1024; x += 120) {
      ctx.fillRect(x, 120 + Math.sin(x) * 40, 80, 180);
    }
  } else if (kind === "office") {
    // 暗色办公室墙壁 — 深灰底 + 窗户高光 + 踢脚线
    ctx.fillStyle = "#28261f";
    ctx.fillRect(0, 0, 1024, 512);
    // 窗户轮廓（暖色微光）
    for (let x = 80; x < 960; x += 200) {
      ctx.fillStyle = "#332f28";
      ctx.fillRect(x, 80, 100, 180);
      ctx.fillStyle = "rgba(255, 220, 150, 0.08)";
      ctx.fillRect(x + 10, 96, 80, 148);
    }
    // 踢脚线
    ctx.fillStyle = "#1a1814";
    ctx.fillRect(0, 420, 1024, 92);
    // 水平线条分隔
    ctx.strokeStyle = "rgba(180, 160, 120, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 280);
    ctx.lineTo(1024, 280);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#273548";
    for (let x = 40; x < 960; x += 160) {
      ctx.fillRect(x, 90, 72, 160);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(x + 10, 106, 52, 56);
      ctx.fillStyle = "#273548";
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 5;
    for (let y = 58; y < 330; y += 76) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y + 16);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(18, 53, 47, 0.24)";
    for (let x = 0; x < 1024; x += 88) {
      ctx.fillRect(x, 372 + Math.sin(x) * 8, 42, 118);
    }
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
