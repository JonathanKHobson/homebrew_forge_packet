export function wrapText(value: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const paragraph of value.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}

export function joinRulesText(oracleText?: string, flavorText?: string): string {
  if (oracleText && flavorText) {
    return `${oracleText}\n\n${flavorText}`;
  }
  return oracleText ?? flavorText ?? '';
}

