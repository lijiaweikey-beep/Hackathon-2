const CARD_W = 540;
const CARD_H = 960;
// 主人公贴图约占卡面 72% 高，符合分享卡“主人公 65%~75%”的版式要求。
const ART_H = Math.round(CARD_H * 0.72);

const GRADE_THEMES = {
  S: { main: "#F4B942", soft: "#FBE3AC", tag: "S 级 · 这次居然像个专业人士" },
  A: { main: "#8F7AD8", soft: "#D8CFF3", tag: "A 级 · 有点狼狈，但能拿出去说" },
  B: { main: "#55BFA8", soft: "#C4E9E0", tag: "B 级 · 问题没解决，但你很会操作" },
  C: { main: "#F16C52", soft: "#F9CFC5", tag: "C 级 · 你没有赢，但事故记录很完整" },
};

const INK = "#25242A";
const PAPER = "#FFF6DF";
const SKIN = "#F5C9A6";

export function buildShareModel({ level = {}, result = {}, progress = {} }) {
  const grade = result.rating?.grade ?? "C";
  const won = Boolean(result.won);
  return {
    grade,
    won,
    theme: GRADE_THEMES[grade] ?? GRADE_THEMES.C,
    age: level.age ?? null,
    sceneName: level.axisLabel ?? level.sceneName ?? "",
    title: level.nodes?.[grade]?.title ?? "",
    copy: (level.nodes?.[grade]?.verdict
      ?? (won
        ? level.verdict?.success ?? level.success
        : level.verdict?.failure ?? level.failure)) ?? "",
    stats: [
      result.timeUsed != null ? { label: "用时", value: `${result.timeUsed} 秒` } : null,
      progress.unlocked != null
        ? { label: "人生节点", value: `${progress.unlocked}/${progress.total}` }
        : null,
      { label: "评级", value: grade },
    ].filter(Boolean).slice(0, 3),
    completion: progress.total ? progress.unlocked / progress.total : 0,
  };
}

function blockRect(ctx, x, y, w, h, fill, shadow = 6) {
  ctx.fillStyle = INK;
  ctx.fillRect(x + shadow, y + shadow, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}

function drawHero(ctx, model, centerX, topY, height) {
  const { theme, grade } = model;
  const unit = height / 10;
  const bodyW = unit * 4.6;
  ctx.save();
  ctx.translate(centerX, topY);
  if (grade === "C") ctx.rotate(-0.09);

  // 头发与头
  blockRect(ctx, -unit * 1.9, 0, unit * 3.8, unit * 1.1, INK, 4);
  blockRect(ctx, -unit * 1.7, unit * 0.9, unit * 3.4, unit * 2.6, SKIN, 5);
  // 眼睛：C 级画成 ><
  ctx.fillStyle = INK;
  if (grade === "C") {
    ctx.font = `900 ${unit * 0.9}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("×  ×", 0, unit * 2.35);
  } else {
    ctx.fillRect(-unit * 0.95, unit * 1.9, unit * 0.42, unit * 0.62);
    ctx.fillRect(unit * 0.53, unit * 1.9, unit * 0.42, unit * 0.62);
  }
  // 身体
  blockRect(ctx, -bodyW / 2, unit * 3.7, bodyW, unit * 3.4, theme.main, 6);
  // 手臂姿势：S 双手举起 / A 单手举起 / B 垂下 / C 摊开
  const armW = unit * 0.95;
  const armH = unit * 2.6;
  if (grade === "S") {
    blockRect(ctx, -bodyW / 2 - armW - 4, unit * 1.6, armW, armH, SKIN, 4);
    blockRect(ctx, bodyW / 2 + 4, unit * 1.6, armW, armH, SKIN, 4);
  } else if (grade === "A") {
    blockRect(ctx, -bodyW / 2 - armW - 4, unit * 1.6, armW, armH, SKIN, 4);
    blockRect(ctx, bodyW / 2 + 4, unit * 4.0, armW, armH, SKIN, 4);
  } else if (grade === "C") {
    blockRect(ctx, -bodyW / 2 - armW * 1.8, unit * 4.6, armW * 1.8, armW, SKIN, 4);
    blockRect(ctx, bodyW / 2, unit * 4.6, armW * 1.8, armW, SKIN, 4);
  } else {
    blockRect(ctx, -bodyW / 2 - armW - 4, unit * 4.0, armW, armH, SKIN, 4);
    blockRect(ctx, bodyW / 2 + 4, unit * 4.0, armW, armH, SKIN, 4);
  }
  // 腿
  blockRect(ctx, -bodyW / 2 + unit * 0.3, unit * 7.1, unit * 1.5, unit * 2.4, "#3A3E52", 5);
  blockRect(ctx, bodyW / 2 - unit * 1.8, unit * 7.1, unit * 1.5, unit * 2.4, "#3A3E52", 5);
  ctx.restore();
}

function drawCover(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// 等级插画占卡面上部：先铺一层放大的毛玻璃底层，再把清晰贴图内缩一圈压上去，
// 四边再用米白渐变蒙版收边，避开硬邦邦的图片轮廓。
function drawArtHero(ctx, image) {
  const artH = ART_H;
  const bleed = 30;
  const inset = 24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CARD_W, artH);
  ctx.clip();
  if (typeof ctx.filter === "string") ctx.filter = "blur(26px)";
  drawCover(ctx, image, -bleed, -bleed, CARD_W + bleed * 2, artH + bleed * 2);
  if (typeof ctx.filter === "string") ctx.filter = "none";
  drawCover(ctx, image, inset, inset * 0.8, CARD_W - inset * 2, artH - inset * 1.6);
  ctx.restore();

  const bottomFade = ctx.createLinearGradient(0, artH - 200, 0, artH);
  bottomFade.addColorStop(0, "rgba(255, 246, 223, 0)");
  bottomFade.addColorStop(0.72, "rgba(255, 246, 223, 0.72)");
  bottomFade.addColorStop(1, PAPER);
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, artH - 200, CARD_W, 200);

  const topFade = ctx.createLinearGradient(0, 0, 0, 96);
  topFade.addColorStop(0, "rgba(255, 246, 223, 0.85)");
  topFade.addColorStop(1, "rgba(255, 246, 223, 0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, CARD_W, 96);

  const leftFade = ctx.createLinearGradient(0, 0, 40, 0);
  leftFade.addColorStop(0, "rgba(255, 246, 223, 0.9)");
  leftFade.addColorStop(1, "rgba(255, 246, 223, 0)");
  ctx.fillStyle = leftFade;
  ctx.fillRect(0, 0, 40, artH);
  const rightFade = ctx.createLinearGradient(CARD_W, 0, CARD_W - 40, 0);
  rightFade.addColorStop(0, "rgba(255, 246, 223, 0.9)");
  rightFade.addColorStop(1, "rgba(255, 246, 223, 0)");
  ctx.fillStyle = rightFade;
  ctx.fillRect(CARD_W - 40, 0, 40, artH);
}

export function renderShareCard(canvas, { level, result, progress, art = null }) {
  const model = buildShareModel({ level, result, progress });
  const ctx = canvas.getContext("2d");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const { theme } = model;
  const titleY = art ? 700 : 760;
  const copyY = art ? 790 : 856;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  if (art) {
    drawArtHero(ctx, art);
  } else {
    // 无贴图时回落等级色块地面
    ctx.fillStyle = theme.soft;
    ctx.fillRect(0, CARD_H * 0.62, CARD_W, CARD_H * 0.38);
    ctx.fillStyle = theme.main;
    ctx.fillRect(0, CARD_H * 0.62 - 10, CARD_W, 10);
  }

  // 顶部标识
  blockRect(ctx, 30, 28, 300, 54, "#FFD447", 6);
  ctx.fillStyle = INK;
  ctx.font = "900 24px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("梗哥的半生 · 人生坐标", 48, 63);

  // 年龄章
  if (model.age != null) {
    blockRect(ctx, CARD_W - 150, 28, 120, 54, theme.main, 6);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.fillText(`${model.age} 岁`, CARD_W - 90, 63);
  }

  // 大等级字
  if (!art) {
    ctx.fillStyle = INK;
    ctx.font = "900 150px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(model.grade, CARD_W / 2 + 8, 248 + 8);
    ctx.fillStyle = theme.main;
    ctx.fillText(model.grade, CARD_W / 2, 248);
    ctx.fillStyle = INK;
    ctx.font = "900 30px sans-serif";
    ctx.fillText(model.theme.tag, CARD_W / 2, 300);

    // 主人公（约占卡面 45% 高度，落在色块地面上）
    drawHero(ctx, model, CARD_W / 2, 330, CARD_H * 0.42);
  } else {
    // 贴图模式：等级收成左上角小徽章，旁边接关卡名
    blockRect(ctx, 30, 100, 92, 92, theme.main, 6);
    ctx.fillStyle = INK;
    ctx.font = "900 56px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(model.grade, 76, 164);
    if (model.sceneName) {
      const chipW = Math.min(320, model.sceneName.length * 24 + 40);
      blockRect(ctx, 134, 122, chipW, 48, "#FFFFFF", 5);
      ctx.fillStyle = INK;
      ctx.font = "900 22px sans-serif";
      ctx.fillText(model.sceneName, 134 + chipW / 2, 153);
    }
  }

  // 称号
  if (model.title) {
    blockRect(ctx, CARD_W / 2 - 170, titleY, 340, 58, "#FFD447", 6);
    ctx.fillStyle = INK;
    ctx.font = "900 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`「${model.title}」`, CARD_W / 2, titleY + 40);
  }

  // 玩梗文案（≤35 字，单行截断）
  ctx.fillStyle = INK;
  ctx.font = "700 24px sans-serif";
  ctx.textAlign = "center";
  const copy = model.copy.length > 35 ? `${model.copy.slice(0, 34)}…` : model.copy;
  ctx.fillText(copy, CARD_W / 2, copyY);

  // 数据条（最多 3 项）
  const chipW = 150;
  const startX = CARD_W / 2 - (model.stats.length * chipW + (model.stats.length - 1) * 12) / 2;
  model.stats.forEach((stat, index) => {
    const x = startX + index * (chipW + 12);
    blockRect(ctx, x, 884, chipW, 52, "#FFFFFF", 5);
    ctx.fillStyle = INK;
    ctx.font = "700 18px sans-serif";
    ctx.fillText(`${stat.label} ${stat.value}`, x + chipW / 2, 918);
  });
  return model;
}
