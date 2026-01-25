import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type { DataExtensionField } from "@/features/editor-workspace/types";
import { useJoinSuggestions } from "@/features/editor-workspace/utils/join-suggestions";
import type { SqlTableReference } from "@/features/editor-workspace/utils/sql-context";

const makeTable = (name: string, alias?: string): SqlTableReference => ({
  name,
  qualifiedName: name,
  alias,
  startIndex: 0,
  endIndex: name.length,
  isBracketed: false,
  isSubquery: false,
  scopeDepth: 0,
  outputFields: [],
});

const makeFields = (names: string[]): DataExtensionField[] =>
  names.map((name) => ({
    name,
    type: "Text",
    isPrimaryKey: false,
    isNullable: true,
  }));

describe("join suggestions", () => {
  describe("override resolution", () => {
    test("useJoinSuggestions_WithExactTablePairOverride_ReturnsOverrideSuggestions", () => {
      // Arrange
      const left = makeTable("Left", "l");
      const right = makeTable("Right", "r");
      const { result } = renderHook(() =>
        useJoinSuggestions(
          new Map([["left|right", () => [{ text: "l.Id = r.Id" }]]]),
        ),
      );
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["Id"]),
        rightFields: makeFields(["Id"]),
      });

      // Assert
      expect(suggestions[0]?.text).toBe("l.Id = r.Id");
    });

    test("useJoinSuggestions_WithRightTableOverride_FallsBackToRightTable", () => {
      // Arrange
      const left = makeTable("Orders", "o");
      const right = makeTable("Customers", "c");
      const { result } = renderHook(() =>
        useJoinSuggestions(
          new Map([["customers", () => [{ text: "o.CustomerId = c.Id" }]]]),
        ),
      );
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["CustomerId"]),
        rightFields: makeFields(["Id"]),
      });

      // Assert
      expect(suggestions[0]?.text).toBe("o.CustomerId = c.Id");
    });

    test("useJoinSuggestions_WithLeftTableOverride_FallsBackToLeftTable", () => {
      // Arrange
      const left = makeTable("Customers", "c");
      const right = makeTable("Orders", "o");
      const { result } = renderHook(() =>
        useJoinSuggestions(
          new Map([["customers", () => [{ text: "c.Id = o.CustomerId" }]]]),
        ),
      );
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["Id"]),
        rightFields: makeFields(["CustomerId"]),
      });

      // Assert
      expect(suggestions[0]?.text).toBe("c.Id = o.CustomerId");
    });
  });

  describe("fuzzy field matching", () => {
    test("useJoinSuggestions_WithMatchingFields_ReturnsFuzzySuggestion", () => {
      // Arrange
      const left = makeTable("Left", "l");
      const right = makeTable("Right", "r");
      const { result } = renderHook(() => useJoinSuggestions());
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["SubscriberKey", "EmailAddress"]),
        rightFields: makeFields(["EmailAddress"]),
      });

      // Assert
      expect(
        suggestions.some((item) => item.text.includes("EmailAddress")),
      ).toBe(true);
    });

    test("useJoinSuggestions_WithNoMatchingFields_ReturnsEmptyArray", () => {
      // Arrange
      const left = makeTable("Orders", "o");
      const right = makeTable("Products", "p");
      const { result } = renderHook(() => useJoinSuggestions());
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["OrderId", "CustomerId"]),
        rightFields: makeFields(["ProductId", "Sku"]),
      });

      // Assert
      expect(suggestions).toHaveLength(0);
    });

    test("useJoinSuggestions_WithMultipleMatches_LimitsToThreeSuggestions", () => {
      // Arrange
      const left = makeTable("TableA", "a");
      const right = makeTable("TableB", "b");
      const { result } = renderHook(() => useJoinSuggestions());
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["Field1", "Field2", "Field3", "Field4"]),
        rightFields: makeFields(["Field1", "Field2", "Field3", "Field4"]),
      });

      // Assert
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    test("useJoinSuggestions_WithCaseVariations_MatchesNormalized", () => {
      // Arrange
      const left = makeTable("Orders", "o");
      const right = makeTable("Customers", "c");
      const { result } = renderHook(() => useJoinSuggestions());
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["customer_id"]),
        rightFields: makeFields(["CustomerID"]),
      });

      // Assert
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]?.text).toBe("o.customer_id = c.CustomerID");
    });
  });

  describe("alias and name usage", () => {
    test("useJoinSuggestions_WithNoAlias_UsesQualifiedName", () => {
      // Arrange
      const left = makeTable("Orders");
      const right = makeTable("Customers");
      const { result } = renderHook(() => useJoinSuggestions());
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["CustomerId"]),
        rightFields: makeFields(["CustomerId"]),
      });

      // Assert
      expect(suggestions[0]?.text).toBe(
        "Orders.CustomerId = Customers.CustomerId",
      );
    });

    test("useJoinSuggestions_WithMixedAliases_UsesAppropriateIdentifier", () => {
      // Arrange
      const left = makeTable("Orders", "o");
      const right = makeTable("Customers"); // No alias
      const { result } = renderHook(() => useJoinSuggestions());
      const getSuggestions = result.current;

      // Act
      const suggestions = getSuggestions({
        leftTable: left,
        rightTable: right,
        leftFields: makeFields(["CustomerId"]),
        rightFields: makeFields(["CustomerId"]),
      });

      // Assert
      expect(suggestions[0]?.text).toBe("o.CustomerId = Customers.CustomerId");
    });
  });
});
