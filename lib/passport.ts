/**
 * The passport: stamps collected per city-pair, stored only in localStorage.
 * No network, no cookies, no identifiers — the drawer says so. Every read is
 * versioned and wrapped in try/catch; anything unexpected resets to empty
 * rather than crashing.
 */
export type Stamp = {
  from: string; to: string;
  /** Visitor-local YYYY-MM-DD of first and latest visit. */
  first: string; last: string;
  visits: number;
  bestStreak: number;
  stars: number;
};

export type Passport = { v: 1; stamps: Record<string, Stamp> };
export type QuizStats = { v: 1; answered: number; correct: number };

const PASSPORT_KEY = "wdtdg.passport.v1";
const QUIZ_KEY = "wdtdg.quiz.v1";
export const PASSPORT_EVENT = "wdtdg:passport";
export const OPEN_PASSPORT_EVENT = "wdtdg:open-passport";

/** Open the topbar stamp book from the pair-page HUD (step 9). */
export function openPassport() {
  window.dispatchEvent(new Event(OPEN_PASSPORT_EVENT));
}

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function read<T extends { v: 1 }>(key: string, empty: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1) return empty;
    return parsed as T;
  } catch { return empty; }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(PASSPORT_EVENT));
  } catch {}
}

export function getPassport(): Passport {
  return read<Passport>(PASSPORT_KEY, { v: 1, stamps: {} });
}

export function getQuizStats(): QuizStats {
  return read<QuizStats>(QUIZ_KEY, { v: 1, answered: 0, correct: 0 });
}

/** Record a route visit — at most one `visits` increment per local day. */
export function recordVisit(slug: string, fromName: string, toName: string): void {
  const p = getPassport();
  const now = today();
  const s = p.stamps[slug];
  if (!s) {
    p.stamps[slug] = { from: fromName, to: toName, first: now, last: now, visits: 1, bestStreak: 0, stars: 0 };
  } else {
    if (s.last === now) return;
    s.last = now;
    s.visits += 1;
  }
  write(PASSPORT_KEY, p);
}

/** Raise a route's best streak / stars, monotonically. */
export function recordQuiz(slug: string, streak: number, stars: number): void {
  const p = getPassport();
  const s = p.stamps[slug];
  if (!s) return; // visit is always recorded before the quiz can be played
  if (streak <= s.bestStreak && stars <= s.stars) return;
  s.bestStreak = Math.max(s.bestStreak, streak);
  s.stars = Math.max(s.stars, stars);
  write(PASSPORT_KEY, p);
}

export function bumpQuizStats(correct: boolean): void {
  const q = getQuizStats();
  q.answered += 1;
  if (correct) q.correct += 1;
  write(QUIZ_KEY, q);
}

/** Unique cities across all stamp slugs. Slugs never contain "-to-" (invariant 9). */
export function citiesVisited(p: Passport): number {
  const set = new Set<string>();
  for (const slug of Object.keys(p.stamps)) {
    const [a, b] = slug.split("-to-");
    if (a) set.add(a);
    if (b) set.add(b);
  }
  return set.size;
}
