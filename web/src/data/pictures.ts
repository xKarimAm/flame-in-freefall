// NASA chapter photographs (R13): the typed record for data/pictures.json, curated
// against the NASA Image and Video Library. Nothing about a picture is typed here:
// every word and number comes from the file. Generated with Muse Spark, SI-assisted.
import { DATA_URL_BASE } from "./index";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(what: string): never {
  throw new Error(`invalid ${what}: not the contracted shape, refusing to guess`);
}

/** One curated photograph, matched to its chapter page by `chapter`. */
export interface ChapterPicture {
  id: string;
  /** the chapter page (story act) that shows this picture; chapter 4 has none */
  chapter: number;
  /** path under data/, e.g. "pictures/GRC-1998-C-00485.jpg" */
  file: string;
  /** word for word from NASA's record */
  caption: string;
  credit: string;
  url: string;
  alt: string;
  /** post-processing note, when the record carries one */
  edit?: string;
}

function parseOne(p: unknown): ChapterPicture {
  if (!isRecord(p)) fail("pictures.json");
  const str = (k: string): string => (typeof p[k] === "string" && (p[k] as string).length > 0 ? (p[k] as string) : fail("pictures.json"));
  if (typeof p["chapter"] !== "number" || typeof p["id"] !== "string") fail("pictures.json");
  const pic: ChapterPicture = {
    id: p["id"] as string,
    chapter: p["chapter"] as number,
    file: str("file"),
    caption: str("caption"),
    credit: str("credit"),
    url: str("url"),
    alt: str("alt"),
  };
  if (typeof p["edit"] === "string" && (p["edit"] as string).length > 0) pic.edit = p["edit"] as string;
  return pic;
}

export function parsePictures(json: unknown): ChapterPicture[] {
  if (!isRecord(json) || !Array.isArray(json["pictures"])) fail("pictures.json");
  return (json["pictures"] as unknown[]).map(parseOne);
}

/** Reads data/pictures.json; a missing or unreachable file means no pictures, never an error. */
export async function loadPictures(): Promise<ChapterPicture[]> {
  let json: unknown;
  try {
    const res = await fetch(`${DATA_URL_BASE}/pictures.json`);
    if (!res.ok) return [];
    json = (await res.json()) as unknown;
  } catch {
    return [];
  }
  return parsePictures(json);
}
