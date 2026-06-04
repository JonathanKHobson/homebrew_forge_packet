export function parseManaCostTokens(value?: string): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return [];
  }
  const tokens: string[] = [];
  for (let index = 0; index < raw.length; ) {
    const char = raw[index] ?? '';
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === '{') {
      const end = raw.indexOf('}', index + 1);
      if (end === -1) {
        index += 1;
        continue;
      }
      const token = raw.slice(index + 1, end).trim();
      if (token) {
        tokens.push(normalizeManaTokenText(token));
      }
      index = end + 1;
      continue;
    }
    const numericToken = raw.slice(index).match(/^\d+/)?.[0];
    if (numericToken) {
      const slashPart = parseSlashSuffix(raw, index + numericToken.length);
      if (slashPart) {
        tokens.push(`${numericToken}/${slashPart.token}`);
        index = slashPart.nextIndex;
      } else {
        tokens.push(numericToken);
        index += numericToken.length;
      }
      continue;
    }
    if (isManaPart(char)) {
      const slashPart = parseSlashSuffix(raw, index + 1);
      if (slashPart) {
        tokens.push(`${char.toUpperCase()}/${slashPart.token}`);
        index = slashPart.nextIndex;
      } else {
        tokens.push(char.toUpperCase());
        index += 1;
      }
      continue;
    }
    index += 1;
  }
  return tokens;
}

export function normalizeManaCost(value: string): string {
  return parseManaCostTokens(value)
    .map((token) => `{${token}}`)
    .join('');
}

export function manaColorsFromCost(value?: string): string {
  return [...new Set(parseManaCostTokens(value).join('').toUpperCase().replace(/[^WUBRGC]/g, '').split('').filter(Boolean))].join('');
}

export function hasRecognizedManaCost(value?: string): boolean {
  const raw = String(value ?? '').trim();
  return !raw || parseManaCostTokens(raw).length > 0;
}

function parseSlashSuffix(value: string, slashIndex: number): { token: string; nextIndex: number } | undefined {
  if (value[slashIndex] !== '/') {
    return undefined;
  }
  const next = value[slashIndex + 1] ?? '';
  if (!isManaPart(next)) {
    return undefined;
  }
  return { token: next.toUpperCase(), nextIndex: slashIndex + 2 };
}

function normalizeManaTokenText(value: string): string {
  return value
    .split('/')
    .map((part) => {
      const cleaned = part.trim();
      return /^\d+$/.test(cleaned) ? cleaned : cleaned.toUpperCase();
    })
    .join('/');
}

function isManaPart(value: string): boolean {
  return /^[WUBRGCXYZPQS]$/i.test(value);
}
