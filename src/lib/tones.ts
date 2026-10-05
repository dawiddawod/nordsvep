import type { CSSProperties } from "react";
import type { Job } from "./jobtech";

// Each tone follows the Figma card recipe: a top-to-bottom gradient, a darker tag fill and pale text tinted to match.
// The first one is the original Figma blue.
const TONES = [
  ["#3586fa", "#2b60ad", "#245d9f", "#c8dbf3", "#c1d8f1"],
  ["#f2694e", "#b4412d", "#9a3525", "#fde1d9", "#f9d4ca"],
  ["#2fb985", "#1d7a56", "#176848", "#d3f5e7", "#c5eedc"],
  ["#9b6bf7", "#6840bd", "#57349f", "#e8defd", "#dcd0fb"],
  ["#eea12b", "#b06f17", "#955c11", "#fdeccd", "#fae2b9"],
  ["#ee5c97", "#ae3a6b", "#932f5a", "#fddbe8", "#fbcfe0"],
  ["#22b4cb", "#167d8c", "#106875", "#d2f2f7", "#c3edf3"],
];

export type Card = Job & { tone: number };

export const TONE_COUNT = TONES.length;

// Exposed as CSS variables so components style with `bg-(--tone-tag)` etc. instead of per-tone classes.
export function toneStyle(tone = 0): CSSProperties {
  const [from, to, tag, title, body] = TONES[tone % TONES.length];
  return {
    "--tone-from": from,
    "--tone-to": to,
    "--tone-tag": tag,
    "--tone-title": title,
    "--tone-body": body,
  } as CSSProperties;
}
