import { describe, expect, test } from "vitest";
import type { DataExtension, Folder } from "@/features/editor-workspace/types";
import {
  buildDataExtensionSuggestions,
  fuzzyMatch,
} from "@/features/editor-workspace/utils/sql-autocomplete";
import {
  getSharedFolderIds,
  getSqlCursorContext,
} from "@/features/editor-workspace/utils/sql-context";

describe("sql autocomplete helpers", () => {
  test("fuzzyMatch_WithPartialTerm_ReturnsTrueWhenOrdered", () => {
    // Arrange
    const term = "seg";
    const candidate = "SubscriberSegment";

    // Act
    const matches = fuzzyMatch(term, candidate);

    // Assert
    expect(matches).toBe(true);
  });

  test("buildDataExtensionSuggestions_WithSharedFolderIds_PrefixesEnt", () => {
    // Arrange
    const dataExtensions: DataExtension[] = [
      {
        id: "de-1",
        name: "Alpha",
        customerKey: "Alpha",
        folderId: "shared-1",
        description: "",
        fields: [],
      },
    ];
    const folders: Folder[] = [
      {
        id: "shared-1",
        name: "Shared",
        parentId: null,
        type: "data-extension",
      },
    ];
    const sharedFolderIds = getSharedFolderIds(folders);

    // Act
    const suggestions = buildDataExtensionSuggestions(
      dataExtensions,
      sharedFolderIds,
      "",
    );

    // Assert
    expect(suggestions[0]?.insertText).toBe("ENT.[Alpha]");
  });

  test("buildDataExtensionSuggestions_WithEmptySearch_SortsAlphabetically", () => {
    // Arrange
    const dataExtensions: DataExtension[] = [
      {
        id: "de-2",
        name: "Zulu",
        customerKey: "Zulu",
        folderId: "local",
        description: "",
        fields: [],
      },
      {
        id: "de-1",
        name: "Alpha",
        customerKey: "Alpha",
        folderId: "local",
        description: "",
        fields: [],
      },
    ];

    // Act
    const suggestions = buildDataExtensionSuggestions(
      dataExtensions,
      new Set(),
      "",
    );

    // Assert
    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      "[Alpha]",
      "[Zulu]",
    ]);
  });

  test("getSqlCursorContext_WhenAliasBeforeDot_ReturnsAlias", () => {
    // Arrange
    const sql = "select a. from Example as a";
    const cursorIndex = sql.indexOf(".") + 1;

    // Act
    const context = getSqlCursorContext(sql, cursorIndex);

    // Assert
    expect(context.aliasBeforeDot).toBe("a");
  });

  test("getSqlCursorContext_WithCompletedFromTable_SetsHasTableReference", () => {
    // Arrange
    const sql = "select * from [My Data] ";
    const cursorIndex = sql.length;

    // Act
    const context = getSqlCursorContext(sql, cursorIndex);

    // Assert
    expect(context.hasTableReference).toBe(true);
    expect(context.cursorInTableReference).toBe(false);
  });
});
