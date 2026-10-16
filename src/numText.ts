// Cleans what was typed into a number box: comma becomes dot, only digits and one dot stay
export function sanitizeNum(raw: string, decimal: boolean): string {
  const text = raw.replace(',', '.');
  const clean = decimal ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, '');
  const parts = clean.split('.');
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
}
