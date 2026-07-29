import { getBestScore } from "../utils/storage.js";

// 人生线报告：主线五关全部 A 级及以上才解锁的一次性总结卡数据。
export const LIFE_REPORT_TITLE = "妈妈，人生是旷野！";
const QUALIFIED_GRADES = new Set(["S", "A"]);

// 失败结算也会留记录（won:false），报告只认通关成绩。
function getClearedGrade(record) {
  return record && record.won !== false ? record.grade ?? null : null;
}

export function buildLifeReportModel({ levels, getBest = getBestScore }) {
  const rows = levels.map((level) => {
    const grade = getClearedGrade(getBest(level.id));
    return {
      id: level.id,
      ageLabel: level.age == null ? "番外" : `${level.age} 岁`,
      name: (level.axisLabel ?? level.sceneName ?? "").replace(/\n/g, ""),
      grade,
      nodeTitle: (grade ? level.nodes?.[grade]?.title : null) ?? "",
    };
  });
  const heroLevel = [...levels].reverse().find((level) => level.art?.grades);
  const heroGrade = heroLevel
    ? getClearedGrade(getBest(heroLevel.id)) ?? "C"
    : null;
  return {
    title: LIFE_REPORT_TITLE,
    rows,
    total: rows.length,
    clearedCount: rows.filter((row) => row.grade != null).length,
    // 全部关卡拿到 A 级及以上才算解锁报告。
    qualified: rows.length > 0
      && rows.every((row) => QUALIFIED_GRADES.has(row.grade)),
    heroArt: heroLevel?.art?.grades?.[heroGrade] ?? null,
  };
}
