"use client";

import Image from "next/image";
import { useState, type Ref } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toneStyle, type Card } from "@/lib/tones";

// How many saved cards visibly stick up out of the pocket.
const POCKET_DEPTH = 4;
// Each older card sits this much higher, so every card shows an equal band of its top edge.
const POCKET_STEP = 8;

type TrayProps = {
  jobs: Card[];
  open: boolean;
  aiming: boolean;
  onToggle: () => void;
  ref: Ref<HTMLButtonElement>;
};

export function Tray({ jobs, open, aiming, onToggle, ref }: TrayProps) {
  const label = open
    ? "Tap to put your cards back"
    : aiming
      ? "Release to add to your deck"
      : "Swipe the card down to add to your deck";

  return (
    <motion.button
      ref={ref}
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`Your deck, ${jobs.length} saved`}
      animate={{ scale: aiming ? 1.03 : 1 }}
      className="relative z-40 h-[92px] w-[calc(100%-32px)] max-w-[369.643px] shrink-0"
    >
      <span className="absolute inset-0 overflow-clip rounded-[32.857px] bg-tray">
        <Image
          src="/figma/tray-recess.svg"
          alt=""
          width={369.643}
          height={64.0714}
          priority
          className="absolute top-0 left-0 w-full"
        />
      </span>
      <Pocket jobs={open ? [] : jobs.slice(0, POCKET_DEPTH)} />
      <Image
        src="/leather-sleeve.svg"
        alt=""
        width={369.643}
        height={92}
        priority
        className="pointer-events-none absolute inset-0 size-full"
      />
      <span className="absolute top-[8.21px] left-1/2 h-[36.143px] w-[31.214px] -translate-x-1/2 rounded-[8.214px] bg-tray-key">
        <Image src="/figma/deck-icon.svg" alt="" width={16.9214} height={20.7821} className="absolute top-[7.15px] left-[7.15px]" />
      </span>
      <span className="absolute top-[44.36px] left-1/2 w-[307.214px] -translate-x-1/2 text-center text-[14px] leading-[1.1] text-tray-text">
        {label}
      </span>
    </motion.button>
  );
}

// Space above the tray where tucked cards stick out.
const POCKET_HEADROOM = 24;

// Saved cards tucked into the tray. The mask is the area above the tray plus the recess shape itself,
// so cards show over the dark recess but disappear behind the light grey front of the tray.
const pocketMask = {
  maskImage: "linear-gradient(#000, #000), url(/figma/tray-recess.svg)",
  maskSize: `100% ${POCKET_HEADROOM}px, 100% 64.0714px`,
  maskPosition: `0 0, 0 ${POCKET_HEADROOM}px`,
  maskRepeat: "no-repeat",
};

function Pocket({ jobs }: { jobs: Card[] }) {
  return (
    <span
      className="pointer-events-none absolute inset-x-0"
      style={{ ...pocketMask, top: -POCKET_HEADROOM, height: POCKET_HEADROOM + 64.0714 }}
    >
      <AnimatePresence>
        {jobs.map((job, i) => (
          <motion.span
            key={job.id}
            style={{ ...toneStyle(job.tone), zIndex: POCKET_DEPTH - i }}
            // Newest card sits lowest and in front, just inside the tray; older ones step up behind it.
            initial={{ y: -90 }}
            animate={{ y: POCKET_HEADROOM + 10 - i * POCKET_STEP }}
            exit={{ y: -90 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, delay: i === 0 ? 0.3 : 0 }}
            // Flat colour with a hairline edge, like laminated cards, instead of a drop shadow.
            className="absolute inset-x-0 top-0 h-[90px] rounded-t-[32.857px] bg-(--tone-from) shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_-1px_0_rgba(0,0,0,0.12)]"
          />
        ))}
      </AnimatePresence>
    </span>
  );
}

type WalletProps = {
  jobs: Card[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
};

// Saved cards rise out of the tray and stack like cards in a wallet; tap one to fan it open.
export function Wallet({ jobs, open, onClose, onRemove }: WalletProps) {
  const [selected, setSelected] = useState<string | null>(null);
  // Newest save sits at the front of the stack, closest to the tray.
  const stack = [...jobs].reverse();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-30 flex flex-col justify-end bg-bg/90 px-5 pb-[115px] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.15 } }}
          onClick={onClose}
        >
          {jobs.length === 0 ? (
            <p className="pb-6 text-center text-[15px] text-chip-text">Your deck is empty. Swipe a card down to save it.</p>
          ) : (
            <ul className="flex max-h-full flex-col overflow-y-auto pt-16">
              {stack.map((job, i) => {
                const isOpen = selected === job.id;
                const afterOpen = i > 0 && selected === stack[i - 1].id;
                return (
                  <motion.li
                    key={job.id}
                    layout
                    style={toneStyle(job.tone)}
                    initial={{ y: 400, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 400, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 30, delay: (stack.length - i) * 0.03 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(isOpen ? null : job.id);
                      // An opened card grows past the bottom of the wallet; bring its actions into view once it has.
                      const card = e.currentTarget;
                      if (!isOpen) setTimeout(() => card.scrollIntoView({ block: "nearest", behavior: "smooth" }), 350);
                    }}
                    className={`shrink-0 cursor-pointer rounded-[22px] bg-(--tone-from) p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_-1px_0_rgba(0,0,0,0.12)] ${
                      i === 0 ? "" : afterOpen ? "mt-3" : "-mt-[82px]"
                    } ${isOpen ? "" : "h-[150px]"}`}
                  >
                    <p className="truncate text-[13px] font-bold text-(--tone-body)">
                      {job.employer}
                      {job.location && ` · ${job.location}`}
                    </p>
                    <h3 className="mt-1 truncate text-[19px] leading-[1.2] font-bold text-(--tone-title)">{job.headline}</h3>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <p className="mt-3 line-clamp-6 text-[15px] leading-[1.5] whitespace-pre-line text-(--tone-body)">
                          {job.excerpt}
                        </p>
                        <div className="mt-5 flex items-center gap-2 text-[15px]">
                          <a
                            href={job.applyUrl ?? job.adUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full bg-chip-active px-5 py-2.5 font-bold text-bg"
                          >
                            Apply ↗
                          </a>
                          <a
                            href={job.adUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full bg-(--tone-tag) px-5 py-2.5 text-(--tone-title)"
                          >
                            {job.source ? `On ${job.source}` : "Full ad"}
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(job.id);
                            }}
                            className="ml-auto px-2 py-2.5 text-(--tone-title)"
                          >
                            Remove
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
