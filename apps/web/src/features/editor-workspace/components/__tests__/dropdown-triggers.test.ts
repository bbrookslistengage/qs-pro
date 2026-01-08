import { describe, expect, test } from "vitest";
import {
  IMMEDIATE_TRIGGER_CHARS,
  MIN_TRIGGER_CHARS,
  NO_TRIGGER_CHARS,
} from "@/features/editor-workspace/constants/autocomplete-config";

/**
 * Dropdown Trigger Behavior Tests
 *
 * These tests verify that the autocomplete dropdown triggers correctly
 * based on context and character thresholds:
 * - Should NOT trigger on space, newline, comma, etc.
 * - Should trigger immediately after `.` and `[`
 * - Should require 2+ characters for general alphanumeric typing
 */

describe("Dropdown Trigger Behavior", () => {
  /**
   * Helper function to simulate trigger decision logic
   * This matches the logic that will be implemented in provideCompletionItems
   */
  const shouldTriggerDropdown = (
    triggerChar: string | undefined,
    currentWord: string,
  ): boolean => {
    // Check if trigger character should not trigger
    if (triggerChar && NO_TRIGGER_CHARS.includes(triggerChar as never)) {
      return false;
    }

    // For immediate trigger chars (. [ _), allow 1-char minimum
    const isImmediateContext =
      triggerChar && IMMEDIATE_TRIGGER_CHARS.includes(triggerChar as never);

    if (isImmediateContext) {
      return true;
    }

    // For general typing, require 2+ chars
    if (currentWord.length < MIN_TRIGGER_CHARS) {
      return false;
    }

    return true;
  };

  test("shouldNotTriggerDropdown_OnSpace_ReturnsFalse", () => {
    // Arrange
    const triggerChar = " ";
    const currentWord = "";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(false);
  });

  test("shouldNotTriggerDropdown_OnNewline_ReturnsFalse", () => {
    // Arrange
    const triggerChar = "\n";
    const currentWord = "";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(false);
  });

  test("shouldNotTriggerDropdown_OnComma_ReturnsFalse", () => {
    // Arrange
    const triggerChar = ",";
    const currentWord = "";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(false);
  });

  test("shouldTriggerDropdown_AfterDot_ReturnsTrue", () => {
    // Arrange
    const triggerChar = ".";
    const currentWord = "";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(true);
  });

  test("shouldTriggerDropdown_AfterOpenBracket_ReturnsTrue", () => {
    // Arrange
    const triggerChar = "[";
    const currentWord = "";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(true);
  });

  test("shouldTriggerDropdown_AfterUnderscore_ReturnsTrue", () => {
    // Arrange
    const triggerChar = "_";
    const currentWord = "_";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(true);
  });

  test("shouldNotTriggerDropdown_WithOneCharacter_ReturnsFalse", () => {
    // Arrange
    const triggerChar = undefined; // general typing
    const currentWord = "S";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(false);
  });

  test("shouldTriggerDropdown_WithTwoCharacters_ReturnsTrue", () => {
    // Arrange
    const triggerChar = undefined; // general typing
    const currentWord = "SE";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(true);
  });

  test("shouldTriggerDropdown_WithThreeCharacters_ReturnsTrue", () => {
    // Arrange
    const triggerChar = undefined; // general typing
    const currentWord = "SEL";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(true);
  });

  test("shouldTriggerDropdown_AfterDotWithText_ReturnsTrue", () => {
    // Arrange
    const triggerChar = ".";
    const currentWord = "Field";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(true);
  });

  test("shouldNotTriggerDropdown_OnSemicolon_ReturnsFalse", () => {
    // Arrange
    const triggerChar = ";";
    const currentWord = "";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(false);
  });

  test("shouldNotTriggerDropdown_OnClosingParen_ReturnsFalse", () => {
    // Arrange
    const triggerChar = ")";
    const currentWord = "";

    // Act
    const result = shouldTriggerDropdown(triggerChar, currentWord);

    // Assert
    expect(result).toBe(false);
  });
});
