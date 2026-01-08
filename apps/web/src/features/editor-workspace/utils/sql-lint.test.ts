import { describe, expect, test } from "vitest";
import type { DataExtension } from "@/features/editor-workspace/types";
import { lintSql } from "@/features/editor-workspace/utils/sql-lint";

describe("sql lint", () => {
  test("lintSql_WithProhibitedKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "SELECT * FROM Subscribers DELETE FROM Users";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("Not Supported")),
    ).toBe(true);
  });

  test("lintSql_WithKeywordInsideBrackets_DoesNotReport", () => {
    // Arrange
    const sql = "SELECT * FROM [DELETE Me]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(diagnostics.length).toBe(0);
  });

  test("lintSql_WithCte_ReturnsWarningDiagnostic", () => {
    // Arrange
    const sql = "WITH cte AS (SELECT Id FROM Users) SELECT * FROM cte";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(diagnostics.some((diag) => diag.message.includes("CTEs"))).toBe(
      true,
    );
  });

  test("lintSql_WithTempTable_ReturnsWarningDiagnostic", () => {
    // Arrange
    const sql = "SELECT * FROM #TempTable";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("Temp tables")),
    ).toBe(true);
  });

  test("lintSql_WithProceduralKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "DECLARE @count INT";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(diagnostics.some((diag) => diag.message.includes("Variables"))).toBe(
      true,
    );
  });

  test("lintSql_WithMissingSelect_ReturnsPrereqDiagnostic", () => {
    // Arrange
    const sql = "FROM Subscribers";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) =>
          diag.severity === "prereq" &&
          diag.message.includes("SELECT statement"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithMissingFromForFields_ReturnsPrereqDiagnostic", () => {
    // Arrange
    const sql = "SELECT EmailAddress";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) =>
          diag.severity === "prereq" && diag.message.includes("FROM clause"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithUnbracketedSpaceName_ReturnsWarningDiagnostic", () => {
    // Arrange
    const sql = "SELECT * FROM My Data";
    const dataExtensions: DataExtension[] = [
      {
        id: "de-1",
        name: "My Data",
        customerKey: "My Data",
        folderId: "local",
        description: "",
        fields: [],
      },
    ];

    // Act
    const diagnostics = lintSql(sql, { dataExtensions });

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("wrapped in brackets")),
    ).toBe(true);
  });

  test("lintSql_WithAmbiguousFieldAndMissingAliases_ReturnsError", () => {
    // Arrange
    const sql =
      "SELECT EmailAddress FROM [DE One] JOIN [DE Two] ON [DE One].Id = [DE Two].Id";
    const dataExtensions: DataExtension[] = [
      {
        id: "de-1",
        name: "DE One",
        customerKey: "DE One",
        folderId: "local",
        description: "",
        fields: [
          {
            name: "EmailAddress",
            type: "Email",
            isPrimaryKey: false,
            isNullable: true,
          },
          { name: "Id", type: "Text", isPrimaryKey: false, isNullable: true },
        ],
      },
      {
        id: "de-2",
        name: "DE Two",
        customerKey: "DE Two",
        folderId: "local",
        description: "",
        fields: [
          {
            name: "EmailAddress",
            type: "Email",
            isPrimaryKey: false,
            isNullable: true,
          },
          { name: "Id", type: "Text", isPrimaryKey: false, isNullable: true },
        ],
      },
    ];

    // Act
    const diagnostics = lintSql(sql, { dataExtensions });

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("Ambiguous field")),
    ).toBe(true);
  });

  test("lintSql_WithAmbiguousFieldAndAliases_AllowsQualifiedField", () => {
    // Arrange
    const sql =
      "SELECT a.EmailAddress FROM [DE One] a JOIN [DE Two] b ON a.Id = b.Id";
    const dataExtensions: DataExtension[] = [
      {
        id: "de-1",
        name: "DE One",
        customerKey: "DE One",
        folderId: "local",
        description: "",
        fields: [
          {
            name: "EmailAddress",
            type: "Email",
            isPrimaryKey: false,
            isNullable: true,
          },
          { name: "Id", type: "Text", isPrimaryKey: false, isNullable: true },
        ],
      },
      {
        id: "de-2",
        name: "DE Two",
        customerKey: "DE Two",
        folderId: "local",
        description: "",
        fields: [
          {
            name: "EmailAddress",
            type: "Email",
            isPrimaryKey: false,
            isNullable: true,
          },
          { name: "Id", type: "Text", isPrimaryKey: false, isNullable: true },
        ],
      },
    ];

    // Act
    const diagnostics = lintSql(sql, { dataExtensions });

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("Ambiguous field")),
    ).toBe(false);
  });

  test("lintSql_WithAmbiguousFieldAndAliasesButUnqualified_ReturnsError", () => {
    // Arrange
    const sql =
      "SELECT EmailAddress FROM [DE One] a JOIN [DE Two] b ON a.Id = b.Id";
    const dataExtensions: DataExtension[] = [
      {
        id: "de-1",
        name: "DE One",
        customerKey: "DE One",
        folderId: "local",
        description: "",
        fields: [
          {
            name: "EmailAddress",
            type: "Email",
            isPrimaryKey: false,
            isNullable: true,
          },
          {
            name: "Id",
            type: "Text",
            isPrimaryKey: false,
            isNullable: true,
          },
        ],
      },
      {
        id: "de-2",
        name: "DE Two",
        customerKey: "DE Two",
        folderId: "local",
        description: "",
        fields: [
          {
            name: "EmailAddress",
            type: "Email",
            isPrimaryKey: false,
            isNullable: true,
          },
          {
            name: "Id",
            type: "Text",
            isPrimaryKey: false,
            isNullable: true,
          },
        ],
      },
    ];

    // Act
    const diagnostics = lintSql(sql, { dataExtensions });

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("Ambiguous field")),
    ).toBe(true);
  });

  // Task Group 2: Prohibited Keywords & CTE Detection tests
  test("lintSql_WithCreateKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "CREATE TABLE Users (Id INT)";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("Not Supported"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithExecKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "EXEC sp_procedure @param = 'value'";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("Not Supported"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithGrantKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "GRANT SELECT ON Users TO Role";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("Not Supported"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithCursorKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "DECLARE myCursor CURSOR FOR SELECT * FROM Users";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("Not Supported"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithBackupKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "BACKUP DATABASE MyDB TO DISK = 'backup.bak'";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("Not Supported"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithIfKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "IF @count > 0 BEGIN SELECT * FROM Users END";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("Variables"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithTryCatchKeywords_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "BEGIN TRY SELECT * FROM Users END TRY BEGIN CATCH END CATCH";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("Variables"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithCteColumnSyntax_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "WITH cte (col1, col2) AS (SELECT Id, Name FROM Users) SELECT * FROM cte";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("CTEs are not supported"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithMultiCte_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql =
      "WITH cte1 AS (SELECT Id FROM Users), cte2 AS (SELECT Id FROM Orders) SELECT * FROM cte1 JOIN cte2";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) => diag.severity === "error" && diag.message.includes("CTEs are not supported"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithLimitKeyword_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "SELECT * FROM Users LIMIT 10";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) =>
          diag.severity === "error" &&
          diag.message.includes("LIMIT is not supported") &&
          diag.message.includes("Use TOP instead"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithOffsetFetchPagination_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "SELECT * FROM Users ORDER BY Id OFFSET 10 ROWS FETCH NEXT 20 ROWS ONLY";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) =>
          diag.severity === "error" &&
          diag.message.includes("OFFSET/FETCH pagination is not supported") &&
          diag.message.includes("Use TOP"),
      ),
    ).toBe(true);
  });

  // Task Group 3: New Linting Rules tests
  test("lintSql_WithUnsupportedFunction_ReturnsWarningDiagnostic", () => {
    // Arrange
    const sql = "SELECT string_agg(Name, ',') FROM [Users]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) =>
          diag.severity === "warning" &&
          diag.message.includes("may not be supported in Marketing Cloud SQL"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithMultipleUnsupportedFunctions_ReturnsMultipleWarnings", () => {
    // Arrange
    const sql = "SELECT try_convert(INT, Value), json_modify(Data, '$.key', 'val') FROM [Table]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    const unsupportedWarnings = diagnostics.filter(
      (diag) =>
        diag.severity === "warning" &&
        diag.message.includes("may not be supported"),
    );
    expect(unsupportedWarnings.length).toBeGreaterThanOrEqual(2);
  });

  test("lintSql_WithSupportedJsonFunctions_DoesNotWarn", () => {
    // Arrange
    const sql = "SELECT json_value(Data, '$.name'), json_query(Data, '$.items') FROM [Table]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("may not be supported")),
    ).toBe(false);
  });

  test("lintSql_WithAggregateWithoutGroupBy_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "SELECT Region, COUNT(*) FROM [Sales]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) =>
          diag.severity === "error" &&
          diag.message.includes("must appear in GROUP BY clause"),
      ),
    ).toBe(true);
  });

  test("lintSql_WithAggregateOnly_DoesNotWarn", () => {
    // Arrange
    const sql = "SELECT COUNT(*) FROM [Table]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("GROUP BY")),
    ).toBe(false);
  });

  test("lintSql_WithProperGroupBy_DoesNotWarn", () => {
    // Arrange
    const sql = "SELECT Region, COUNT(*) FROM [Table] GROUP BY Region";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("GROUP BY")),
    ).toBe(false);
  });

  test("lintSql_WithCountDistinct_IsAggregated", () => {
    // Arrange
    const sql = "SELECT COUNT(DISTINCT Region) FROM [Table]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some((diag) => diag.message.includes("GROUP BY")),
    ).toBe(false);
  });

  test("lintSql_WithSelectStarAndAggregate_ReturnsErrorDiagnostic", () => {
    // Arrange
    const sql = "SELECT *, COUNT(*) FROM [Table]";

    // Act
    const diagnostics = lintSql(sql);

    // Assert
    expect(
      diagnostics.some(
        (diag) =>
          diag.severity === "error" &&
          diag.message.includes("must appear in GROUP BY clause"),
      ),
    ).toBe(true);
  });
});
