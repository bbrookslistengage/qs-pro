import { describe, expect, test } from "vitest";

import { generateSmartAlias } from "./alias-generator";

describe("generateSmartAlias", () => {
  test("extractsInitials_FromCamelCase", () => {
    expect(generateSmartAlias("OrderDetails", new Set())).toBe("od");
  });

  test("extractsInitials_FromPascalCase", () => {
    expect(generateSmartAlias("SubscriberAttributes", new Set())).toBe("sa");
  });

  test("usesFirstChar_FromSingleWord", () => {
    expect(generateSmartAlias("Customers", new Set())).toBe("c");
  });

  test("usesAbbreviated_WhenInitialsCollide", () => {
    expect(generateSmartAlias("Orders", new Set(["o"]))).toBe("orde");
  });

  test("returnsNull_WhenAllOptionsCollide", () => {
    expect(generateSmartAlias("Orders", new Set(["o", "orde"]))).toBeNull();
  });

  test("stripsBrackets_FromBracketedName", () => {
    expect(generateSmartAlias("[My Table Name]", new Set())).toBe("mtn");
  });

  test("handlesUnderscoreSeparated", () => {
    expect(generateSmartAlias("order_details", new Set())).toBe("od");
  });

  test("handlesSpaceSeparated", () => {
    expect(generateSmartAlias("Order Details", new Set())).toBe("od");
  });

  test("capsInitialsAtThreeLetters_ForLongNames", () => {
    expect(generateSmartAlias("IdMap_ContactKey_ContactID", new Set())).toBe(
      "imc",
    );
  });

  test("capsInitialsAtThreeLetters_ForManyWords", () => {
    expect(
      generateSmartAlias("Customer_Order_Details_History_Archive", new Set()),
    ).toBe("cod");
  });
});
