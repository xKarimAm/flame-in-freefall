# Drafts web/src/i18n/<locale>.json from en.json with Meta Muse Spark (T13). Generated with Claude, SI-assisted.
# Usage: python scripts/translate.py es hi        (reads META_API_KEY from .env; never prints it)
# Scope per contracts/I18N.md: UI chrome (ui.*) and headlines (story.<id>.title / .question).
# Beat text stays English and falls back key by key. Translations are AI-drafted (README says so);
# the model and time are written to <locale>.meta.json.
import json, re, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
I18N = ROOT / "web" / "src" / "i18n"
MODEL = "muse-spark-1.3-contributor"
URL = "https://api.meta.ai/v1/chat/completions"
NAMES = {"es": "Spanish", "hi": "Hindi", "ar": "Arabic"}
HEADLINE = re.compile(r"^story\.[a-z0-9-]+\.(title|question)$")
PLACEHOLDER = re.compile(r"\{[a-z_]+\}")


def api_key() -> str:
    import os
    if os.environ.get("META_API_KEY"):
        return os.environ["META_API_KEY"]
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("META_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("META_API_KEY is not in .env")


def translate(locale: str, source: dict[str, str]) -> dict[str, str]:
    prompt = (
        f"Translate the values of this JSON object from English to {NAMES[locale]} for a public science web page "
        "about NASA fire experiments. Plain words a school student understands. Return ONLY a JSON object with "
        "exactly the same keys. Keep every {placeholder} unchanged. Do not translate: Firebreak, NASA, PSI, ISS, "
        "kPa, investigation acronyms, 'AI summary' stays a clear label in the target language. Keep numbers and units as they are.\n\n"
        + json.dumps(source, ensure_ascii=False, indent=1)
    )
    body = json.dumps({"model": MODEL, "max_tokens": 16000, "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(URL, body, {"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        text = json.load(r)["choices"][0]["message"]["content"] or ""
    out = json.loads(text[text.index("{") : text.rindex("}") + 1])
    # a key the model dropped, added or broke falls back to English at run time (I18N.md), so drop it here
    good = {}
    for k, en in source.items():
        v = out.get(k)
        if isinstance(v, str) and v.strip() and sorted(PLACEHOLDER.findall(v)) == sorted(PLACEHOLDER.findall(en)):
            good[k] = v
        else:
            print(f"  {locale}: kept English for {k}")
    return good


def main() -> None:
    en = json.loads((I18N / "en.json").read_text(encoding="utf-8"))
    source = {k: v for k, v in en.items() if k.startswith("ui.") or HEADLINE.match(k)}
    for locale in sys.argv[1:]:
        done = translate(locale, source)
        (I18N / f"{locale}.json").write_text(json.dumps(done, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        meta = {"model": MODEL, "made_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "source": "en.json", "keys": len(done)}
        (I18N / f"{locale}.meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        print(f"{locale}: {len(done)} of {len(source)} keys")


if __name__ == "__main__":
    if not sys.argv[1:] or any(a not in NAMES for a in sys.argv[1:]):
        sys.exit(f"usage: translate.py {' '.join(NAMES)}")
    main()
