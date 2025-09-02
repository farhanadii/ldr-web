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

function useFavicon(title = "Little Love Hub") {
  useEffect(() => {
    document.title = title;
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
        <rect width='64' height='64' rx='12' fill='#f8fafc'/>
        <path d='M32 50c-1.6 0-3.2-.6-4.4-1.8L14 34.3c-3.9-3.9-3.9-10.2 0-14.1 3.9-3.9 10.2-3.9 14.1 0l3.9 3.9 3.9-3.9c3.9-3.9 10.2-3.9 14.1 0 3.9 3.9 3.9 10.2 0 14.1L36.4 48.2C35.2 49.4 33.6 50 32 50z' fill='#e11d48'/>
      </svg>`
    );
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = `data:image/svg+xml,${svg}`;
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch {}
    };
  }, [title]);
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
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const diff = useMemo(() => countdownDiff(targetDate, now), [targetDate, now]);
  const isPast = now.getTime() >= targetDate.getTime();
  const fixedLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(targetDate);

  return (
    <div className={`relative overflow-hidden rounded-[32px] px-6 md:px-10 py-12 md:py-16 bg-gradient-to-br ${cuteGradients[idx]} text-slate-900`}>
      {/* live wallpaper overlay */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: "radial-gradient(40% 60% at 20% 20%, rgba(244,114,182,0.35), transparent), radial-gradient(40% 60% at 80% 30%, rgba(253,164,175,0.35), transparent), radial-gradient(50% 70% at 50% 80%, rgba(216,180,254,0.3), transparent)" }}
        animate={{ backgroundPosition: ["0% 0%", "100% 50%", "0% 0%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center justify-center gap-2 text-sm mb-3 opacity-90">
          <Sparkles size={18} /> <span>Little Love Hub</span>
        </div>
        <h1 className="text-center text-4xl md:text-6xl font-extrabold tracking-tight">Long-Distance, Big Love</h1>
        <p className="mt-3 text-center text-base md:text-lg opacity-90">A crafted space for us — countdown, time zones, capsule notes & games.</p>

        <motion.div className="mt-8 md:mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl p-4 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="flex items-center justify-between">
              <div className="text-sm md:text-base font-medium text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5"/> Next time we hug</div>
              <div />
            </div>
            {!isPast ? (
              <>
                <div className="mt-5 grid grid-cols-4 gap-2 md:gap-3 text-center">
                  {diff ? ([
                    { label: "Days", v: diff.days },
                    { label: "Hours", v: diff.hours },
                    { label: "Minutes", v: diff.mins },
                    { label: "Seconds", v: diff.secs },
                  ]).map((b) => (
                    <motion.div key={b.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-3 md:p-5 bg-white/70 border border-white/70">
                      <div className="text-4xl md:text-6xl lg:text-7xl font-black tabular-nums tracking-tight">{String(b.v).padStart(2, "0")}</div>
                      <div className="text-[10px] md:text-xs tracking-wide uppercase text-slate-700 mt-1">{b.label}</div>
                    </motion.div>
                  )) : (
                    <div className="col-span-4 text-slate-800 text-sm md:text-base">Countdown starting…</div>
                  )}
                </div>
                <div className="mt-3 text-center text-xs md:text-sm text-slate-700">{fixedLabel}</div>
              </>
            ) : (
              <div className="mt-6 text-center">
                <div className="text-2xl md:text-3xl font-bold text-rose-600">It’s hug time 💖</div>
                <div className="mt-1 text-xs md:text-sm text-slate-700">{fixedLabel}</div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Soft floating lights */}
      <motion.div className="absolute -top-16 -right-20 w-72 h-72 rounded-full bg-white/30 blur-3xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute -bottom-24 -left-10 w-96 h-96 rounded-full bg-white/25 blur-3xl" animate={{ y: [0, 12, 0] }} transition={{ duration: 10, repeat: Infinity }} />
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
// Heart Pop (animated, with end summary)
// -----------------
interface Bubble { id: number; x: number; y: number; size: number; speed: number; }
function HeartGame() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [confetti, setConfetti] = useState<number[]>([]);
  const [high, setHigh] = useState<number>(() => { try { return Number(localStorage.getItem("ldr_highscore") || 0); } catch { return 0; } });
  const idRef = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (running && timeLeft > 0) timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => { if (timer) clearInterval(timer); };
  }, [running, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && running) {
      setRunning(false);
      setConfetti(Array.from({ length: 36 }, (_, i) => i));
      try { if (score > high) { localStorage.setItem("ldr_highscore", String(score)); setHigh(score); } } catch {}
      const t = setTimeout(() => setConfetti([]), 1600);
      return () => clearTimeout(t);
    }
  }, [timeLeft, running, score, high]);

  useEffect(() => {
    let anim = 0; let last = performance.now();
    function frame(now: number) {
      const dt = (now - last) / 1000; last = now;
      setBubbles((bs) => bs.map((b) => ({ ...b, y: b.y - b.speed * dt })).filter((b) => b.y + b.size > 0));
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
          { id: idRef.current++, x: Math.random() * 100, y: 100 + Math.random() * 10, size: 24 + Math.random() * 40, speed: 10 + Math.random() * 20 },
        ]);
      }, 420);
    }
    return () => { if (spawn) clearInterval(spawn); };
  }, [running]);

  function start() { setScore(0); setTimeLeft(30); setBubbles([]); setConfetti([]); setRunning(true); }
  function pop(id: number) { setBubbles((bs) => bs.filter((b) => b.id !== id)); setScore((s) => s + 1); }

  const overlay = !running && timeLeft === 0;
  const ppm = Math.round((score / 30) * 60);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Gamepad2 className="w-5 h-5"/> Heart Pop (30s)</h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="rounded-xl px-3 py-1 bg-rose-100 border font-semibold">Score: {score}</div>
          <div className="rounded-xl px-3 py-1 bg-rose-100 border font-semibold flex items-center gap-1"><Clock className="w-4 h-4"/> {timeLeft}s</div>
          <div className="rounded-xl px-3 py-1 bg-slate-100 border font-semibold">Best: {high}</div>
        </div>
      </div>
      <div className="mt-3 h-64 rounded-2xl border bg-gradient-to-b from-rose-50 to-white relative overflow-hidden">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.button key={b.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%` }} onClick={() => pop(b.id)} aria-label="heart">
              <Heart className="drop-shadow" style={{ width: b.size, height: b.size, color: "#e11d48" }} />
            </motion.button>
          ))}
        </AnimatePresence>
        {!running && timeLeft === 30 && (
          <div className="absolute inset-0 grid place-items-center text-center p-6">
            <div>
              <p className="text-slate-600 mb-3">Click hearts to score! Ready?</p>
              <button onClick={start} className="rounded-2xl px-5 py-3 bg-rose-500 text-white font-semibold hover:bg-rose-600">Start</button>
            </div>
          </div>
        )}
        {overlay && (
          <div className="absolute inset-0 grid place-items-center text-center p-6 bg-white/75 backdrop-blur">
            <div className="max-w-sm w-full">
              <h3 className="text-xl font-bold">Nice run!</h3>
              <div className="mt-2 text-slate-700">Hearts popped: <span className="font-semibold">{score}</span></div>
              <div className="text-slate-700">Speed: <span className="font-semibold">{ppm}</span> pops/min</div>
              <div className="text-slate-700">Best: <span className="font-semibold">{high}</span></div>
              <button onClick={start} className="mt-4 rounded-2xl px-5 py-3 bg-rose-500 text-white font-semibold hover:bg-rose-600 w-full">Play again</button>
            </div>
          </div>
        )}
        {confetti.map((i) => (
          <motion.div key={i} className="absolute" initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }} animate={{ opacity: 0, y: -120 - Math.random()*60, x: (Math.random()-0.5)*140, rotate: Math.random()*360 }} transition={{ duration: 1.4 }} style={{ left: `${50 + (Math.random()-0.5)*40}%`, top: `70%` }}>
            <Heart className="w-5 h-5" style={{ color: "#fb7185" }} />
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// -----------------
// Time Zones Pro (Sydney ↔ Toronto) with visualization — Toronto LOCKED
// -----------------
function DualClockPro() {
  // Fixed timezones
  const myTz = "Australia/Sydney";
  const partnerTz = "America/Toronto";

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Viewer local timezone (used only for the Overlap row marker)
  const viewerTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || myTz;
    } catch {
      return myTz;
    }
  }, []);

  // --- Accurate timezone offset (minutes) for any IANA TZ ---
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

    // This is the epoch ms IF those parts were UTC
    const asUTC = Date.UTC(y, m - 1, d, h, mi, s);
    // The real epoch ms is at.getTime(). Difference is the offset
    const offsetMs = asUTC - at.getTime();
    return Math.round(offsetMs / 60000); // minutes
  }

  function tzDiffHoursAccurate(a: string, b: string, at: Date) {
    const aMin = tzOffsetMinutes(a, at);
    const bMin = tzOffsetMinutes(b, at);
    return (bMin - aMin) / 60;
  }

  // Consistent formatter
  function fmt(date: Date, tz: string) {
    try {
      return new Intl.DateTimeFormat([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: tz,
      }).format(date);
    } catch {
      return "Invalid timezone";
    }
  }

  // Awake window 08:00–24:00
  function computeOverlapTimeline24(base: Date, tzA: string, tzB: string, stepMin = 15) {
    const items: { idx: number; when: Date; aAwake: boolean; bAwake: boolean; both: boolean }[] = [];
    const start = new Date(base.getTime());
    start.setSeconds(0, 0);
    for (let i = 0; i < Math.floor(1440 / stepMin); i++) {
      const when = new Date(start.getTime() + i * stepMin * 60000);
      const aAwake = isAwake(when, tzA, 8, 24);
      const bAwake = isAwake(when, tzB, 8, 24);
      items.push({ idx: i, when, aAwake, bAwake, both: aAwake && bAwake });
    }
    return items;
  }

  function findNextGoodWindow24(base: Date, tzA: string, tzB: string, minMinutes = 45) {
    const timeline = computeOverlapTimeline24(base, tzA, tzB, 15);
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

  const delta = tzDiffHoursAccurate(myTz, partnerTz, now); // <-- no longer 0
  const timeline = computeOverlapTimeline24(now, myTz, partnerTz, 15);
  const nextWin = findNextGoodWindow24(now, myTz, partnerTz, 45);

  function toLabel(d: Date, tz: string) {
    const p = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).formatToParts(d);
    const h = p.find(x => x.type === "hour")?.value || "00";
    const m = p.find(x => x.type === "minute")?.value || "00";
    return `${h}:${m}`;
  }

  // “time until next window” (viewer’s local clock for countdown precision)
  const nextIn = useMemo(() => {
    if (!nextWin) return null;
    const ms = nextWin.start.getTime() - now.getTime();
    const mins = Math.max(0, Math.floor(ms / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return { h, m };
  }, [nextWin, now]);

  const people = [
    { label: "Farhan", tz: myTz, tzLabel: "Australia/Sydney" },
    { label: "Nabila", tz: partnerTz, tzLabel: "America/Toronto" },
  ] as const;

  return (
    <Card className="h-full">
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Globe2 className="w-5 h-5" /> Sydney ↔ Toronto
      </h2>

      {/* Person tiles (same layout, aligned) */}
      <div className="grid md:grid-cols-2 gap-4 mt-3">
        {people.map(p => (
          <div key={p.label} className="rounded-2xl p-4 border bg-white/70">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-600">{p.label}</div>
              <div className="text-[10px] text-slate-500">{p.tzLabel}</div>
            </div>
            <div className="mt-1">
              <div className="text-2xl font-semibold leading-tight tabular-nums">{fmt(now, p.tz)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Timelines */}
      <div className="mt-4 space-y-4">
        {people.map((row, rIdx) => (
          <div key={row.label} className="w-full">
            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
              <span className="font-medium">{row.label}</span>
              <span>24h</span>
            </div>

            <div className="relative h-6 rounded-full overflow-hidden border bg-gradient-to-r from-slate-50 to-white">
              {/* hour grid */}
              <div className="absolute inset-0 grid grid-cols-24">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="border-r last:border-0 border-slate-100" />
                ))}
              </div>

              {/* awake shading */}
              <div className="absolute inset-0 flex">
                {timeline.map((t, i) => {
                  const awake = rIdx === 0 ? t.aAwake : t.bAwake;
                  return (
                    <div
                      key={i}
                      className={`h-full ${awake ? "bg-rose-200/60" : "bg-transparent"}`}
                      style={{ width: `${100 / timeline.length}%` }}
                    />
                  );
                })}
              </div>

              {/* NOW marker: use THAT ROW's timezone (fixes Nabila’s marker) */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-rose-500"
                style={{ left: `${(timeAt(now, row.tz).minutes / (24 * 60)) * 100}%` }}
              />
            </div>

            {/* ticks */}
            <div className="mt-1 flex justify-between text-[9px] text-slate-400 px-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i}>{i * 3}</span>
              ))}
            </div>
          </div>
        ))}

        {/* Overlap row: marker in viewer’s local time (as requested previously) */}
        <div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
            <span>Overlap</span>
            <span>both awake</span>
          </div>
          <div className="relative h-6 rounded-full overflow-hidden border bg-gradient-to-r from-slate-50 to-white">
            <div className="absolute inset-0 flex">
              {timeline.map((t, i) => (
                <div
                  key={i}
                  className={`h-full ${t.both ? "bg-emerald-200/70" : "bg-transparent"}`}
                  style={{ width: `${100 / timeline.length}%` }}
                />
              ))}
            </div>
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500"
              style={{ left: `${(timeAt(now, viewerTz).minutes / (24 * 60)) * 100}%` }}
            />
          </div>

          <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Time difference: <span className="font-semibold">{delta >= 0 ? "+" + delta : delta}h</span>
            </span>
            {nextWin ? (
              <>
                <span>
                  Next window:{" "}
                  <span className="font-semibold">
                    {toLabel(nextWin.start, viewerTz)}–{toLabel(nextWin.end, viewerTz)}
                  </span>{" "}
                  (your time)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-lg border bg-white/70">
                  in {nextIn!.h}h {String(nextIn!.m).padStart(2, "0")}m
                </span>
              </>
            ) : (
              <span>No 45-min overlap in next 24h</span>
            )}
          </div>
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
  useFavicon();
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
