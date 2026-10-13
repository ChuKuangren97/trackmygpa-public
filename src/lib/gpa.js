// ─── Grade/point tables ───────────────────────────────────────────────────────

const SCALE_5 = [
  { min: 70, max: 100, grade: 'A',  point: 5.0 },
  { min: 60, max: 69,  grade: 'B',  point: 4.0 },
  { min: 50, max: 59,  grade: 'C',  point: 3.0 },
  { min: 45, max: 49,  grade: 'D',  point: 2.0 },
  { min: 40, max: 44,  grade: 'E',  point: 1.0 },
  { min:  0, max: 39,  grade: 'F',  point: 0.0 },
];

const SCALE_4 = [
  { min: 90, max: 100, grade: 'A',  point: 4.0 },
  { min: 80, max: 89,  grade: 'A-', point: 3.7 },
  { min: 70, max: 79,  grade: 'B+', point: 3.3 },
  { min: 60, max: 69,  grade: 'B',  point: 3.0 },
  { min: 50, max: 59,  grade: 'C',  point: 2.0 },
  { min: 40, max: 49,  grade: 'D',  point: 1.0 },
  { min:  0, max: 39,  grade: 'F',  point: 0.0 },
];

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Returns { grade, point } for a numeric score on the chosen scale.
 * @param {number|string} score
 * @param {'5.0'|'4.0'} scale - defaults to '5.0'
 */
export function getGradeAndPoint(score, scale = '5.0') {
  const numScore = parseFloat(score);
  if (isNaN(numScore)) return { grade: 'N/A', point: 0.0 };

  const table = scale === '4.0' ? SCALE_4 : SCALE_5;
  const row = table.find(r => numScore >= r.min && numScore <= r.max);
  return row ? { grade: row.grade, point: row.point } : { grade: 'N/A', point: 0.0 };
}

/**
 * Calculates GPA from an array of course objects.
 * Each course must have { grade_point, credit_units }.
 * The `scale` param is not needed for the arithmetic but is accepted for
 * forward-compatibility if callers pass it.
 * @param {Array<{grade_point: number, credit_units: number}>} courses
 * @param {'5.0'|'4.0'} scale - currently unused in arithmetic, kept for API symmetry
 */
export function calculateGPA(courses, scale = '5.0') {
  if (!courses || courses.length === 0) return (0.0).toFixed(2);

  let totalPoints = 0;
  let totalUnits  = 0;

  courses.forEach(c => {
    const units = parseFloat(c.credit_units) || 0;
    const point = parseFloat(c.grade_point)  || 0;
    totalPoints += point * units;
    totalUnits  += units;
  });

  if (totalUnits === 0) return (0.0).toFixed(2);
  return (totalPoints / totalUnits).toFixed(2);
}
