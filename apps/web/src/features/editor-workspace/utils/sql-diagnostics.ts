export type SqlDiagnosticSeverity = "error" | "warning" | "prereq";

export interface SqlDiagnostic {
  message: string;
  severity: SqlDiagnosticSeverity;
  startIndex: number;
  endIndex: number;
}

export const isMarkerDiagnostic = (diagnostic: SqlDiagnostic) => {
  return diagnostic.severity === "error" || diagnostic.severity === "warning";
};

export const getPositionFromIndex = (text: string, index: number) => {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const slice = text.slice(0, safeIndex);
  const lines = slice.split("\n");
  const lineNumber = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  return { lineNumber, column };
};

export const formatDiagnosticMessage = (
  diagnostic: SqlDiagnostic,
  text: string,
) => {
  const position = getPositionFromIndex(text, diagnostic.startIndex);
  return `Line ${position.lineNumber}: ${diagnostic.message}`;
};

export const toMonacoMarkers = (
  diagnostics: SqlDiagnostic[],
  text: string,
  monaco: typeof import("monaco-editor"),
) => {
  return diagnostics.filter(isMarkerDiagnostic).map((diagnostic) => {
    const start = getPositionFromIndex(text, diagnostic.startIndex);
    const end = getPositionFromIndex(
      text,
      Math.max(diagnostic.endIndex, diagnostic.startIndex + 1),
    );
    const severity =
      diagnostic.severity === "error"
        ? monaco.MarkerSeverity.Error
        : monaco.MarkerSeverity.Warning;

    return {
      severity,
      message: formatDiagnosticMessage(diagnostic, text),
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn: end.column,
    };
  });
};
