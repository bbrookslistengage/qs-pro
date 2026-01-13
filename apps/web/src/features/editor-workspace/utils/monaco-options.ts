import type { editor } from "monaco-editor";

export const MONACO_THEME_NAME = "qs-pro-sql";

const getCssVarValue = (name: string, fallbackName?: string) => {
  if (typeof window === "undefined") return "";
  const root = getComputedStyle(document.documentElement);
  const value = root.getPropertyValue(name).trim();
  if (value) return value;
  if (!fallbackName) return value;
  return root.getPropertyValue(fallbackName).trim();
};

const getThemeBase = () => {
  if (typeof document === "undefined") return "vs";
  return document.documentElement.classList.contains("dark") ? "vs-dark" : "vs";
};

export const getEditorOptions =
  (): editor.IStandaloneEditorConstructionOptions => ({
    minimap: { enabled: false },
    suggestOnTriggerCharacters: true,
    // Prevent hover tooltips from being clipped by toolbar on first lines
    fixedOverflowWidgets: true,
    // Prevent find/replace widget from pushing content down
    find: {
      addExtraSpaceOnTop: false,
    },
    scrollBeyondLastLine: false,
    lineNumbers: "on",
    rulers: [100],
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoClosingDelete: "always",
    autoIndent: "advanced",
    formatOnPaste: false,
    formatOnType: false,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    acceptSuggestionOnEnter: "smart",
    fontFamily: "var(--font-mono)",
    fontLigatures: false,
    renderLineHighlight: "line",
    renderWhitespace: "selection",
    roundedSelection: false,
    cursorBlinking: "smooth",
  });

export const applyMonacoTheme = (monaco: typeof import("monaco-editor")) => {
  if (typeof window === "undefined") return;

  const foreground = getCssVarValue("--foreground", "--card-foreground");
  const background = getCssVarValue("--background", "--card");
  const border = getCssVarValue("--border", "--muted");
  const error = getCssVarValue("--error", "--error-500");
  const warning = getCssVarValue("--warning", "--warning-500");
  const lineHighlight = getCssVarValue("--surface", "--muted");

  const syntaxKeyword = getCssVarValue("--syntax-keyword", "--primary");
  const syntaxFunction = getCssVarValue("--syntax-function", "--warning");
  const syntaxOperator = getCssVarValue("--syntax-operator", "--secondary");
  const syntaxString = getCssVarValue("--syntax-string", "--success");
  const syntaxNumber = getCssVarValue("--syntax-number", "--primary-300");
  const syntaxComment = getCssVarValue("--syntax-comment", "--muted-foreground");

  const toToken = (value: string) => value.replace("#", "");

  monaco.editor.defineTheme(MONACO_THEME_NAME, {
    base: getThemeBase(),
    inherit: true,
    colors: {
      "editor.background": background,
      "editor.foreground": foreground,
      "editorLineNumber.foreground": syntaxComment,
      "editorLineNumber.activeForeground": foreground,
      "editorCursor.foreground": syntaxKeyword,
      "editorIndentGuide.background": border,
      "editorIndentGuide.activeBackground": border,
      editorLineHighlightBackground: lineHighlight,
      "editorRuler.foreground": border,
      "editorBracketMatch.background": lineHighlight,
      "editorBracketMatch.border": border,
      "editorError.foreground": error,
      "editorWarning.foreground": warning,
    },
    rules: [
      { token: "keyword", foreground: toToken(syntaxKeyword), fontStyle: "bold" },
      { token: "keyword.sql", foreground: toToken(syntaxKeyword), fontStyle: "bold" },

      { token: "predefined.sql", foreground: toToken(syntaxFunction) },

      { token: "operator", foreground: toToken(syntaxOperator) },
      { token: "operator.sql", foreground: toToken(syntaxOperator) },

      { token: "string", foreground: toToken(syntaxString) },
      { token: "string.sql", foreground: toToken(syntaxString) },

      { token: "number", foreground: toToken(syntaxNumber) },
      { token: "number.sql", foreground: toToken(syntaxNumber) },

      { token: "comment", foreground: toToken(syntaxComment), fontStyle: "italic" },
      { token: "comment.sql", foreground: toToken(syntaxComment), fontStyle: "italic" },
    ],
  });

  monaco.editor.setTheme(MONACO_THEME_NAME);
};
