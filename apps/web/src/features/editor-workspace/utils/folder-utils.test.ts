import { describe, expect, it } from "vitest";

import { assertDefined } from "@/test-utils";

import type { Folder } from "../types";
import { getFolderAncestors, getFolderPath } from "./folder-utils";

describe("folder-utils", () => {
  const mockFolders: Folder[] = [
    { id: "1", name: "Root", parentId: null, type: "data-extension" },
    { id: "2", name: "Sub 1", parentId: "1", type: "data-extension" },
    { id: "3", name: "Sub 2", parentId: "2", type: "data-extension" },
    { id: "4", name: "Another Root", parentId: null, type: "data-extension" },
  ];

  describe("getFolderAncestors", () => {
    it("getFolderAncestors_WithNullId_ReturnsEmptyArray", () => {
      expect(getFolderAncestors(mockFolders, null)).toEqual([]);
    });

    it("getFolderAncestors_WithRootId_ReturnsSingleFolder", () => {
      const result = getFolderAncestors(mockFolders, "1");
      expect(result).toHaveLength(1);
      const folder = result[0];
      assertDefined(folder);
      expect(folder.id).toBe("1");
    });

    it("getFolderAncestors_WithDeepId_ReturnsFullChain", () => {
      const result = getFolderAncestors(mockFolders, "3");
      expect(result).toHaveLength(3);
      const folder0 = result[0];
      const folder1 = result[1];
      const folder2 = result[2];
      assertDefined(folder0);
      assertDefined(folder1);
      assertDefined(folder2);
      expect(folder0.id).toBe("1");
      expect(folder1.id).toBe("2");
      expect(folder2.id).toBe("3");
    });

    it("getFolderAncestors_WithMissingParent_ReturnsPartialChain", () => {
      const brokenFolders: Folder[] = [
        { id: "3", name: "Sub 2", parentId: "99", type: "data-extension" },
      ];
      const result = getFolderAncestors(brokenFolders, "3");
      expect(result).toHaveLength(1);
      const folder = result[0];
      assertDefined(folder);
      expect(folder.id).toBe("3");
    });

    it("getFolderAncestors_WithMissingSelf_ReturnsEmptyArray", () => {
      expect(getFolderAncestors(mockFolders, "99")).toEqual([]);
    });
  });

  describe("getFolderPath", () => {
    it("getFolderPath_WithNullId_ReturnsEmptyString", () => {
      expect(getFolderPath(mockFolders, null)).toBe("");
    });

    it("getFolderPath_WithDeepId_ReturnsJoinedNames", () => {
      expect(getFolderPath(mockFolders, "3")).toBe("Root > Sub 1 > Sub 2");
    });

    it("getFolderPath_WithRootId_ReturnsName", () => {
      expect(getFolderPath(mockFolders, "1")).toBe("Root");
    });
  });
});
