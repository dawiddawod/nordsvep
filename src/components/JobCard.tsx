"use client";

import { motion, type PanInfo } from "motion/react";
import { toneStyle, type Card } from "@/lib/tones";

export type Action = "save" | "skip";
// How a card leaves the carousel: dropped into the tray, or pushed out of view.
export type Exit = "save" | "away";
export type Slot = -1 | 0 | 1;

const variants = {
  exit: (exit: Exit) =>
    exit === "save"
      ? // The tray is stacked above the deck, so the card disappears behind its lip as if slipping into a pocket.
        { y: "75vh", scale: 0.4, zIndex: 3, transition: { duration: 0.45, ease: [0.5, 0, 0.75, 0] as const } }
      : { opacity: 0, transition: { duration: 0.2 } },
};

// A quick flick counts even when the card hasn't travelled far.
export function intentFor({ offset, velocity }: PanInfo): Action | null {
  const x = offset.x + velocity.x * 0.2;
  const y = offset.y + velocity.y * 0.2;
  if (y > 100 && y > Math.abs(x)) return "save";
  if (x > 120) return "save";
  if (x < -120) return "skip";
  return null;
}

type Props = {
  job: Card;
  slot: Slot;
  // Distance between slot centres: one card width plus the gap.
  step: number;
  onSwipe: (action: Action) => void;
  onIntent: (action: Action | null) => void;
  onRestore: () => void;
};

export function JobCard({ job, slot, step, onSwipe, onIntent, onRestore }: Props) {
  const isCurrent = slot === 0;

  return (
    <motion.article
      className={`absolute inset-0 overflow-hidden rounded-[22px] bg-linear-to-b from-(--tone-from) to-(--tone-to) px-6 pt-7 pb-6 select-none ${
        isCurrent ? "cursor-grab touch-none active:cursor-grabbing" : slot === -1 ? "cursor-pointer" : ""
      }`}
      style={{ ...toneStyle(job.tone), zIndex: isCurrent ? 2 : 1 }}
      initial={{ x: 2 * step }}
      animate={{ x: slot * step }}
      exit="exit"
      variants={variants}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      drag={isCurrent}
      dragSnapToOrigin
      onDrag={(_, info) => onIntent(intentFor(info))}
      onDragEnd={(_, info) => {
        onIntent(null);
        const action = intentFor(info);
        if (action) onSwipe(action);
      }}
      onClick={slot === -1 ? onRestore : undefined}
      aria-hidden={!isCurrent}
      title={slot === -1 ? "Bring back" : undefined}
    >
      {/* Long ads are cut off by the card; fade the last lines instead of slicing text mid-line. */}
      <div className="flex h-full flex-col gap-3 [mask-image:linear-gradient(to_bottom,#000_85%,transparent)]">
        <p className="text-[15px] font-bold text-(--tone-body)">{job.employer}</p>
        <h2 className="text-[26px] leading-[1.15] font-bold tracking-tight text-balance text-(--tone-title)">
          {job.headline}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {[job.location, job.hours, job.source && `via ${job.source}`]
            .filter((tag): tag is string => !!tag)
            .map((tag) => (
            <li
              key={tag}
              className="flex h-7 items-center rounded-full bg-(--tone-tag) px-3 text-[13px] whitespace-nowrap text-(--tone-title)"
            >
              {tag}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[15px] leading-[1.5] whitespace-pre-line text-(--tone-body)">{job.excerpt}</p>
      </div>
    </motion.article>
  );
}
