// Dictionaries and chrome text (contracts/I18N.md). en is the source of truth.
// Skeleton by the orchestrator; coder E owns this folder from task T13.
// Generated with Claude, SI-assisted.
import type { Locale } from "../contract";
import en from "./en.json";

export const dicts: Partial<Record<Locale, Record<string, string>>> = { en };

/** Chrome text: current locale, then en, then the key itself. {name} placeholders come from vars. */
export function makeT(locale: () => Locale) {
  return (key: string, vars: Record<string, string | number> = {}): string => {
    const text = dicts[locale()]?.[key] ?? dicts.en?.[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
  };
}

export function mount(): void {
  // nothing to mount yet: dictionaries are static imports
}
