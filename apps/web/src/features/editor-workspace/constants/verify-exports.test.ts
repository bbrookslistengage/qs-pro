import { describe, expect, it } from "vitest";

import {
  DROPDOWN_CLOSE_CHARS,
  type DropdownCloseChar,
  GHOST_TEXT_DEBOUNCE,
  IDENTITY_FIELD_PATTERNS,
  IMMEDIATE_TRIGGER_CHARS,
  type ImmediateTriggerChar,
  MAX_SUGGESTIONS,
  MIN_TRIGGER_CHARS,
  NO_TRIGGER_CHARS,
  type NoTriggerChar,
  SFMC_IDENTITY_FIELDS,
  type SfmcIdentityField,
} from "./index";

describe("BarrelExports_FromIndex_AllConstantsExported", () => {
  it("should export SFMC_IDENTITY_FIELDS", () => {
    expect(SFMC_IDENTITY_FIELDS).toBeDefined();
    expect(Array.isArray(SFMC_IDENTITY_FIELDS)).toBe(true);
  });

  it("should export IDENTITY_FIELD_PATTERNS", () => {
    expect(IDENTITY_FIELD_PATTERNS).toBeDefined();
    expect(Array.isArray(IDENTITY_FIELD_PATTERNS)).toBe(true);
  });

  it("should export IMMEDIATE_TRIGGER_CHARS", () => {
    expect(IMMEDIATE_TRIGGER_CHARS).toBeDefined();
    expect(Array.isArray(IMMEDIATE_TRIGGER_CHARS)).toBe(true);
  });

  it("should export MIN_TRIGGER_CHARS", () => {
    expect(MIN_TRIGGER_CHARS).toBeDefined();
    expect(typeof MIN_TRIGGER_CHARS).toBe("number");
  });

  it("should export MAX_SUGGESTIONS", () => {
    expect(MAX_SUGGESTIONS).toBeDefined();
    expect(typeof MAX_SUGGESTIONS).toBe("number");
  });

  it("should export GHOST_TEXT_DEBOUNCE", () => {
    expect(GHOST_TEXT_DEBOUNCE).toBeDefined();
    expect(typeof GHOST_TEXT_DEBOUNCE).toBe("object");
    expect(GHOST_TEXT_DEBOUNCE.structural).toBeDefined();
    expect(GHOST_TEXT_DEBOUNCE.dataDependant).toBeDefined();
  });

  it("should export DROPDOWN_CLOSE_CHARS", () => {
    expect(DROPDOWN_CLOSE_CHARS).toBeDefined();
    expect(Array.isArray(DROPDOWN_CLOSE_CHARS)).toBe(true);
  });

  it("should export NO_TRIGGER_CHARS", () => {
    expect(NO_TRIGGER_CHARS).toBeDefined();
    expect(Array.isArray(NO_TRIGGER_CHARS)).toBe(true);
  });

  it("should export types without runtime errors", () => {
    // Type assertions to verify types are exported
    const _immediateTrigger: ImmediateTriggerChar = ".";
    const _dropdownClose: DropdownCloseChar = ",";
    const _noTrigger: NoTriggerChar = " ";
    const _identityField: SfmcIdentityField = "ContactID";

    // Verify type assertions work
    expect(_immediateTrigger).toBe(".");
    expect(_dropdownClose).toBe(",");
    expect(_noTrigger).toBe(" ");
    expect(_identityField).toBe("ContactID");
  });
});
