/** Turns `*word*` into the italic serif accent. Input is site copy we control, so HTML-escape and go. */
export function accent(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
}
