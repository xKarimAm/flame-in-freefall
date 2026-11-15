// Generated with Claude, SI-assisted
import Ajv2020 from "ajv/dist/2020";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Story } from "../contract";
import { flattenBeats, stories } from "./stories";

const here = import.meta.dirname;
const storiesDir = join(here, "../../../stories");
const files = readdirSync(storiesDir).filter((f) => f.endsWith(".json")).sort();
const raw = files.map((f) => JSON.parse(readFileSync(join(storiesDir, f), "utf8")) as Story);
const schema = JSON.parse(readFileSync(join(here, "../../../contracts/story.schema.json"), "utf8"));
const en = JSON.parse(readFileSync(join(here, "../i18n/en.json"), "utf8")) as Record<string, string>;

describe("stories/*.json", () => {
  it("has the moon-air story, and the loader sees every file", () => {
    expect(raw.map((s) => s.id)).toContain("moon-air");
    expect(stories.map((s) => s.id).sort()).toEqual(raw.map((s) => s.id).sort());
  });

  it("validates against contracts/story.schema.json", () => {
    const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
    files.forEach((f, i) => {
      expect(validate(raw[i]), `${f}: ${JSON.stringify(validate.errors)}`).toBe(true);
    });
  });

  it("has unique beat ids within each scene", () => {
    for (const story of raw)
      for (const scene of story.scenes) {
        const ids = scene.beats.map((b) => b.id);
        expect(new Set(ids).size, `${story.id}/${scene.id}`).toBe(ids.length);
      }
  });

  it("every beat carries at least one source: a page with no source link is a bug", () => {
    for (const story of raw)
      for (const scene of story.scenes)
        for (const beat of scene.beats)
          expect(beat.sources.length, `${story.id}/${scene.id}/${beat.id}`).toBeGreaterThan(0);
  });

  it("uses only keys that exist in en.json, and every beat has an en public string", () => {
    for (const story of raw) {
      expect(en[story.title_key], story.title_key).toBeTypeOf("string");
      for (const scene of story.scenes)
        for (const beat of scene.beats) {
          expect(en[beat.text.public], beat.text.public).toBeTruthy();
          for (const key of Object.values(beat.text)) expect(en[key], key).toBeTypeOf("string");
          for (const a of beat.stage.annotation ?? []) expect(en[a.text_key], a.text_key).toBeTypeOf("string");
        }
    }
  });
});

describe("flattenBeats", () => {
  it("follows the file order", () => {
    const expected = raw.flatMap((s) => s.scenes.flatMap((sc) => sc.beats.map((b) => `${s.id}/${sc.id}/${b.id}`)));
    const got = flattenBeats(raw).map((f) => `${f.story.id}/${f.scene.id}/${f.beat.id}`);
    expect(got).toEqual(expected);
    expect(flattenBeats(raw).map((f) => f.index)).toEqual(expected.map((_, i) => i));
  });

  it("keeps story, scene and beat order across stories", () => {
    const beat = (id: string) => ({ id, kind: "hook" as const, stage: { view: "empty" as const }, text: { public: id }, sources: [] });
    const a: Story = { id: "a", act: 1, title_key: "a", scenes: [{ id: "s1", beats: [beat("x"), beat("y")] }, { id: "s2", beats: [beat("z")] }] };
    const b: Story = { id: "b", act: 2, title_key: "b", scenes: [{ id: "s1", beats: [beat("x")] }] };
    expect(flattenBeats([a, b]).map((f) => `${f.story.id}/${f.scene.id}/${f.beat.id}`)).toEqual(["a/s1/x", "a/s1/y", "a/s2/z", "b/s1/x"]);
  });
});
