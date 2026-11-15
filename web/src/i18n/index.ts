// Generated with Muse Spark, SI-assisted.
// Dictionaries and chrome text (contracts/I18N.md). en is the source of truth.
import type { Locale } from "../contract";

const files = import.meta.glob("./*.json", { eager: true, import: "default" }) as Record<string, Record<string, string>>;

/** Every <locale>.json in this folder (<locale>.meta.json excluded); en is complete, the rest fall back to it. */
export const dicts: Partial<Record<Locale, Record<string, string>>> = {};
for (const [path, dict] of Object.entries(files)) {
  const locale = path.replace(/^\.\//, "").replace(/\.json$/, "");
  if (/^[a-z]{2}$/.test(locale)) dicts[locale as Locale] = dict;
}

/** Chrome text: current locale, then en, then the key itself. {name} placeholders are replaced from vars. */
export function makeT(locale: () => Locale) {
  return (key: string, vars: Record<string, string | number> = {}): string => {
    const text = dicts[locale()]?.[key] ?? dicts.en?.[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
  };
}

export function mount(): void {
  // nothing to mount yet: dictionaries are static imports
}
