export function calcRating(won, timeUsed, attemptsLeft) {
  if (!won) return { grade: "C", rating: 4 };
  if (timeUsed <= 30 && attemptsLeft >= 3) return { grade: "S", rating: 1 };
  if (timeUsed <= 50 && attemptsLeft >= 2) return { grade: "A", rating: 2 };
  if (timeUsed <= 70) return { grade: "B", rating: 3 };
  return { grade: "C", rating: 4 };
}
