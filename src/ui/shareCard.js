const CARD_W = 540;
const CARD_H = 960;
// 主人公贴图约占卡面 72% 高，符合分享卡“主人公 65%~75%”的版式要求。
const ART_H = Math.round(CARD_H * 0.72);

// 叠加层相对卡面比例（与历史详情 DOM/CSS 共用同一套相对坐标）。
export const SHARE_OVERLAY_LAYOUT = Object.freeze({
  padX: 0.044,
  padY: 0.032,
  brand: { w: 0.56, h: 0.056 },
  age: { w: 0.22, h: 0.056 },
  grade: { w: 0.17, h: 0.096 },
  scene: { w: 0.42, h: 0.05, gapX: 0.024 },
});

export const GRADE_THEMES = {
  S: { main: "#F4B942", soft: "#FBE3AC", tag: "S 级 · 这次居然像个专业人士" },
  A: { main: "#8F7AD8", soft: "#D8CFF3", tag: "A 级 · 有点狼狈，但能拿出去说" },
  B: { main: "#55BFA8", soft: "#C4E9E0", tag: "B 级 · 问题没解决，但你很会操作" },
  C: { main: "#F16C52", soft: "#F9CFC5", tag: "C 级 · 你没有赢，但事故记录很完整" },
};

const INK = "#25242A";
const PAPER = "#FFF6DF";
const SKIN = "#F5C9A6";

function px(ratio, total) {
  return Math.round(ratio * total);
}

export function buildShareModel({ level = {}, result = {}, progress = {} }) {
  const grade = result.rating?.grade ?? "C";
  const won = Boolean(result.won);
  return {
    grade,
    won,
    theme: GRADE_THEMES[grade] ?? GRADE_THEMES.C,
    age: level.age ?? null,
    sceneName: (level.axisLabel ?? level.sceneName ?? "").replace(/\n/g, ""),
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

  blockRect(ctx, -unit * 1.9, 0, unit * 3.8, unit * 1.1, INK, 4);
  blockRect(ctx, -unit * 1.7, unit * 0.9, unit * 3.4, unit * 2.6, SKIN, 5);
  ctx.fillStyle = INK;
  if (grade === "C") {
    ctx.font = `900 ${unit * 0.9}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("×  ×", 0, unit * 2.35);
  } else {
    ctx.fillRect(-unit * 0.95, unit * 1.9, unit * 0.42, unit * 0.62);
    ctx.fillRect(unit * 0.53, unit * 1.9, unit * 0.42, unit * 0.62);
  }
  blockRect(ctx, -bodyW / 2, unit * 3.7, bodyW, unit * 3.4, theme.main, 6);
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

function drawArtHero(ctx, image) {
  const artH = ART_H;
  const bleed = CARD_W * 0.055;
  const inset = CARD_W * 0.044;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CARD_W, artH);
  ctx.clip();
  if (typeof ctx.filter === "string") ctx.filter = "blur(26px)";
  drawCover(ctx, image, -bleed, -bleed, CARD_W + bleed * 2, artH + bleed * 2);
  if (typeof ctx.filter === "string") ctx.filter = "none";
  drawCover(ctx, image, inset, inset * 0.8, CARD_W - inset * 2, artH - inset * 1.6);
  ctx.restore();

  const bottomFade = ctx.createLinearGradient(0, artH - CARD_H * 0.21, 0, artH);
  bottomFade.addColorStop(0, "rgba(255, 246, 223, 0)");
  bottomFade.addColorStop(0.72, "rgba(255, 246, 223, 0.72)");
  bottomFade.addColorStop(1, PAPER);
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, artH - CARD_H * 0.21, CARD_W, CARD_H * 0.21);

  const topFade = ctx.createLinearGradient(0, 0, 0, CARD_H * 0.1);
  topFade.addColorStop(0, "rgba(255, 246, 223, 0.85)");
  topFade.addColorStop(1, "rgba(255, 246, 223, 0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, CARD_W, CARD_H * 0.1);

  const edge = CARD_W * 0.074;
  const leftFade = ctx.createLinearGradient(0, 0, edge, 0);
  leftFade.addColorStop(0, "rgba(255, 246, 223, 0.9)");
  leftFade.addColorStop(1, "rgba(255, 246, 223, 0)");
  ctx.fillStyle = leftFade;
  ctx.fillRect(0, 0, edge, artH);
  const rightFade = ctx.createLinearGradient(CARD_W, 0, CARD_W - edge, 0);
  rightFade.addColorStop(0, "rgba(255, 246, 223, 0.9)");
  rightFade.addColorStop(1, "rgba(255, 246, 223, 0)");
  ctx.fillStyle = rightFade;
  ctx.fillRect(CARD_W - edge, 0, edge, artH);
}

export function renderShareCard(canvas, { level, result, progress, art = null }) {
  const model = buildShareModel({ level, result, progress });
  const ctx = canvas.getContext("2d");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const { theme } = model;
  const titleY = art ? CARD_H * 0.73 : CARD_H * 0.79;
  const copyY = art ? CARD_H * 0.82 : CARD_H * 0.89;
  const layout = SHARE_OVERLAY_LAYOUT;
  const padX = px(layout.padX, CARD_W);
  const padY = px(layout.padY, CARD_H);
  const brandW = px(layout.brand.w, CARD_W);
  const brandH = px(layout.brand.h, CARD_H);
  const ageW = px(layout.age.w, CARD_W);
  const ageH = px(layout.age.h, CARD_H);
  const gradeW = px(layout.grade.w, CARD_W);
  const gradeH = px(layout.grade.h, CARD_H);
  const sceneGap = px(layout.scene.gapX, CARD_W);
  const sceneH = px(layout.scene.h, CARD_H);
  const midY = padY + brandH + px(0.022, CARD_H);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  if (art) {
    drawArtHero(ctx, art);
  } else {
    ctx.fillStyle = theme.soft;
    ctx.fillRect(0, CARD_H * 0.62, CARD_W, CARD_H * 0.38);
    ctx.fillStyle = theme.main;
    ctx.fillRect(0, CARD_H * 0.62 - 10, CARD_W, 10);
  }

  // 顶部标识（相对卡面百分比）
  blockRect(ctx, padX, padY, brandW, brandH, "#FFD447", 6);
  ctx.fillStyle = INK;
  ctx.font = `900 ${Math.round(CARD_H * 0.025)}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("梗哥的半生 · 人生坐标", padX + brandW * 0.06, padY + brandH / 2);

  if (model.age != null) {
    const ageX = CARD_W - padX - ageW;
    blockRect(ctx, ageX, padY, ageW, ageH, theme.main, 6);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.fillText(`${model.age} 岁`, ageX + ageW / 2, padY + ageH / 2);
  }

  if (!art) {
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(CARD_H * 0.156)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(model.grade, CARD_W / 2 + 8, CARD_H * 0.258 + 8);
    ctx.fillStyle = theme.main;
    ctx.fillText(model.grade, CARD_W / 2, CARD_H * 0.258);
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(CARD_H * 0.031)}px sans-serif`;
    ctx.fillText(model.theme.tag, CARD_W / 2, CARD_H * 0.312);
    drawHero(ctx, model, CARD_W / 2, CARD_H * 0.344, CARD_H * 0.42);
  } else {
    blockRect(ctx, padX, midY, gradeW, gradeH, theme.main, 6);
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(CARD_H * 0.058)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(model.grade, padX + gradeW / 2, midY + gradeH / 2);
    if (model.sceneName) {
      const sceneX = padX + gradeW + sceneGap;
      const sceneW = Math.min(
        px(layout.scene.w, CARD_W),
        Math.max(px(0.22, CARD_W), model.sceneName.length * Math.round(CARD_W * 0.028) + px(0.06, CARD_W)),
      );
      blockRect(ctx, sceneX, midY + (gradeH - sceneH) / 2, sceneW, sceneH, "#FFFFFF", 5);
      ctx.fillStyle = INK;
      ctx.font = `900 ${Math.round(CARD_H * 0.023)}px sans-serif`;
      ctx.fillText(model.sceneName, sceneX + sceneW / 2, midY + gradeH / 2);
    }
  }

  if (model.title) {
    const titleW = CARD_W * 0.63;
    const titleH = CARD_H * 0.06;
    blockRect(ctx, CARD_W / 2 - titleW / 2, titleY, titleW, titleH, "#FFD447", 6);
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(CARD_H * 0.029)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`「${model.title}」`, CARD_W / 2, titleY + titleH / 2);
  }

  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(CARD_H * 0.025)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const copy = model.copy.length > 35 ? `${model.copy.slice(0, 34)}…` : model.copy;
  ctx.fillText(copy, CARD_W / 2, copyY);

  const chipW = CARD_W * 0.278;
  const chipH = CARD_H * 0.054;
  const chipY = CARD_H * 0.92;
  const startX = CARD_W / 2 - (model.stats.length * chipW + (model.stats.length - 1) * CARD_W * 0.022) / 2;
  model.stats.forEach((stat, index) => {
    const x = startX + index * (chipW + CARD_W * 0.022);
    blockRect(ctx, x, chipY, chipW, chipH, "#FFFFFF", 5);
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(CARD_H * 0.019)}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(`${stat.label} ${stat.value}`, x + chipW / 2, chipY + chipH / 2);
  });
  return model;
}
