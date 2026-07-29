import { buildLifeReportModel } from "./lifeReportModel.js";

const SEEN_KEY = "gengge-life-report-seen";

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowHtml(row) {
  const gradeClass = row.grade
    ? `life-report-grade grade-${row.grade.toLowerCase()}`
    : "life-report-grade grade-none";
  const nodeTitle = row.nodeTitle
    ? `<span class="life-report-node">「${escapeHtml(row.nodeTitle)}」</span>`
    : "";
  return `<div class="life-report-row">
    <span class="life-report-age">${escapeHtml(row.ageLabel)}</span>
    <span class="life-report-name">${escapeHtml(row.name)}</span>
    ${nodeTitle}
    <span class="${gradeClass}">${escapeHtml(row.grade ?? "—")}</span>
  </div>`;
}

// 人生线报告控制器：五关全 A 及以上时弹一次，与番外解锁、历史节点互相独立。
export function createLifeReportController({ ui, levels, storage, getBest }) {
  function buildModel() {
    return buildLifeReportModel(getBest ? { levels, getBest } : { levels });
  }

  function isQualified() {
    return buildModel().qualified;
  }

  function hasSeen() {
    try {
      return storage.getItem(SEEN_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markSeen() {
    try {
      storage.setItem(SEEN_KEY, "1");
    } catch {
      // 无存储权限时本次会话内仍视为已读。
    }
  }

  function render() {
    const model = buildModel();
    if (ui.lifeReportProgress) {
      ui.lifeReportProgress.textContent = `${model.clearedCount}/${model.total}`;
    }
    if (ui.lifeReportArt) {
      ui.lifeReportArt.style.backgroundImage = model.heroArt
        ? `url("${model.heroArt}")`
        : "";
      ui.lifeReportArt.classList.toggle("is-empty", !model.heroArt);
    }
    if (ui.lifeReportRows) {
      ui.lifeReportRows.innerHTML = model.rows.map(rowHtml).join("");
    }
  }

  // 入口重看：不检查已读标记，直接展示报告。
  function show() {
    if (!ui.lifeReportModal) return false;
    render();
    ui.lifeReportModal.classList.add("visible");
    return true;
  }

  function maybeShow() {
    if (hasSeen() || !ui.lifeReportModal) return false;
    const model = buildModel();
    // 只有五关全部 A 级及以上才展示报告。
    if (!model.qualified) return false;
    return show();
  }

  function hide() {
    ui.lifeReportModal?.classList.remove("visible");
  }

  function bind({ onConfirm } = {}) {
    ui.lifeReportConfirmButton?.addEventListener("click", () => {
      markSeen();
      hide();
      onConfirm?.();
    });
  }

  return Object.freeze({ hasSeen, isQualified, maybeShow, show, hide, bind });
}
