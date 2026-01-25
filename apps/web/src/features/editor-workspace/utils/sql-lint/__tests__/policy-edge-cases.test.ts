/**
 * Tests for policy edge cases.
 *
 * Validates behavior around:
 * - Severity interactions (error among warnings blocks execution)
 * - Mixed diagnostic scenarios
 * - Edge cases in diagnostic prioritization
 */

import { describe, expect, test } from "vitest";

import type { SqlDiagnostic } from "../types";
import {
  getFirstBlockingDiagnostic,
  hasBlockingDiagnostics,
  isBlockingDiagnostic,
} from "../types";

describe("Policy Edge Cases", () => {
  describe("Single Error Among Many Warnings", () => {
    test("single_error_blocks_among_multiple_warnings", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "Consider using explicit column names",
          severity: "warning",
          startIndex: 7,
          endIndex: 8,
        },
        {
          message: "Consider adding table alias",
          severity: "warning",
          startIndex: 16,
          endIndex: 24,
        },
        {
          message: "CTE is not supported in MCE",
          severity: "error",
          startIndex: 0,
          endIndex: 4,
        },
        {
          message: "Consider using NOLOCK hint",
          severity: "warning",
          startIndex: 30,
          endIndex: 40,
        },
      ];

      expect(hasBlockingDiagnostics(diagnostics)).toBe(true);
      const blocking = getFirstBlockingDiagnostic(diagnostics);
      expect(blocking?.severity).toBe("error");
      expect(blocking?.message).toContain("CTE");
    });

    test("error_at_start_of_list_is_found", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "INSERT is not allowed",
          severity: "error",
          startIndex: 0,
          endIndex: 6,
        },
        {
          message: "Warning 1",
          severity: "warning",
          startIndex: 10,
          endIndex: 20,
        },
        {
          message: "Warning 2",
          severity: "warning",
          startIndex: 25,
          endIndex: 35,
        },
      ];

      const blocking = getFirstBlockingDiagnostic(diagnostics);
      expect(blocking?.message).toBe("INSERT is not allowed");
    });

    test("error_at_end_of_list_is_found", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "Warning 1",
          severity: "warning",
          startIndex: 0,
          endIndex: 10,
        },
        {
          message: "Warning 2",
          severity: "warning",
          startIndex: 15,
          endIndex: 25,
        },
        {
          message: "UPDATE is not allowed",
          severity: "error",
          startIndex: 30,
          endIndex: 36,
        },
      ];

      const blocking = getFirstBlockingDiagnostic(diagnostics);
      expect(blocking?.message).toBe("UPDATE is not allowed");
    });
  });

  describe("Prereq Among Mixed Severities", () => {
    test("prereq_blocks_when_no_errors_present", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "Warning about SELECT *",
          severity: "warning",
          startIndex: 0,
          endIndex: 8,
        },
        {
          message: "Missing FROM clause",
          severity: "prereq",
          startIndex: 9,
          endIndex: 9,
        },
        {
          message: "Another warning",
          severity: "warning",
          startIndex: 20,
          endIndex: 30,
        },
      ];

      expect(hasBlockingDiagnostics(diagnostics)).toBe(true);
      const blocking = getFirstBlockingDiagnostic(diagnostics);
      expect(blocking?.severity).toBe("prereq");
    });

    test("error_takes_priority_over_prereq", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "Missing FROM clause",
          severity: "prereq",
          startIndex: 0,
          endIndex: 0,
        },
        {
          message: "DELETE is not allowed",
          severity: "error",
          startIndex: 10,
          endIndex: 16,
        },
      ];

      const blocking = getFirstBlockingDiagnostic(diagnostics);
      expect(blocking?.severity).toBe("error");
      expect(blocking?.message).toContain("DELETE");
    });
  });

  describe("All Warnings Scenario", () => {
    test("multiple_warnings_do_not_block", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "Warning 1",
          severity: "warning",
          startIndex: 0,
          endIndex: 10,
        },
        {
          message: "Warning 2",
          severity: "warning",
          startIndex: 15,
          endIndex: 25,
        },
        {
          message: "Warning 3",
          severity: "warning",
          startIndex: 30,
          endIndex: 40,
        },
        {
          message: "Warning 4",
          severity: "warning",
          startIndex: 45,
          endIndex: 55,
        },
        {
          message: "Warning 5",
          severity: "warning",
          startIndex: 60,
          endIndex: 70,
        },
      ];

      expect(hasBlockingDiagnostics(diagnostics)).toBe(false);
      expect(getFirstBlockingDiagnostic(diagnostics)).toBeNull();
    });

    test("isBlockingDiagnostic_returns_false_for_all_warnings", () => {
      const warnings: SqlDiagnostic[] = [
        {
          message: "Warning",
          severity: "warning",
          startIndex: 0,
          endIndex: 10,
        },
      ];

      for (const warning of warnings) {
        expect(isBlockingDiagnostic(warning)).toBe(false);
      }
    });
  });

  describe("Multiple Blocking Diagnostics", () => {
    test("first_error_is_returned_when_multiple_errors", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "First error - INSERT",
          severity: "error",
          startIndex: 0,
          endIndex: 6,
        },
        {
          message: "Second error - UPDATE",
          severity: "error",
          startIndex: 50,
          endIndex: 56,
        },
        {
          message: "Third error - DELETE",
          severity: "error",
          startIndex: 100,
          endIndex: 106,
        },
      ];

      const blocking = getFirstBlockingDiagnostic(diagnostics);
      expect(blocking?.message).toBe("First error - INSERT");
    });

    test("first_prereq_is_returned_when_multiple_prereqs", () => {
      const diagnostics: SqlDiagnostic[] = [
        {
          message: "Missing SELECT",
          severity: "prereq",
          startIndex: 0,
          endIndex: 0,
        },
        {
          message: "Missing FROM",
          severity: "prereq",
          startIndex: 10,
          endIndex: 10,
        },
      ];

      const blocking = getFirstBlockingDiagnostic(diagnostics);
      expect(blocking?.message).toBe("Missing SELECT");
    });
  });

  describe("Empty Diagnostics", () => {
    test("empty_array_does_not_block", () => {
      expect(hasBlockingDiagnostics([])).toBe(false);
      expect(getFirstBlockingDiagnostic([])).toBeNull();
    });
  });

  describe("Severity Exhaustiveness", () => {
    test("all_severity_types_are_handled", () => {
      const errorDiag: SqlDiagnostic = {
        message: "Error",
        severity: "error",
        startIndex: 0,
        endIndex: 5,
      };
      const warningDiag: SqlDiagnostic = {
        message: "Warning",
        severity: "warning",
        startIndex: 0,
        endIndex: 5,
      };
      const prereqDiag: SqlDiagnostic = {
        message: "Prereq",
        severity: "prereq",
        startIndex: 0,
        endIndex: 5,
      };

      expect(isBlockingDiagnostic(errorDiag)).toBe(true);
      expect(isBlockingDiagnostic(warningDiag)).toBe(false);
      expect(isBlockingDiagnostic(prereqDiag)).toBe(true);
    });
  });
});
