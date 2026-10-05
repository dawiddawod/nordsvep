"use client";

import Image from "next/image";
import { AnimatePresence, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Job, Option } from "@/lib/jobtech";
import { TONE_COUNT, type Card } from "@/lib/tones";
import { JobCard, type Action, type Exit, type Slot } from "./JobCard";
import { Tray, Wallet } from "./DeckTray";

type Filters = { field?: string; q?: string };
type Status = "loading" | "idle" | "done" | "error";

// Fetch the next page while a few cards remain, so the deck never visibly runs dry.
const REFILL_AT = 5;
const CARD_GAP = 11.456;

// Swipe history lives in the browser until we add accounts.
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(`nordswipe:${key}`) ?? "") as T;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  localStorage.setItem(`nordswipe:${key}`, JSON.stringify(value));
}

export function SwipeApp({ fields }: { fields: Option[] }) {
  const [filters, setFilters] = useState<Filters>({});
  const [deck, setDeck] = useState<Card[]>([]);
  const [previous, setPrevious] = useState<Card | null>(null);
  const [saved, setSaved] = useState<Card[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [exit, setExit] = useState<Exit>("away");
  const [intent, setIntent] = useState<Action | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [step, setStep] = useState(362 + CARD_GAP);
  const [tray, animateTray] = useAnimate<HTMLButtonElement>();

  const stage = useRef<HTMLElement>(null);
  const seen = useRef(new Set<string>());
  const cursor = useRef({ page: 0, hasMore: true });
  const busy = useRef(false);
  // Cards get colours in sequence, so neighbours in the carousel never share one.
  const nextTone = useRef(0);
  // Bumped on every filter change so responses for the old filters are dropped.
  const generation = useRef(0);

  async function fetchMore(f: Filters, reset = false) {
    if (reset) {
      generation.current++;
      cursor.current = { page: 0, hasMore: true };
      busy.current = false;
      setDeck([]);
      setPrevious(null);
    }
    if (busy.current) return;
    const gen = generation.current;
    busy.current = true;
    setStatus("loading");

    try {
      let fresh: Job[] = [];
      // Keep paging until we find ads the user hasn't swiped yet.
      while (fresh.length === 0 && cursor.current.hasMore) {
        const params = new URLSearchParams({ page: String(cursor.current.page) });
        if (f.field) params.set("field", f.field);
        if (f.q) params.set("q", f.q);
        const res = await fetch(`/api/jobs?${params}`);
        if (!res.ok) throw new Error(`Jobs request failed: ${res.status}`);
        const data: { hasMore: boolean; jobs: Job[] } = await res.json();
        if (gen !== generation.current) return;

        cursor.current = { page: cursor.current.page + 1, hasMore: data.hasMore && data.jobs.length > 0 };
        fresh = data.jobs.filter((j) => !seen.current.has(j.id));
      }
      setDeck((d) => [
        ...d,
        ...fresh
          .filter((j) => !d.some((x) => x.id === j.id))
          .map((j) => ({ ...j, tone: nextTone.current++ % TONE_COUNT })),
      ]);
      setStatus(cursor.current.hasMore ? "idle" : "done");
    } catch {
      if (gen === generation.current) setStatus("error");
    } finally {
      if (gen === generation.current) busy.current = false;
    }
  }

  useEffect(() => {
    seen.current = new Set(read<string[]>("seen", []));
    const storedFilters = read<Filters>("filters", {});
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage only exists after mount */
    setSaved(read<Card[]>("saved", []));
    setFilters(storedFilters);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchMore(storedFilters, true);
  }, []);

  // Peeking neighbours sit exactly one card width (plus gap) to each side, so track the card's real width.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setStep(el.offsetWidth + CARD_GAP));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function changeFilter(patch: Filters) {
    const next = { ...filters, ...patch };
    setFilters(next);
    write("filters", next);
    fetchMore(next, true);
  }

  function swipe(action: Action) {
    const [top, ...rest] = deck;
    if (!top) return;
    seen.current.add(top.id);
    write("seen", [...seen.current].slice(-5000));
    if (action === "save") {
      setExit("save");
      const next = [top, ...saved];
      setSaved(next);
      write("saved", next);
      // Nudge the tray as the card lands in it.
      animateTray(tray.current, { y: [0, 6, 0] }, { duration: 0.35, delay: 0.3 });
    } else {
      setExit("away");
      setPrevious(top);
    }
    setDeck(rest);
    if (rest.length < REFILL_AT && status === "idle") fetchMore(filters);
  }

  function restorePrevious() {
    if (!previous) return;
    seen.current.delete(previous.id);
    write("seen", [...seen.current]);
    setExit("away");
    setDeck((d) => [previous, ...d]);
    setPrevious(null);
  }

  function unsave(id: string) {
    const next = saved.filter((j) => j.id !== id);
    setSaved(next);
    write("saved", next);
  }

  function resetHistory() {
    seen.current.clear();
    write("seen", []);
    fetchMore(filters, true);
  }

  useEffect(() => {
    if (walletOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") swipe("save");
      if (e.key === "ArrowLeft") swipe("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cards: { job: Card; slot: Slot }[] = [];
  if (previous) cards.push({ job: previous, slot: -1 });
  if (deck[0]) cards.push({ job: deck[0], slot: 0 });
  if (deck[1]) cards.push({ job: deck[1], slot: 1 });

  return (
    <main className="relative mx-auto flex h-dvh w-full max-w-[402px] flex-col items-center gap-[10px] overflow-hidden pt-[15px] pb-[15px]">
      <header className="w-full pb-2">
        <h1 className="text-center text-[22px] leading-[1.1] font-bold text-title">NordSvep</h1>
        <nav className="mt-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          <Chip active={searchOpen || !!filters.q} onClick={() => setSearchOpen(!searchOpen)} label="Search">
            <Image src="/figma/search.svg" alt="" width={14} height={14} />
          </Chip>
          <Chip active={!filters.field} onClick={() => changeFilter({ field: undefined })}>
            All
          </Chip>
          {fields.map((f) => (
            <Chip key={f.id} active={filters.field === f.id} onClick={() => changeFilter({ field: f.id })}>
              {f.label}
            </Chip>
          ))}
        </nav>
        {searchOpen && (
          <form
            className="mt-2 px-4"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q")?.toString().trim();
              changeFilter({ q: q || undefined });
            }}
          >
            <input
              name="q"
              type="search"
              defaultValue={filters.q}
              autoFocus
              placeholder="Job title, employer or place"
              className="h-11 w-full rounded-[10px] bg-chip px-4 text-base text-title placeholder:text-chip-text"
            />
          </form>
        )}
      </header>

      <section ref={stage} className="relative w-[calc(100%-40px)] max-w-[362px] flex-1" aria-live="polite">
        <AnimatePresence custom={exit}>
          {cards.map(({ job, slot }) => (
            <JobCard
              key={job.id}
              job={job}
              slot={slot}
              step={step}
              onSwipe={swipe}
              onIntent={setIntent}
              onRestore={restorePrevious}
            />
          ))}
        </AnimatePresence>
        {deck.length === 0 && (
          <EmptyState status={status} onRetry={() => fetchMore(filters, true)} onReset={resetHistory} />
        )}
      </section>

      <Wallet jobs={saved} open={walletOpen} onClose={() => setWalletOpen(false)} onRemove={unsave} />
      <Tray
        ref={tray}
        jobs={saved}
        open={walletOpen}
        aiming={intent === "save"}
        onToggle={() => setWalletOpen(!walletOpen)}
      />
    </main>
  );
}

function Chip({
  active,
  label,
  ...props
}: { active: boolean; label?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 min-w-11 shrink-0 items-center justify-center rounded-[10px] px-3.5 text-[14px] whitespace-nowrap ${
        active ? "bg-chip-active font-bold text-bg" : "bg-chip text-chip-text"
      }`}
      {...props}
    />
  );
}

function EmptyState({
  status,
  onRetry,
  onReset,
}: {
  status: Status;
  onRetry: () => void;
  onReset: () => void;
}) {
  const content = {
    loading: { text: "Finding jobs…", action: null },
    idle: { text: "Finding jobs…", action: null },
    error: { text: "Couldn't reach Platsbanken.", action: { label: "Try again", run: onRetry } },
    done: {
      text: "You've seen every ad for these filters.",
      action: { label: "Show skipped ads again", run: onReset },
    },
  }[status];

  return (
    <div className="absolute inset-0 grid place-items-center rounded-[22px] border border-dashed border-chip text-center text-[15px]">
      <div>
        <p className="text-chip-text">{content.text}</p>
        {content.action && (
          <button onClick={content.action.run} className="mt-3 text-title underline underline-offset-4">
            {content.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
