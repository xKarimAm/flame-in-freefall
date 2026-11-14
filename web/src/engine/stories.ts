// Loads every story in stories/ and flattens them into one ordered beat list.
// Generated with Claude, SI-assisted.
import type { Beat, Scene, Story } from "../contract";

const files = import.meta.glob("../../../stories/*.json", { eager: true, import: "default" }) as Record<string, Story>;

/** Act order, then id. */
export const stories: Story[] = Object.values(files).sort((a, b) => a.act - b.act || a.id.localeCompare(b.id));

export interface FlatBeat {
  story: Story;
  scene: Scene;
  beat: Beat;
  index: number;
}

/** Every beat in reading order (story, scene, beat), with its position in the whole list. */
export function flattenBeats(list: Story[]): FlatBeat[] {
  const out: FlatBeat[] = [];
  for (const story of list)
    for (const scene of story.scenes) for (const beat of scene.beats) out.push({ story, scene, beat, index: out.length });
  return out;
}
