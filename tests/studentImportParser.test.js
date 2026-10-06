const { calculateCurrentAcademicYear, calculateStudentYear } = require("../src/utils/studentImportParser");

describe("calculateCurrentAcademicYear", () => {
  test("returns the same BE year for a date in June or later", () => {
    const juneDate = new Date(2026, 5, 15); // month 5 = June (0-indexed)
    expect(calculateCurrentAcademicYear(juneDate)).toBe(2569); // 2026 + 543
  });

  test("returns the previous BE year for a date before June", () => {
    const marchDate = new Date(2026, 2, 1); // March
    expect(calculateCurrentAcademicYear(marchDate)).toBe(2568); // 2026 + 543 - 1
  });
});

describe("calculateStudentYear", () => {
  test("derives admission year from student code when admissionYear is missing", () => {
    // studentCode "67023097" -> prefix "67" -> admission year 2567 BE
    const year = calculateStudentYear(null, "67023097", 2568);
    expect(year).toBe(2); // 2568 - 2567 + 1
  });

  test("clamps the result to a max of 5", () => {
    const year = calculateStudentYear(2560, "60012345", 2570);
    expect(year).toBe(5); // would be 11 uncapped, clamped down
  });

  test("defaults to year 1 when no admission data can be determined", () => {
    const year = calculateStudentYear(null, "", 2568);
    expect(year).toBe(1);
  });
});