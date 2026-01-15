export const getInlineCompletionReplacementEndOffset = (
  sql: string,
  cursorIndex: number,
  insertText: string,
) => {
  const nextChar = sql[cursorIndex] ?? "";
  const shouldReplaceClosingBracket =
    insertText.startsWith("]") && nextChar === "]";

  return shouldReplaceClosingBracket ? cursorIndex + 1 : cursorIndex;
};
