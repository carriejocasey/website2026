/**
 * Formats a line of site copy, markdown-style. Input is copy we control, so HTML-escape and go.
 *   *word*            -> the italic serif accent
 *   [text](https://…) -> a link to another site (opens in a new tab)
 */
export function accent(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
