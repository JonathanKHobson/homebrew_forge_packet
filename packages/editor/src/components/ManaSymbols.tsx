import { useEffect, useMemo, useState } from 'react';
import { parseManaCostTokens } from '@homebrew-forge/forge/mana';

const COLOR_SYMBOL_TOKENS = ['w', 'u', 'b', 'r', 'g', 'c'];
const INITIAL_SYMBOL_TOKENS = [...COLOR_SYMBOL_TOKENS, '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const preloadedManaSymbols = new Set<string>();

export function ManaSymbol({ token, label, fallbackText = true, className = '' }: { token: string; label?: string; fallbackText?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = manaSymbolSrc(token);
  const display = normalizeManaSymbolToken(token).toUpperCase();
  if (!src || failed) {
    return (
      <span className={`mana-symbol-fallback ${fallbackText ? '' : 'icon-only'} ${className}`.trim()} aria-label={label ?? display}>
        {fallbackText ? display : null}
      </span>
    );
  }
  return <img className={`mana-symbol-img ${className}`.trim()} src={src} alt={label ?? display} draggable={false} onError={() => setFailed(true)} />;
}

export function ManaSymbolSet({
  value,
  fallbackText = false,
  className = '',
  ariaHidden = true
}: {
  value: string;
  fallbackText?: boolean;
  className?: string;
  ariaHidden?: boolean;
}) {
  const tokens = colorIdentityTokens(value);
  return (
    <span className={`mana-symbol-set ${className}`.trim()} aria-label={ariaHidden ? undefined : colorIdentityAriaLabel(value)} aria-hidden={ariaHidden ? 'true' : undefined}>
      {tokens.map((token) => (
        <ManaSymbol key={token} token={token} fallbackText={fallbackText} />
      ))}
    </span>
  );
}

export function ManaCostSymbols({ value, empty = '-', className = '' }: { value?: string | null; empty?: string; className?: string }) {
  const tokens = parseManaCostTokens(value ?? '');
  if (!tokens.length) {
    return <span className={`mana-cost-symbols empty ${className}`.trim()}>{empty}</span>;
  }
  return (
    <span className={`mana-symbol-set mana-cost-symbols ${className}`.trim()} title={value ?? ''} aria-label={`Mana cost ${value ?? ''}`}>
      {tokens.map((token, index) => (
        <ManaSymbol key={`${token}-${index}`} token={token} />
      ))}
    </span>
  );
}

export function ColorIdentitySymbols({ value, empty = '-', className = '' }: { value?: string | null; empty?: string; className?: string }) {
  const cleaned = cleanColorIdentity(value ?? '');
  if (!cleaned) {
    return <span className={`color-identity-symbols empty ${className}`.trim()}>{empty}</span>;
  }
  return (
    <span className={`color-identity-symbols ${className}`.trim()} title={`Color identity ${cleaned}`} aria-label={`Color identity ${cleaned}`}>
      <ManaSymbolSet value={cleaned} className="compact" />
    </span>
  );
}

export function ManaSymbolPreloader({ tokens = COLOR_SYMBOL_TOKENS }: { tokens?: string[] }) {
  const symbols = useMemo(() => [...new Set(tokens.map(normalizeManaSymbolToken).filter(Boolean))], [tokens]);
  useEffect(() => {
    preloadManaSymbols(symbols);
  }, [symbols]);
  return null;
}

export function preloadManaSymbols(tokens: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  for (const token of tokens) {
    const normalized = normalizeManaSymbolToken(token);
    const src = manaSymbolSrc(normalized);
    if (!src || preloadedManaSymbols.has(src)) {
      continue;
    }
    preloadedManaSymbols.add(src);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  }
}

export function manaSymbolSrc(token: string): string | undefined {
  const normalized = normalizeManaSymbolToken(token);
  return normalized ? `/api/mana-symbol?symbol=${encodeURIComponent(normalized)}` : undefined;
}

export function colorIdentityTokens(value: string): string[] {
  const cleaned = cleanColorIdentity(value || 'C');
  if (!cleaned) {
    return ['C'];
  }
  return cleaned.split('').filter(Boolean);
}

export function cleanColorIdentity(value: string): string {
  return [...new Set(value.toUpperCase().replace(/[^WUBRGC]/g, '').split('').filter(Boolean))].join('');
}

function normalizeManaSymbolToken(value: string): string {
  return value.trim().replace(/^\{/, '').replace(/\}$/, '').toLowerCase();
}

function colorIdentityAriaLabel(value: string): string {
  const cleaned = cleanColorIdentity(value || 'C') || 'C';
  return `Color identity ${cleaned}`;
}

if (typeof window !== 'undefined') {
  preloadManaSymbols(INITIAL_SYMBOL_TOKENS);
}
