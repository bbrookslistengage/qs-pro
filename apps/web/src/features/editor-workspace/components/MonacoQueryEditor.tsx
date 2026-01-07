import { useCallback, useEffect, useMemo, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useQueryClient } from "@tanstack/react-query";
import type {
  DataExtension,
  DataExtensionField,
  Folder,
} from "@/features/editor-workspace/types";
import {
  buildFieldsQueryOptions,
  metadataQueryKeys,
} from "@/features/editor-workspace/hooks/use-metadata";
import {
  applyMonacoTheme,
  getEditorOptions,
  MONACO_THEME_NAME,
} from "@/features/editor-workspace/utils/monaco-options";
import {
  buildDataExtensionSuggestions,
  buildFieldSuggestions,
  getPrimaryTable,
  resolveTableForAlias,
} from "@/features/editor-workspace/utils/sql-autocomplete";
import {
  extractTableReferences,
  getSharedFolderIds,
  getSqlCursorContext,
  extractSelectFieldRanges,
  type SqlTableReference,
} from "@/features/editor-workspace/utils/sql-context";
import {
  useJoinSuggestions,
  type JoinSuggestionOverrides,
} from "@/features/editor-workspace/utils/join-suggestions";
import type { SqlDiagnostic } from "@/features/editor-workspace/utils/sql-diagnostics";
import { toMonacoMarkers } from "@/features/editor-workspace/utils/sql-diagnostics";
import { cn } from "@/lib/utils";

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "INNER",
  "LEFT",
  "RIGHT",
  "FULL",
  "OUTER",
  "CROSS",
  "ON",
  "UNION",
  "UNION ALL",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "DISTINCT",
  "TOP",
  "ASC",
  "DESC",
  "AS",
  "AND",
  "OR",
  "NOT",
  "IN",
  "EXISTS",
  "IS",
  "NULL",
  "BETWEEN",
  "LIKE",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
];

const MAX_DE_SUGGESTIONS = 50;
const MAX_DE_COUNT_FETCH = 10;

interface MonacoQueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onRunRequest?: () => void;
  diagnostics: SqlDiagnostic[];
  dataExtensions: DataExtension[];
  folders: Folder[];
  tenantId?: string | null;
  joinSuggestionOverrides?: JoinSuggestionOverrides;
  className?: string;
}

export function MonacoQueryEditor({
  value,
  onChange,
  onSave,
  onRunRequest,
  diagnostics,
  dataExtensions,
  folders,
  tenantId,
  joinSuggestionOverrides,
  className,
}: MonacoQueryEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationRef = useRef<string[]>([]);
  const completionDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const autoBracketDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const inlineCompletionDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const autoBracketRef = useRef(false);
  const queryClient = useQueryClient();
  const getJoinSuggestions = useJoinSuggestions(joinSuggestionOverrides);

  const sharedFolderIds = useMemo(() => getSharedFolderIds(folders), [folders]);
  const dataExtensionsRef = useRef<DataExtension[]>(dataExtensions);
  const sharedFolderIdsRef = useRef<Set<string>>(sharedFolderIds);
  const tenantIdRef = useRef<string | null | undefined>(tenantId);

  const resolveDataExtension = useCallback((name: string) => {
    const normalized = name.toLowerCase();
    return dataExtensionsRef.current.find(
      (de) =>
        de.name.toLowerCase() === normalized ||
        de.customerKey.toLowerCase() === normalized,
    );
  }, []);

  const fetchFields = useCallback(
    async (customerKey: string) => {
      if (!tenantIdRef.current) return [];
      try {
        const options = buildFieldsQueryOptions(
          tenantIdRef.current,
          customerKey,
        );
        return await queryClient.fetchQuery(options);
      } catch {
        return [];
      }
    },
    [queryClient],
  );

  const getFieldsCount = useCallback(
    async (customerKey: string, shouldFetch: boolean) => {
      if (!tenantIdRef.current) return null;
      const cached = queryClient.getQueryData<DataExtensionField[]>(
        metadataQueryKeys.fields(tenantIdRef.current, customerKey),
      );
      if (cached) return cached.length;
      if (!shouldFetch) return null;
      const fields = await fetchFields(customerKey);
      return fields.length;
    },
    [fetchFields, queryClient],
  );

  const getBracketReplacementRange = useCallback(
    (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
      const offset = model.getOffsetAt(position);
      const line = model.getLineContent(position.lineNumber);
      const lineOffset = model.getOffsetAt({
        lineNumber: position.lineNumber,
        column: 1,
      });
      const cursorInLine = position.column - 1;
      const leftIndex = line.lastIndexOf("[", cursorInLine);
      const rightIndex = line.indexOf("]", cursorInLine);

      if (leftIndex !== -1) {
        const start = lineOffset + leftIndex + 1;
        if (rightIndex !== -1 && rightIndex >= cursorInLine) {
          const end = lineOffset + rightIndex;
          if (start <= offset && offset <= end) {
            return {
              startOffset: start,
              endOffset: end,
              inBracket: true,
              hasClosingBracket: true,
            };
          }
        }

        if (rightIndex === -1 && start <= offset) {
          return {
            startOffset: start,
            endOffset: offset,
            inBracket: true,
            hasClosingBracket: false,
          };
        }
      }

      return {
        startOffset: offset,
        endOffset: offset,
        inBracket: false,
        hasClosingBracket: false,
      };
    },
    [],
  );

  useEffect(() => {
    dataExtensionsRef.current = dataExtensions;
  }, [dataExtensions]);

  useEffect(() => {
    sharedFolderIdsRef.current = sharedFolderIds;
  }, [sharedFolderIds]);

  useEffect(() => {
    tenantIdRef.current = tenantId;
  }, [tenantId]);

  const handleEditorMount: OnMount = useCallback(
    (editorInstance, monacoInstance) => {
      editorRef.current = editorInstance;
      monacoRef.current = monacoInstance;

      applyMonacoTheme(monacoInstance);

      const model = editorInstance.getModel();
      if (model) {
        monacoInstance.editor.setModelMarkers(
          model,
          "sql-lint",
          toMonacoMarkers(diagnostics, model.getValue(), monacoInstance),
        );
      }

      completionDisposableRef.current?.dispose();
      completionDisposableRef.current =
        monacoInstance.languages.registerCompletionItemProvider("sql", {
          triggerCharacters: [" ", ".", "["],
          provideCompletionItems: async (model, position) => {
            const text = model.getValue();
            const cursorIndex = model.getOffsetAt(position);
            const context = getSqlCursorContext(text, cursorIndex);
            const bracketRange = getBracketReplacementRange(model, position);
            const keywordSuggestions = SQL_KEYWORDS.filter((keyword) =>
              keyword
                .toLowerCase()
                .startsWith(context.currentWord.toLowerCase()),
            ).map((keyword) => ({
              label: keyword,
              insertText: keyword,
              kind: monacoInstance.languages.CompletionItemKind.Keyword,
            }));

            if (context.aliasBeforeDot) {
              const table = resolveTableForAlias(
                context.aliasBeforeDot,
                context.tablesInScope,
              );
              if (!table) return { suggestions: [] };

              let fields: DataExtensionField[] = [];
              const ownerLabel = table.isSubquery
                ? (table.alias ?? "Subquery")
                : (resolveDataExtension(table.name)?.name ??
                  table.qualifiedName);
              if (table.isSubquery) {
                fields = table.outputFields.map((name) => ({
                  name,
                  type: "Text",
                  isPrimaryKey: false,
                  isNullable: true,
                }));
              } else if (tenantIdRef.current) {
                const dataExtension = resolveDataExtension(table.name);
                const customerKey = dataExtension?.customerKey ?? table.name;
                fields = await fetchFields(customerKey);
              }

              const suggestions = buildFieldSuggestions(fields, {
                ownerLabel,
              }).map((suggestion) => ({
                label: suggestion.label,
                insertText: suggestion.insertText,
                detail: suggestion.detail,
                kind: monacoInstance.languages.CompletionItemKind.Field,
              }));
              return { suggestions };
            }

            if (context.isAfterFromJoin) {
              const shouldSuggestTables =
                !context.hasFromJoinTable ||
                context.cursorInFromJoinTable ||
                bracketRange.inBracket;
              if (shouldSuggestTables) {
                const joinTail = model
                  .getValue()
                  .slice(cursorIndex, cursorIndex + 10);
                const shouldAppendOn =
                  context.lastKeyword === "join" && !/^\s*on\b/i.test(joinTail);

                const suggestionsBase = buildDataExtensionSuggestions(
                  dataExtensionsRef.current,
                  sharedFolderIdsRef.current,
                  context.currentWord,
                ).slice(0, MAX_DE_SUGGESTIONS);
                const countResults = await Promise.all(
                  suggestionsBase.map((suggestion, index) =>
                    getFieldsCount(
                      suggestion.customerKey,
                      index < MAX_DE_COUNT_FETCH,
                    ),
                  ),
                );

                const suggestions = suggestionsBase.map((suggestion, index) => {
                  const replaceOffsets =
                    bracketRange.inBracket && suggestion.isShared
                      ? {
                          startOffset: bracketRange.startOffset - 1,
                          endOffset: bracketRange.hasClosingBracket
                            ? bracketRange.endOffset + 1
                            : bracketRange.endOffset,
                        }
                      : bracketRange;
                  const insertText = bracketRange.inBracket
                    ? suggestion.isShared
                      ? shouldAppendOn
                        ? `ENT.[${suggestion.name}] ON `
                        : `ENT.[${suggestion.name}]`
                      : suggestion.name
                    : shouldAppendOn
                      ? `${suggestion.insertText} ON `
                      : suggestion.insertText;
                  const range = bracketRange.inBracket
                    ? (() => {
                        const startPos = model.getPositionAt(
                          replaceOffsets.startOffset,
                        );
                        const endPos = model.getPositionAt(
                          replaceOffsets.endOffset,
                        );
                        return {
                          startLineNumber: startPos.lineNumber,
                          startColumn: startPos.column,
                          endLineNumber: endPos.lineNumber,
                          endColumn: endPos.column,
                        };
                      })()
                    : undefined;
                  const insertOffset = bracketRange.hasClosingBracket
                    ? bracketRange.endOffset + 1
                    : bracketRange.endOffset;
                  const insertPosition = model.getPositionAt(insertOffset);
                  const tail = model
                    .getValue()
                    .slice(insertOffset, insertOffset + 10);
                  const shouldInsertOn =
                    shouldAppendOn &&
                    !suggestion.isShared &&
                    !/^\s*on\b/i.test(tail);

                  return {
                    label: suggestion.label,
                    insertText,
                    kind: monacoInstance.languages.CompletionItemKind.Struct,
                    detail:
                      countResults[index] === null
                        ? "Fields: —"
                        : `Fields: ${countResults[index]}`,
                    range,
                    additionalTextEdits:
                      bracketRange.inBracket && shouldInsertOn
                        ? [
                            {
                              range: new monacoInstance.Range(
                                insertPosition.lineNumber,
                                insertPosition.column,
                                insertPosition.lineNumber,
                                insertPosition.column,
                              ),
                              text: " ON ",
                            },
                          ]
                        : undefined,
                  };
                });
                return { suggestions };
              }
            }

            if (context.isAfterSelect) {
              const primaryTable = getPrimaryTable(context.tablesInScope);
              if (!primaryTable) return { suggestions: [] };

              let fields: DataExtensionField[] = [];
              const ownerLabel = primaryTable.isSubquery
                ? (primaryTable.alias ?? "Subquery")
                : (resolveDataExtension(primaryTable.name)?.name ??
                  primaryTable.qualifiedName);
              const aliasPrefix = primaryTable.alias ?? undefined;
              if (primaryTable.isSubquery) {
                fields = primaryTable.outputFields.map((name) => ({
                  name,
                  type: "Text",
                  isPrimaryKey: false,
                  isNullable: true,
                }));
              } else if (tenantIdRef.current) {
                const dataExtension = resolveDataExtension(primaryTable.name);
                const customerKey =
                  dataExtension?.customerKey ?? primaryTable.name;
                fields = await fetchFields(customerKey);
              }

              const suggestions = buildFieldSuggestions(fields, {
                prefix: aliasPrefix,
                ownerLabel,
              }).map((suggestion) => ({
                label: suggestion.label,
                insertText: suggestion.insertText,
                detail: suggestion.detail,
                kind: monacoInstance.languages.CompletionItemKind.Field,
              }));
              return {
                suggestions: context.currentWord
                  ? [...suggestions, ...keywordSuggestions]
                  : suggestions,
              };
            }

            if (
              context.lastKeyword === "join" &&
              context.hasFromJoinTable &&
              !context.cursorInFromJoinTable &&
              !context.currentWord
            ) {
              return {
                suggestions: [
                  {
                    label: "ON",
                    insertText: "ON",
                    kind: monacoInstance.languages.CompletionItemKind.Keyword,
                  },
                ],
              };
            }

            return { suggestions: keywordSuggestions };
          },
        });

      inlineCompletionDisposableRef.current?.dispose();
      inlineCompletionDisposableRef.current =
        monacoInstance.languages.registerInlineCompletionsProvider("sql", {
          provideInlineCompletions: async (model, position) => {
            const text = model.getValue();
            const cursorIndex = model.getOffsetAt(position);
            const context = getSqlCursorContext(text, cursorIndex);

            if (context.lastKeyword !== "on" || context.currentWord) {
              return { items: [] };
            }

            if (context.tablesInScope.length < 2) {
              return { items: [] };
            }

            const rightTable =
              context.tablesInScope[context.tablesInScope.length - 1];
            const leftTable =
              context.tablesInScope[context.tablesInScope.length - 2];

            const resolveFields = async (table: SqlTableReference) => {
              if (table.isSubquery) {
                return table.outputFields.map((name) => ({
                  name,
                  type: "Text",
                  isPrimaryKey: false,
                  isNullable: true,
                }));
              }
              const dataExtension = resolveDataExtension(table.name);
              const customerKey = dataExtension?.customerKey ?? table.name;
              return fetchFields(customerKey);
            };

            const [leftFields, rightFields] = await Promise.all([
              resolveFields(leftTable),
              resolveFields(rightTable),
            ]);

            const suggestions = getJoinSuggestions({
              leftTable,
              rightTable,
              leftFields,
              rightFields,
            });

            if (suggestions.length === 0) {
              return { items: [] };
            }

            return {
              items: suggestions.map((suggestion) => ({
                insertText: suggestion.text,
                range: new monacoInstance.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber,
                  position.column,
                ),
              })),
            };
          },
          freeInlineCompletions: () => {},
        });

      monacoInstance.languages.setLanguageConfiguration("sql", {
        comments: {
          lineComment: "--",
          blockComment: ["/*", "*/"],
        },
        autoClosingPairs: [
          { open: "[", close: "]" },
          { open: "(", close: ")" },
          { open: "{", close: "}" },
          { open: "'", close: "'" },
          { open: '"', close: '"' },
          { open: "/*", close: "*/" },
        ],
      });

      autoBracketDisposableRef.current?.dispose();
      autoBracketDisposableRef.current = editorInstance.onDidChangeModelContent(
        (event) => {
          if (autoBracketRef.current) return;
          const model = editorInstance.getModel();
          if (!model) return;

          const latestChange = event.changes[event.changes.length - 1];
          if (!latestChange) return;
          if (!latestChange.text) return;

          const changeEnd = latestChange.rangeOffset + latestChange.text.length;
          const prefixStart = Math.max(0, changeEnd - 7);
          const prefix = model
            .getValue()
            .slice(prefixStart, changeEnd)
            .toLowerCase();
          const shouldInsert = /\b(from|join)\s$/.test(prefix);

          if (!shouldInsert) return;

          const position = model.getPositionAt(changeEnd);
          const nextChar = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column + 1,
          });

          if (nextChar.startsWith("[")) return;

          autoBracketRef.current = true;
          editorInstance.executeEdits("auto-bracket", [
            {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
              text: "[]",
            },
          ]);
          editorInstance.setPosition({
            lineNumber: position.lineNumber,
            column: position.column + 1,
          });
          autoBracketRef.current = false;
        },
      );

      if (onSave) {
        editorInstance.addCommand(
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
          () => {
            onSave();
          },
        );
      }

      if (onRunRequest) {
        editorInstance.addCommand(
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
          () => {
            onRunRequest();
          },
        );
      }

      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Slash,
        () => {
          editorInstance.getAction("editor.action.commentLine")?.run();
        },
      );
    },
    [
      diagnostics,
      fetchFields,
      getFieldsCount,
      onRunRequest,
      onSave,
      resolveDataExtension,
    ],
  );

  useEffect(() => {
    return () => {
      completionDisposableRef.current?.dispose();
      autoBracketDisposableRef.current?.dispose();
      inlineCompletionDisposableRef.current?.dispose();
      completionDisposableRef.current = null;
      autoBracketDisposableRef.current = null;
      inlineCompletionDisposableRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(
      model,
      "sql-lint",
      toMonacoMarkers(diagnostics, model.getValue(), monaco),
    );
  }, [diagnostics, value]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    const references = extractTableReferences(model.getValue()).filter(
      (reference) => !reference.isSubquery,
    );

    const decorations = references.map((reference) => {
      const start = model.getPositionAt(reference.startIndex);
      const end = model.getPositionAt(reference.endIndex);
      return {
        range: new monaco.Range(
          start.lineNumber,
          start.column,
          end.lineNumber,
          end.column,
        ),
        options: {
          inlineClassName: "monaco-de-name",
        },
      };
    });

    const fieldRanges = extractSelectFieldRanges(model.getValue());
    const fieldDecorations = fieldRanges.map((range) => {
      const start = model.getPositionAt(range.startIndex);
      const end = model.getPositionAt(range.endIndex);
      return {
        range: new monaco.Range(
          start.lineNumber,
          start.column,
          end.lineNumber,
          end.column,
        ),
        options: {
          inlineClassName:
            range.type === "field" ? "monaco-field-name" : "monaco-field-alias",
        },
      };
    });

    decorationRef.current = editor.deltaDecorations(decorationRef.current, [
      ...decorations,
      ...fieldDecorations,
    ]);
  }, [value]);

  return (
    <div className={cn("h-full w-full", className)}>
      <Editor
        height="100%"
        defaultLanguage="sql"
        theme={MONACO_THEME_NAME}
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        onMount={handleEditorMount}
        options={getEditorOptions()}
      />
    </div>
  );
}
