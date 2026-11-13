import { describe, test } from "node:test";
import assert from "node:assert/strict";
import * as xlsx from "xlsx";
import {
  calculateCurrentAcademicYear,
  calculateStudentYear,
  parseCheckInSpreadsheet,
} from "../src/utils/studentImportParser";
import { normalizeMajor } from "../src/utils/majors";

describe("calculateCurrentAcademicYear", () => {
  test("returns the same BE year for a date in June or later", () => {
    const juneDate = new Date(2026, 5, 15); // month 5 = June (0-indexed)
    assert.equal(calculateCurrentAcademicYear(juneDate), 2569); // 2026 + 543
  });

  test("returns the previous BE year for a date before June", () => {
    const marchDate = new Date(2026, 2, 1); // March
    assert.equal(calculateCurrentAcademicYear(marchDate), 2568); // 2026 + 543 - 1
  });
});

describe("calculateStudentYear", () => {
  test("derives admission year from student code when admissionYear is missing", () => {
    // studentCode "67023097" -> prefix "67" -> admission year 2567 BE
    const year = calculateStudentYear(null, "67023097", 2568);
    assert.equal(year, 2); // 2568 - 2567 + 1
  });

  test("clamps the result to a max of 5", () => {
    const year = calculateStudentYear(2560, "60012345", 2570);
    assert.equal(year, 5); // would be 11 uncapped, clamped down
  });

  test("defaults to year 1 when no admission data can be determined", () => {
    const year = calculateStudentYear(null, "", 2568);
    assert.equal(year, 1);
  });
});

describe("parseCheckInSpreadsheet", () => {
  test("extracts student codes from Excel with headers and deduplicates", () => {
    const rows = [
      ["ลำดับ", "รหัสนิสิต", "ชื่อ - นามสกุล", "สาขาวิชา"],
      [1, "66023110", "นายสมชาย ใจดี", "วิศวกรรมซอฟต์แวร์"],
      [2, "66023111", "นางสาวสมหญิง รักเรียน", "วิทยาการคอมพิวเตอร์"],
      [3, "66023110", "นายสมชาย ใจดี (ซ้ำ)", "วิศวกรรมซอฟต์แวร์"],
    ];
    const ws = xlsx.utils.aoa_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "CheckIn");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const extracted = parseCheckInSpreadsheet(buf);
    assert.equal(extracted.length, 2);
    assert.equal(extracted[0].studentCode, "66023110");
    assert.equal(extracted[0].hintName, "นายสมชาย ใจดี");
    assert.equal(extracted[1].studentCode, "66023111");
  });

  test("extracts student codes from headerless sheet and detects typo codes in student code column", () => {
    const rows = [
      ["67023101", "นาย ก ข"],
      ["67023102", "นางสาว ค ง"],
    ];
    const ws = xlsx.utils.aoa_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "csv" });

    const extracted = parseCheckInSpreadsheet(buf);
    assert.equal(extracted.length, 2);
    assert.equal(extracted[0].studentCode, "67023101");
    assert.equal(extracted[1].studentCode, "67023102");
  });
});


describe("normalizeMajor", () => {
  test("strips numeric prefix from imported major names", () => {
    assert.equal(normalizeMajor("221 วิศวกรรมซอฟต์แวร์"), "วิศวกรรมซอฟต์แวร์");
  });

  test("maps prefixed, short and English names to the canonical major", () => {
    assert.equal(normalizeMajor("สาขาวิชาภูมิสารสนเทศ"), "ภูมิสารสนเทศศาสตร์");
    assert.equal(normalizeMajor("CGM"), "คอมพิวเตอร์กราฟิกและมัลติมีเดีย");
    assert.equal(normalizeMajor("Computer Engineering"), "วิศวกรรมคอมพิวเตอร์");
  });

  test("keeps unknown majors but removes prefixes", () => {
    assert.equal(normalizeMajor("123 สาขาอื่นๆ"), "อื่นๆ");
  });
});
