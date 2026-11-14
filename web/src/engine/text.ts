// Beat text lookup with the one fallback order of contracts/I18N.md.
// Generated with Claude, SI-assisted.
import type { Beat, Lens, Locale } from "../contract";

type Dicts = Partial<Record<Locale, Record<string, string>>>;

/** 1 locale+lens, 2 en+lens, 3 locale+public, 4 en+public; else the public key itself. */
export function resolveText(dicts: Dicts, textKeys: Beat["text"], lens: Lens, locale: Locale): string {
  const lensKey = textKeys[lens] ?? textKeys.public; // a lens without a key skips to public
  return (
    dicts[locale]?.[lensKey] ??
    dicts.en?.[lensKey] ??
    dicts[locale]?.[textKeys.public] ??
    dicts.en?.[textKeys.public] ??
    textKeys.public
  );
}
