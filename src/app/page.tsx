"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Calendar,
  Send,
  TimerReset,
  Sparkles,
  Gamepad2,
  Clock,
  Globe2,
  ListChecks,
  Lock,
} from "lucide-react";

// Little Love Hub — Pro LDR edition (polished, animated)
// Built by Farhan for Nabila 💖

// -----------------------------
// Constants & Pure Helpers (testable)
// -----------------------------
const schedules = {
  Farhan: {
    Monday: [
      { start: "16:00", end: "18:00", label: "COMP2511" },
      { start: "18:00", end: "20:00", label: "COMP6080" },
    ],
    Tuesday: [
      { start: "18:00", end: "20:00", label: "COMP3900" },
    ],
    Thursday: [
      { start: "14:00", end: "16:00", label: "COMP2511" },
      { start: "18:00", end: "20:00", label: "COMP6080" },
    ],
    Friday: [
      { start: "12:00", end: "13:00", label: "COMP2511" },
      { start: "13:00", end: "15:00", label: "COMP2511" },
      { start: "15:00", end: "17:00", label: "COMP3900" },
      { start: "17:00", end: "18:00", label: "COMP6080" },
    ],
  },
  Nabila: {
    Tuesday: [
      { start: "11:00", end: "13:00", label: "RSM43" },
      { start: "14:00", end: "15:00", label: "AST101" },
      { start: "15:00", end: "17:00", label: "CSC108" },
    ],
    Thursday: [
      { start: "14:00", end: "15:00", label: "AST101" },
      { start: "15:00", end: "16:00", label: "CSC108" },
    ],
    Friday: [
      { start: "09:00", end: "11:00", label: "RSM43" },
    ],
  }
} as const;

const accent = {
  rose: {
    grad: [
      "from-rose-200/80 via-rose-100/60 to-white/60",
      "from-pink-200/80 via-rose-100/60 to-white/60",
      "from-rose-300/70 via-pink-200/50 to-white/60",
      "from-pink-300/70 via-rose-200/50 to-white/60",
    ],
  },
};

const cuteGradients = accent.rose.grad;

export const DEFAULT_LETTER = `Dear you,

I’m proud of us. Even when miles apart, you’re always my safe place. I can’t wait to hold your hand again.

With love,
— me`;

export function tzDiffHours(a: string, b: string) {
  try {
    const d = new Date();
    const aOffset = -new Date(d.toLocaleString("en-US", { timeZone: a })).getTimezoneOffset();
    const bOffset = -new Date(d.toLocaleString("en-US", { timeZone: b })).getTimezoneOffset();
    return (bOffset - aOffset) / 60;
  } catch {
    return 0;
  }
}

export function countdownDiff(target: Date, now: Date) {
  const t = target.getTime();
  if (Number.isNaN(t)) return null;
  const ms = Math.max(0, t - now.getTime());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return { days, hours, mins, secs };
}

// --- Deck + Time helpers used across features ---
export function makeMemoryDeck(emojis: string[]) {
  return [...emojis, ...emojis]
    .map((e, i) => ({ id: i + Math.random(), emoji: e, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5);
}

export function buildPhotoDeck(urls: string[]) {
  const unique = Array.from(new Set(urls)).slice(0, 8);
  const pairs = [...unique, ...unique].map((url, i) => ({ id: i + Math.random(), url, flipped: false as boolean, matched: false as boolean }));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

export function timeAt(t: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: tz }).formatToParts(t);
  const h = Number(parts.find(p => p.type === "hour")?.value || 0);
  const m = Number(parts.find(p => p.type === "minute")?.value || 0);
  return { h, m, minutes: h * 60 + m };
}

export function isAwake(t: Date, tz: string, start = 8, end = 24) {
  const { h } = timeAt(t, tz);
  return h >= start && h < end;
}

export function computeOverlapTimeline(base: Date, tzA: string, tzB: string, stepMin = 15) {
  const items: { idx: number; when: Date; aAwake: boolean; bAwake: boolean; both: boolean }[] = [];
  const start = new Date(base.getTime());
  start.setSeconds(0, 0);
  for (let i = 0; i < Math.floor(1440 / stepMin); i++) {
    const when = new Date(start.getTime() + i * stepMin * 60000);
    const aAwake = isAwake(when, tzA);
    const bAwake = isAwake(when, tzB);
    items.push({ idx: i, when, aAwake, bAwake, both: aAwake && bAwake });
  }
  return items;
}

export function findNextGoodWindow(base: Date, tzA: string, tzB: string, minMinutes = 30) {
  const timeline = computeOverlapTimeline(base, tzA, tzB, 15);
  let startIdx = -1;
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].both) {
      if (startIdx === -1) startIdx = i;
    } else if (startIdx !== -1) {
      const len = (i - startIdx) * 15;
      if (len >= minMinutes) {
        const start = new Date(timeline[startIdx].when);
        const end = new Date(timeline[i - 1].when.getTime() + 15 * 60000);
        return { start, end };
      }
      startIdx = -1;
    }
  }
  if (startIdx !== -1) {
    const len = (timeline.length - startIdx) * 15;
    if (len >= minMinutes) {
      const start = new Date(timeline[startIdx].when);
      const end = new Date(timeline[timeline.length - 1].when.getTime() + 15 * 60000);
      return { start, end };
    }
  }
  return null;
}

// -----------------------------
// Hooks & UI Primitives
// -----------------------------
function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20%" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`rounded-3xl shadow-[0_10px_40px_-10px_rgba(2,6,23,0.15)] bg-white/85 backdrop-blur-xl p-6 border border-white/60 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// -----------------
// Hero with Big Countdown (fixed date)
// -----------------
function Hero() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % cuteGradients.length), 6000);
    return () => clearInterval(t);
  }, []);

  // Fixed: 10 Jan 2026, Sydney time (UTC+11)
  const targetISO = "2026-01-10T00:00:00+11:00";
  const targetDate = useMemo(() => new Date(targetISO), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = useMemo(() => countdownDiff(targetDate, now), [targetDate, now]);
  const isPast = now.getTime() >= targetDate.getTime();
  const fixedLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(targetDate);

  return (
    <div
      className={`relative overflow-hidden rounded-[32px] px-6 md:px-10 py-12 md:py-16 bg-gradient-to-br ${cuteGradients[idx]} text-slate-900`}
    >
      {/* live wallpaper overlay */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(40% 60% at 20% 20%, rgba(244,114,182,0.35), transparent), radial-gradient(40% 60% at 80% 30%, rgba(253,164,175,0.35), transparent), radial-gradient(50% 70% at 50% 80%, rgba(216,180,254,0.3), transparent)",
        }}
        animate={{ backgroundPosition: ["0% 0%", "100% 50%", "0% 0%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2 text-sm mb-3 opacity-90">
          <Sparkles size={18} /> <span>Little Love Hub</span>
        </div>
        <h1 className="text-center text-4xl md:text-6xl font-extrabold tracking-tight">
          Long-Distance, Big Love
        </h1>
        <p className="mt-3 text-center text-base md:text-lg opacity-90">
          A crafted space for us — countdown, time zones, capsule notes & games.
        </p>

        <motion.div
          className="mt-8 md:mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl p-4 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="flex items-center justify-between">
              <div className="text-sm md:text-base font-medium text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Next time we hug
              </div>
              <div />
            </div>
            {!isPast ? (
              <>
                <div className="mt-5 grid grid-cols-4 gap-2 md:gap-3 text-center">
                  {diff ? (
                    [
                      { label: "Days", v: diff.days },
                      { label: "Hours", v: diff.hours },
                      { label: "Minutes", v: diff.mins },
                      { label: "Seconds", v: diff.secs },
                    ].map((b) => (
                      <motion.div
                        key={b.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl p-3 md:p-5 bg-white/70 border border-white/70"
                      >
                        {/* Hydration-safe countdown number */}
                        <div
                          suppressHydrationWarning
                          className="text-4xl md:text-6xl lg:text-7xl font-black tabular-nums tracking-tight"
                        >
                          {String(b.v).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] md:text-xs tracking-wide uppercase text-slate-700 mt-1">
                          {b.label}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-4 text-slate-800 text-sm md:text-base">
                      Countdown starting…
                    </div>
                  )}
                </div>
                <div className="mt-3 text-center text-xs md:text-sm text-slate-700">
                  {fixedLabel}
                </div>
              </>
            ) : (
              <div className="mt-6 text-center">
                <div className="text-2xl md:text-3xl font-bold text-rose-600">
                  It’s hug time 💖
                </div>
                <div className="mt-1 text-xs md:text-sm text-slate-700">
                  {fixedLabel}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Soft floating lights */}
      <motion.div
        className="absolute -top-16 -right-20 w-72 h-72 rounded-full bg-white/30 blur-3xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-24 -left-10 w-96 h-96 rounded-full bg-white/25 blur-3xl"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
    </div>
  );
}

// -----------------
// Placeholders for gallery & memory game
// -----------------
const placeholders = [
  "/photos/OG1.jpg",
  "/photos/OG2.jpg",
  "/photos/OG3.jpg",
  "/photos/OG4.jpg",
  "/photos/OG5.jpg",
  "/photos/OG6.jpg",
  "/photos/OG7.jpg",
  "/photos/OG8.jpg",
];

// -----------------
// Photo Gallery (square slideshow)
// -----------------
function PhotoGallery() {
  const imgs = placeholders;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % imgs.length), 2800);
    return () => clearInterval(t);
  }, [imgs.length]);

  return (
    <Card className="relative overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><ListChecks className="w-5 h-5"/> Our gallery</h2>
      <div className="mt-3 aspect-square w-full rounded-2xl overflow-hidden relative border bg-white">
        {/* current slide */}
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={idx}
            src={imgs[idx]}
            alt="gallery"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5 }}
          />
        </AnimatePresence>
      </div>
      {/* dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        {imgs.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-2.5 w-2.5 rounded-full border ${i === idx ? "bg-rose-500 border-rose-500" : "bg-white border-slate-200"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-2">Square slideshow that cycles automatically. Tap dots to jump.</p>
    </Card>
  );
}

// -----------------
// Love Notes (auto-expire after 24h)
// -----------------
function Notes() {
  type Note = { id: number; text: string; ts: number };
  const [notes, setNotes] = usePersistentState<Note[]>("ldr_notes_24h", []);
  const [text, setText] = useState("");

  useEffect(() => {
    function purge() {
      const cutoff = Date.now() - 24 * 3600 * 1000;
      setNotes((prev) => prev.filter((n) => n.ts >= cutoff));
    }
    purge();
    const t = setInterval(purge, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [setNotes]);

  function add() { if (!text.trim()) return; setNotes([{ id: Date.now(), text: text.trim(), ts: Date.now() }, ...notes]); setText(""); }
  function remove(id: number) { setNotes(notes.filter((n) => n.id !== id)); }
  function timeLeft(ts: number) { const ms = (ts + 24 * 3600 * 1000) - Date.now(); const h = Math.max(0, Math.floor(ms / 3600000)); return h; }

  return (
    <Card>
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Send className="w-5 h-5"/> Love notes</h2>
      <div className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write something sweet…" className="flex-1 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 ring-rose-300"/>
        <button onClick={add} className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600">Add</button>
      </div>
      <ul className="mt-4 grid gap-2">
        {notes.length === 0 && <div className="text-sm text-slate-500">No notes yet. Leave her a sweet message ✨</div>}
        {notes.map((n) => (
          <li key={n.id} className="flex items-start gap-3 p-3 rounded-2xl border bg-white">
            <Heart className="w-4 h-4 text-rose-500 mt-1"/>
            <div className="flex-1 text-sm text-slate-700">{n.text}</div>
            <div className="text-[10px] text-slate-500 mr-2">~{timeLeft(n.ts)}h</div>
            <button onClick={() => remove(n.id)} className="text-xs px-2 py-1 rounded-lg border bg-white hover:bg-rose-50">Delete</button>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate-500 mt-2">Notes auto‑delete 24 hours after you post them. Saved only on this device.</p>
    </Card>
  );
}

// -----------------
// Time Capsule (strict rules + history view)
// -----------------
function TimeCapsule() {
  const [map, setMap] = usePersistentState<Record<string, string>>("ldr_capsule_map", {});

  // helpers
  const pad = (n: number) => String(n).padStart(2, "0");
  const toISODateLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISODateLocal = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const today = new Date();
  const todayISO = toISODateLocal(today);

  const [dateISO, setDateISO] = useState<string>(() => todayISO);
  const [mode, setMode] = useState<"view" | "make" | "history">("view");
  const [text, setText] = useState("");

  // derived
  const sel = parseISODateLocal(dateISO);
  const nowDay = parseISODateLocal(todayISO);
  const daysUntil = Math.floor((sel.getTime() - nowDay.getTime()) / 86400000);

  const canView = daysUntil === 0;
  const canEdit = daysUntil >= 7;
  const lockedFuture = daysUntil > 0;
  const past = daysUntil < 0;

  useEffect(() => {
    setText(map[dateISO] || "");
  }, [dateISO, map]);

  function save() {
    if (!canEdit) return;
    const next = { ...map };
    if (text.trim()) next[dateISO] = text.trim();
    else delete next[dateISO];
    setMap(next);
    setMode("view");
  }

  const revealMsg = lockedFuture
    ? `Locked — opens in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`
    : past
    ? "Closed — only visible on its date."
    : "";

  return (
    <Card>
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
        <TimerReset className="w-5 h-5" /> Time capsule
      </h2>
      <p className="text-sm text-slate-700 mt-1">
        Notes can be <span className="font-semibold">made ≥7 days before</span> their date and
        are <span className="font-semibold">only revealed on that exact day</span>.
      </p>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <label className="text-sm">
          Date
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 ring-rose-300"
          />
        </label>
        <div className="flex gap-2 justify-start md:justify-end">
          <button
            onClick={() => setMode("make")}
            disabled={!canEdit}
            className={`rounded-xl px-4 py-2 border bg-white hover:bg-rose-50 ${
              !canEdit ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Make note
          </button>
          <button
            onClick={() => setMode("history")}
            className="rounded-xl px-4 py-2 border bg-white hover:bg-rose-50"
          >
            History
          </button>
        </div>
      </div>

      {/* content */}
      {mode === "make" ? (
        <div className="mt-4">
          {!canEdit ? (
            <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
              You can only create/edit notes 7+ days before the date.
            </div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                className="w-full rounded-2xl border p-3 focus:outline-none focus:ring-2 ring-rose-300"
                placeholder="Write the note for this date…"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={save}
                  className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setText("");
                    const next = { ...map };
                    delete next[dateISO];
                    setMap(next);
                    setMode("view");
                  }}
                  className="rounded-xl px-4 py-2 border"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      ) : mode === "history" ? (
        <div className="mt-4 rounded-2xl border bg-white p-4 text-sm max-h-60 overflow-y-auto">
          {Object.entries(map)
            .filter(([d]) => parseISODateLocal(d) < nowDay)
            .sort(([a], [b]) => (a > b ? -1 : 1))
            .map(([d, note]) => (
              <div key={d} className="mb-3 last:mb-0">
                <div className="text-xs text-slate-500">{d}</div>
                <div className="rounded-lg border p-2 bg-slate-50 mt-1">{note}</div>
              </div>
            ))}
          {Object.entries(map).filter(([d]) => parseISODateLocal(d) < nowDay).length === 0 && (
            <div className="text-slate-500 text-sm">No past notes yet.</div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {canView ? (
            <motion.div
              key={dateISO}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-white p-4 text-sm"
            >
              {map[dateISO] || "No note prepared for this date."}
            </motion.div>
          ) : (
            <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
              {revealMsg}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// -----------------
// Heart Pop (animated, with end summary) — hydration-safe
// -----------------
interface Bubble { id: number; x: number; y: number; size: number; speed: number; }

function HeartGame() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [confetti, setConfetti] = useState<number[]>([]);
  // IMPORTANT: defer localStorage read to the client to avoid SSR mismatch
  const [high, setHigh] = useState<number | null>(null);
  const idRef = useRef(0);

  // Load best score on the client only
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("ldr_highscore") || 0);
      setHigh(Number.isFinite(saved) ? saved : 0);
    } catch {
      setHigh(0);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (running && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [running, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && running) {
      setRunning(false);
      setConfetti(Array.from({ length: 36 }, (_, i) => i));
      try {
        if (score > (high ?? 0)) {
          localStorage.setItem("ldr_highscore", String(score));
          setHigh(score);
        }
      } catch {}
      const t = setTimeout(() => setConfetti([]), 1600);
      return () => clearTimeout(t);
    }
  }, [timeLeft, running, score, high]);

  useEffect(() => {
    let anim = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      setBubbles((bs) =>
        bs
          .map((b) => ({ ...b, y: b.y - b.speed * dt }))
          .filter((b) => b.y + b.size > 0)
      );
      if (running) anim = requestAnimationFrame(frame);
    }
    if (running) anim = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(anim);
  }, [running]);

  useEffect(() => {
    let spawn: ReturnType<typeof setInterval> | null = null;
    if (running) {
      spawn = setInterval(() => {
        setBubbles((bs) => [
          ...bs,
          {
            id: idRef.current++,
            x: Math.random() * 100,
            y: 100 + Math.random() * 10,
            size: 24 + Math.random() * 40,
            speed: 10 + Math.random() * 20,
          },
        ]);
      }, 420);
    }
    return () => { if (spawn) clearInterval(spawn); };
  }, [running]);

  function start() {
    setScore(0);
    setTimeLeft(30);
    setBubbles([]);
    setConfetti([]);
    setRunning(true);
  }
  function pop(id: number) {
    setBubbles((bs) => bs.filter((b) => b.id !== id));
    setScore((s) => s + 1);
  }

  const overlay = !running && timeLeft === 0;
  const ppm = Math.round((score / 30) * 60);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="w-5 h-5" /> Heart Pop (30s)
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="rounded-xl px-3 py-1 bg-rose-100 border font-semibold">
            Score: {score}
          </div>
          <div className="rounded-xl px-3 py-1 bg-rose-100 border font-semibold flex items-center gap-1">
            <Clock className="w-4 h-4" /> {timeLeft}s
          </div>
          {/* hydration-safe: only the number is suppressed */}
          <div className="rounded-xl px-3 py-1 bg-slate-100 border font-semibold">
            Best: <span suppressHydrationWarning>{high ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-64 rounded-2xl border bg-gradient-to-b from-rose-50 to-white relative overflow-hidden">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.button
              key={b.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              onClick={() => pop(b.id)}
              aria-label="heart"
            >
              <Heart
                className="drop-shadow"
                style={{ width: b.size, height: b.size, color: "#e11d48" }}
              />
            </motion.button>
          ))}
        </AnimatePresence>

        {!running && timeLeft === 30 && (
          <div className="absolute inset-0 grid place-items-center text-center p-6">
            <div>
              <p className="text-slate-600 mb-3">Click hearts to score! Ready?</p>
              <button
                onClick={start}
                className="rounded-2xl px-5 py-3 bg-rose-500 text-white font-semibold hover:bg-rose-600"
              >
                Start
              </button>
            </div>
          </div>
        )}

        {overlay && (
          <div className="absolute inset-0 grid place-items-center text-center p-6 bg-white/75 backdrop-blur">
            <div className="max-w-sm w-full">
              <h3 className="text-xl font-bold">Nice run!</h3>
              <div className="mt-2 text-slate-700">
                Hearts popped: <span className="font-semibold">{score}</span>
              </div>
              <div className="text-slate-700">
                Speed: <span className="font-semibold">{ppm}</span> pops/min
              </div>
              <div className="text-slate-700">
                Best: <span className="font-semibold" suppressHydrationWarning>{high ?? 0}</span>
              </div>
              <button
                onClick={start}
                className="mt-4 rounded-2xl px-5 py-3 bg-rose-500 text-white font-semibold hover:bg-rose-600 w-full"
              >
                Play again
              </button>
            </div>
          </div>
        )}

        {confetti.map((i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
            animate={{
              opacity: 0,
              y: -120 - Math.random() * 60,
              x: (Math.random() - 0.5) * 140,
              rotate: Math.random() * 360,
            }}
            transition={{ duration: 1.4 }}
            style={{
              left: `${50 + (Math.random() - 0.5) * 40}%`,
              top: `70%`,
            }}
          >
            <Heart className="w-5 h-5" style={{ color: "#fb7185" }} />
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// -----------------
// Time Zones Pro (Sydney ↔ Toronto) — per-TZ anchored bars + clean summary
// -----------------
function DualClockPro() {
  const myTz = "Australia/Sydney";
  const partnerTz = "America/Toronto";

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---------- types ----------
  type DayName =
    | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  type ClassSlot = { start: string; end: string; label: string };
  type PersonName = keyof typeof schedules;

  // ---------- local helpers ----------
  function hhmmToPct(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    return ((h * 60 + (m || 0)) / (24 * 60)) * 100;
  }

  function fmtClock(d: Date, tz: string) {
    return new Intl.DateTimeFormat([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(d);
  }

  function weekdayLong(d: Date, tz: string): DayName {
    return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: tz }).format(d) as DayName;
  }

  // Robust midnight in a given tz for *today in that tz*
  function tzOffsetMinutes(tz: string, at: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(at);
    const get = (t: string) => parts.find(p => p.type === t)?.value || "00";
    const y = Number(get("year"));
    const m = Number(get("month"));
    const d = Number(get("day"));
    const h = Number(get("hour"));
    const mi = Number(get("minute"));
    const s = Number(get("second"));
    const asUTC = Date.UTC(y, m - 1, d, h, mi, s);
    return Math.round((asUTC - at.getTime()) / 60000);
  }
  function midnightInTz(when: Date, tz: string) {
    const pads = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(when);
    const y = Number(pads.find(p => p.type === "year")?.value || "1970");
    const m = Number(pads.find(p => p.type === "month")?.value || "01");
    const d = Number(pads.find(p => p.type === "day")?.value || "01");
    const guessUTC = Date.UTC(y, m - 1, d, 0, 0, 0);
    const off1 = tzOffsetMinutes(tz, new Date(guessUTC));
    let T = guessUTC - off1 * 60000;
    const off2 = tzOffsetMinutes(tz, new Date(T));
    if (off2 !== off1) T = guessUTC - off2 * 60000;
    return new Date(T);
  }

  // Use *wall-clock* minutes to position the NOW hairline (fixes 1h drift)
  function wallMinutes(d: Date, tz: string) {
    return timeAt(d, tz).minutes; // 0..1439 (global helper you already have)
  }

  // ----- Anchored awake mask for bars (15-min) -----
  function bothAwakeMaskAnchored(anchorTz: string, stepMin = 15) {
    const steps = Math.floor(1440 / stepMin);
    const startMid = midnightInTz(new Date(), anchorTz);
    const mask: boolean[] = new Array(steps);
    for (let i = 0; i < steps; i++) {
      const when = new Date(startMid.getTime() + i * stepMin * 60000);
      const a = isAwake(when, myTz, 8, 24);
      const b = isAwake(when, partnerTz, 8, 24);
      mask[i] = a && b;
    }
    return mask;
  }

  // ----- Clean interval math for footer text (on the hour, no :15) -----
  function todaysAwakeInterval(tz: string, startHour = 8, endHour = 24) {
    const mid = midnightInTz(new Date(), tz);
    const start = new Date(mid.getTime() + startHour * 3600000);
    const end   = new Date(mid.getTime() + endHour  * 3600000);
    return { start, end, tz };
  }
  function intersectUTC(a: {start: Date; end: Date}, b: {start: Date; end: Date}) {
    const start = new Date(Math.max(a.start.getTime(), b.start.getTime()));
    const end   = new Date(Math.min(a.end.getTime(),   b.end.getTime()));
    return start < end ? { start, end } : null;
  }
  function toHour00Label(d: Date, tz: string) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
    }).formatToParts(d);
    const h = parts.find(p => p.type === "hour")?.value ?? "00";
    return `${h}:00`;
  }
  function currentOrNextWindow() {
    const A = todaysAwakeInterval(myTz, 8, 24);
    const B = todaysAwakeInterval(partnerTz, 8, 24);
    let over = intersectUTC(A, B);
    const nowUTC = now;

    if (!over) {
      // Fallback: should not happen with 08–24, but just in case use tomorrow’s.
      const A2 = { start: new Date(A.start.getTime()+86400000), end: new Date(A.end.getTime()+86400000) };
      const B2 = { start: new Date(B.start.getTime()+86400000), end: new Date(B.end.getTime()+86400000) };
      over = intersectUTC(A2, B2)!;
    }

    let status: "current" | "next";
    if (nowUTC >= over.start && nowUTC < over.end) {
      status = "current";
    } else if (nowUTC < over.start) {
      status = "next";
    } else {
      // after today's overlap → tomorrow's window
      over = { start: new Date(over.start.getTime()+86400000),
               end:   new Date(over.end.getTime()+86400000) };
      status = "next";
    }

    const startA = toHour00Label(over.start, myTz);
    const endA   = toHour00Label(over.end,   myTz);
    const startB = toHour00Label(over.start, partnerTz);
    const endB   = toHour00Label(over.end,   partnerTz);

    const msToStart = Math.max(0, over.start.getTime() - nowUTC.getTime());
    const mins = Math.floor(msToStart / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;

    return { status, startA, endA, startB, endB, h, m };
  }

  // ---------- derived data ----------
  const bothSydney  = bothAwakeMaskAnchored(myTz, 15);
  const bothToronto = bothAwakeMaskAnchored(partnerTz, 15);
  const summary     = currentOrNextWindow();

  const people = [
    { label: "Farhan" as PersonName, tz: myTz, tzLabel: "Australia/Sydney" },
    { label: "Nabila" as PersonName, tz: partnerTz, tzLabel: "America/Toronto" },
  ];

  // ---------- UI pieces ----------
  function ClassBar({ tz, name, slots }: { tz: string; name: PersonName; slots: ClassSlot[] }) {
  const pctNow = (wallMinutes(now, tz) / (24 * 60)) * 100;

  return (
    <div className="mt-2">
      {/* rail: clip contents so highlights don't "bocor" */}
      <div className="relative h-6 rounded-full overflow-hidden border bg-gradient-to-r from-slate-50 to-white">
        {/* hour grid */}
        <div className="absolute inset-0 grid grid-cols-24 overflow-hidden pointer-events-none">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="border-r last:border-0 border-slate-100" />
          ))}
        </div>

        {/* awake band 08–24 (square ends) */}
        <div
          className="absolute top-0 bottom-0 bg-rose-200/60 pointer-events-none"
          style={{ left: `${(8 / 24) * 100}%`, width: `${((24 - 8) / 24) * 100}%` }}
        />

        {/* class chips (rounded) */}
        {slots.map((s, i) => {
          const left = hhmmToPct(s.start);
          const width = hhmmToPct(s.end) - left;
          const label = s.label;
          return (
            <div
              key={`${name}-${i}`}
              className="group absolute top-0 bottom-0 rounded-full bg-rose-400/60 border border-rose-400/70 hover:bg-rose-500/70 focus-within:bg-rose-500/70"
              style={{ left: `${left}%`, width: `${width}%`, zIndex: 2 }}
              title={label}
            >
              <button
                aria-label={label}
                className="absolute inset-0 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-rose-400"
                tabIndex={0}
              />
              {/* tooltip will now be clipped by the rail; remove if you prefer unclipped */}
              <div
                className="
                  pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2
                  whitespace-nowrap rounded-xl border border-rose-100
                  bg-white/95 backdrop-blur px-2.5 py-1
                  text-[11px] font-medium text-slate-800 shadow-[0_8px_24px_-8px_rgba(225,29,72,0.25)]
                  opacity-0 translate-y-1 scale-[0.98]
                  transition duration-100 ease-out
                  group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100
                  group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100
                "
              >
                {s.label}
                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-[3px] rotate-45 rounded-[2px] bg-white/95 border border-rose-100" />
              </div>
            </div>
          );
        })}

        {/* NOW hairline (wall-clock accurate) */}
        <div
          className="absolute top-[1px] bottom-[1px] w-px bg-rose-600"
          style={{ left: `calc(${pctNow}% - 0.5px)` }}
        />
      </div>

      {/* Only 0 and 24 */}
      <div className="mt-1 flex justify-between text-[9px] text-slate-400 px-[1px]">
        <span>0</span>
        <span>24</span>
      </div>
    </div>
  );
}

  function OverlapBar({ label, tz, mask }: { label: string; tz: string; mask: boolean[] }) {
    const pctNow = (wallMinutes(now, tz) / (24 * 60)) * 100;

    return (
      <div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
          <span>{label}</span>
          <span>both awake</span>
        </div>
        <div className="relative h-6 overflow-hidden border bg-gradient-to-r from-slate-50 to-white rounded-full">
          <div className="absolute inset-0 flex">
            {mask.map((on, i) => (
              <div
                key={i}
                className={`h-full ${on ? "bg-emerald-200/70" : "bg-transparent"}`}
                style={{ width: `${100 / mask.length}%` }}
              />
            ))}
          </div>
          {/* hairline */}
          <div
            className="absolute top-[1px] bottom-[1px] w-px bg-rose-600"
            style={{ left: `calc(${pctNow}% - 0.5px)` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-slate-400 px-[1px]">
          <span>0</span>
          <span>24</span>
        </div>
      </div>
    );
  }

  // ---------- render ----------
  return (
    <Card className="h-full">
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Globe2 className="w-5 h-5" /> Sydney ↔ Toronto
      </h2>

      {/* Top tiles */}
      <div className="grid md:grid-cols-2 gap-4 mt-3">
        {people.map((p) => (
          <div key={p.label} className="rounded-2xl p-4 border bg-white/70">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-600">{p.label}</div>
              <div className="text-[10px] text-slate-500">{p.tzLabel}</div>
            </div>
            <div className="mt-1 text-2xl font-semibold leading-tight tabular-nums">
              {fmtClock(now, p.tz)}
            </div>
          </div>
        ))}
      </div>

      {/* Per-person bars + lists */}
      <div className="mt-4 space-y-6">
        {people.map((p) => {
          const day = weekdayLong(now, p.tz);
          const personSchedule =
            (schedules[p.label] as Record<DayName, ClassSlot[] | undefined>) || {};
          const todaySlots = personSchedule[day] ?? [];
          return (
            <div key={p.label}>
              <div className="text-[11px] text-slate-600 mb-1">{p.label}</div>
              <ClassBar tz={p.tz} name={p.label} slots={todaySlots} />
              <div className="mt-3 rounded-2xl border bg-white/70 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  TODAY’S CLASSES ({day})
                </div>
                {todaySlots.length ? (
                  <div className="mt-2 grid gap-y-1 text-sm">
                    {todaySlots.map((s, i) => (
                      <div key={i} className="flex justify-between">
                        <div>{s.label}</div>
                        <div className="tabular-nums text-slate-600">
                          {s.start} — {s.end}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-600">No classes today.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overlap — each anchored to its own timezone's midnight */}
      <div className="mt-6 space-y-4">
        <OverlapBar label="Overlap (Sydney time)" tz={myTz} mask={bothSydney} />
        <OverlapBar label="Overlap (Toronto time)" tz={partnerTz} mask={bothToronto} />

        {/* Summary (interval math) */}
        {/* Summary (interval math) */}
<div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
  {summary.status === "current" ? (
    <span className="font-semibold">Currently in window</span>
  ) : (
    <>
      <span>
        Next window:{" "}
        <span className="font-semibold">
          {summary.startA}–{summary.endA}
        </span>{" "}
        (Sydney) ·{" "}
        <span className="font-semibold">
          {summary.startB}–{summary.endB}
        </span>{" "}
        (Toronto)
      </span>
      <span className="text-[11px] px-2 py-0.5 rounded-lg border bg-white/70">
        in {summary.h}h {String(summary.m).padStart(2, "0")}m
      </span>
    </>
  )}
</div>
      </div>
    </Card>
  );
}

// -----------------
// Photo Memory Match (preselected deck only)
// -----------------
function PhotoMatch() {
  type Tile = { id: number; url: string; flipped: boolean; matched: boolean };
  const [deck, setDeck] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);

  function reset() { setDeck(buildPhotoDeck(placeholders) as Tile[]); setMoves(0); setFlippedIds([]); }
  useEffect(() => { reset(); }, []);

  function flip(idx: number) {
    const t = deck[idx];
    if (!t || t.flipped || t.matched || flippedIds.length === 2) return;
    const newTiles = deck.slice(); newTiles[idx] = { ...t, flipped: true }; setDeck(newTiles);
    const newFlipped = [...flippedIds, idx]; setFlippedIds(newFlipped);
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      if (newTiles[a].url === newTiles[b].url) {
        setTimeout(() => { const t2 = newTiles.slice(); (t2[a] as Tile).matched = (t2[b] as Tile).matched = true; setDeck(t2); setFlippedIds([]); }, 250);
      } else {
        setTimeout(() => { const t2 = newTiles.slice(); (t2[a] as Tile).flipped = (t2[b] as Tile).flipped = false; setDeck(t2); setFlippedIds([]); }, 450);
      }
    }
  }

  const won = deck.length && deck.every((t) => t.matched);

  return (
    <Card>
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><ListChecks className="w-5 h-5"/> Photo memory match</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {deck.map((t, i) => (
          <button key={t.id} onClick={() => flip(i)} className={`h-20 md:h-24 rounded-2xl border overflow-hidden relative transition ${t.flipped || t.matched ? "bg-rose-100" : "bg-white active:scale-95"}`}>
            {(t.flipped || t.matched) ? (
              <img src={t.url} alt="tile" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">♥</span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">Moves: <span className="font-semibold">{moves}</span> {won ? "— You matched all! 💗" : ""}</div>
        <button onClick={reset} className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600">Restart</button>
      </div>
    </Card>
  );
}

// -----------------
// Secret letter
// -----------------
function SecretLetter() {
  const [locked, setLocked] = useState<boolean>(() => { try { return !(localStorage.getItem("ldr_letter_unlocked") === "1"); } catch { return true; } });
  const [pass, setPass] = useState("");
  const [text, setText] = useState<string>(() => { try { return localStorage.getItem("ldr_letter") || DEFAULT_LETTER; } catch { return DEFAULT_LETTER; } });

  function unlock() { if (pass.trim().toLowerCase() === "pinky promise") { setLocked(false); try { localStorage.setItem("ldr_letter_unlocked", "1"); } catch {} } }
  function save() { try { localStorage.setItem("ldr_letter", text); } catch {} }
  function lockBack() { setLocked(true); try { localStorage.setItem("ldr_letter_unlocked", "0"); } catch {} }

  return (
    <Card>
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Lock className="w-5 h-5"/> Secret letter</h2>
      {locked ? (
        <div className="mt-3">
          <p className="text-sm text-slate-700">Unlock with your passphrase (hint: magic words you both use). Demo passphrase: <span className="font-semibold">pinky promise</span>.</p>
          <div className="mt-3 flex gap-2">
            <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Enter passphrase" className="flex-1 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 ring-rose-300"/>
            <button onClick={unlock} className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600">Unlock</button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full rounded-2xl border p-3 focus:outline-none focus:ring-2 ring-rose-300" />
          <div className="mt-2 flex gap-2">
            <button onClick={save} className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600">Save</button>
            <button onClick={lockBack} className="rounded-xl px-4 py-2 border">Lock</button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Saved only on this device.</p>
        </div>
      )}
    </Card>
  );
}

// -----------------
// Developer self-tests (opt-in)
// -----------------
function DevTests() {
  const [tests, setTests] = useState<{ name: string; pass: boolean; detail?: string }[]>([]);
  const show = (() => { try { return new URLSearchParams(window.location.search).get("tests") === "1"; } catch { return false; } })();

  useEffect(() => {
    if (!show) return;
    const results: { name: string; pass: boolean; detail?: string }[] = [];

    results.push({ name: "DEFAULT_LETTER contains greeting & signature", pass: typeof DEFAULT_LETTER === "string" && DEFAULT_LETTER.includes("Dear you,") && DEFAULT_LETTER.includes("— me") });

    const deck = makeMemoryDeck(["A","B","C","D","E","F","G","H"]);
    results.push({ name: "Memory deck size is 16", pass: deck.length === 16 });

    const pd = buildPhotoDeck(["u1","u2","u3"]);
    const uniqUrls = new Set(pd.map((t: any) => t.url)).size;
    results.push({ name: "Photo deck length is 6 for 3", pass: pd.length === 6 });
    results.push({ name: "Photo deck has 3 unique", pass: uniqUrls === 3 });

    results.push({ name: "tzDiffHours(UTC, UTC) === 0", pass: tzDiffHours("UTC", "UTC") === 0 });

    const cd = countdownDiff(new Date(Date.now() + 24 * 3600 * 1000), new Date());
    results.push({ name: "countdownDiff returns finite numbers", pass: !!cd && [cd!.days, cd!.hours, cd!.mins, cd!.secs].every(Number.isFinite) });

    const overlap60 = computeOverlapTimeline(new Date(), "Australia/Sydney", "America/Toronto", 60);
    results.push({ name: "Overlap timeline 24 steps (60m)", pass: overlap60.length === 24 });

    // Extra: overlap at 15m granularity
    const overlap15 = computeOverlapTimeline(new Date(), "Australia/Sydney", "America/Toronto", 15);
    results.push({ name: "Overlap timeline 96 steps (15m)", pass: overlap15.length === 96 });

    // Next-good-window returns object or null
    const win = findNextGoodWindow(new Date(), "Australia/Sydney", "America/Toronto", 45);
    results.push({ name: "findNextGoodWindow returns object/null", pass: typeof win === "object" || win === null });

    setTests(results);
  }, [show]);

  if (!show) return null;
  return (
    <Card>
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">🔧 Self-tests</h2>
      <ul className="mt-3 grid gap-2">
        {tests.map((t, i) => (
          <li key={i} className={`p-3 rounded-2xl border ${t.pass ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <span className="font-medium">{t.pass ? "✅ PASS" : "❌ FAIL"}</span>
            <span className="ml-2">{t.name}</span>
            {t.detail ? <span className="ml-2 text-xs opacity-70">{t.detail}</span> : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500 mt-2">Add <code>?tests=1</code> to the URL to toggle these checks.</p>
    </Card>
  );
}

// -----------------
// App
// -----------------
export default function LittleLoveHub() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12">
        <Hero />

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Notes />
          <TimeCapsule />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-stretch">
          <PhotoGallery />
          <DualClockPro />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <PhotoMatch />
          <HeartGame />
        </div>

        <div className="mt-6">
          <DevTests />
        </div>

        <footer className="mt-12 text-center text-xs text-slate-600">
          Built with care by Farhan{" "}
          <motion.span
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="inline-block text-rose-500"
            aria-hidden
          >
            ❤️
          </motion.span>
          {" "}for my Naila Inas Nabilatillah 💕✨
        </footer>
      </div>
    </div>
  );
}
