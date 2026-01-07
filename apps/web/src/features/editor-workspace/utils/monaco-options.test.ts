import { describe, expect, test } from "vitest";
import { getEditorOptions } from "@/features/editor-workspace/utils/monaco-options";

describe("monaco options", () => {
  test("getEditorOptions_Defaults_DisablesMinimap", () => {
    // Arrange

    // Act
    const options = getEditorOptions();

    // Assert
    expect(options.minimap?.enabled).toBe(false);
  });

  test("getEditorOptions_Defaults_SetsRulerAt100", () => {
    // Arrange

    // Act
    const options = getEditorOptions();

    // Assert
    expect(options.rulers).toEqual(expect.arrayContaining([100]));
  });

  test("getEditorOptions_Defaults_EnablesAutoClosingPairs", () => {
    // Arrange

    // Act
    const options = getEditorOptions();

    // Assert
    expect(options.autoClosingBrackets).toBe("always");
    expect(options.autoClosingQuotes).toBe("always");
  });
});
