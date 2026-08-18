/**
 * Guess-the-time quiz logic. Pure and deterministic (rand is injected) so the
 * distractor rules can be unit-tested. The gap itself always comes from
 * gapMinutes(new Date(), …) at question time — today's real offset, half- and
 * quarter-hour zones included.
 */
export type Question = {
  /** Which city the known time is stated in. */
  askCity: "from" | "to";
  /** The stated wall time, minutes after midnight. */
  askMin: number;
  /** The correct wall time in the other city. */
  answerMin: number;
  /** Whether the correct answer lands on the next (+1) or previous (−1) day. */
  rolls: -1 | 0 | 1;
  /** Four option values in minutes-after-midnight, shuffled. */
  options: number[];
  correctIdx: number;
};

const mod1440 = (m: number) => ((m % 1440) + 1440) % 1440;

/** Difficulty from the current streak: 1 → 2 → 3. */
export function levelFor(streak: number): number {
  return Math.min(3, Math.floor(streak / 3) + 1);
}

export function makeQuestion(gapMin: number, level: number, rand: () => number): Question {
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];

  // L1–L2 always ask from→to; L3 flips direction half the time.
  const askCity: "from" | "to" = level >= 3 && rand() < 0.5 ? "to" : "from";
  const g = askCity === "from" ? gapMin : -gapMin;

  const hour =
    level === 1 ? 7 + Math.floor(rand() * 14) : Math.floor(rand() * 24);
  const minute = level >= 3 && rand() < 0.5 ? 30 : 0;
  const askMin = hour * 60 + minute;

  const raw = askMin + g;
  const answerMin = mod1440(raw);
  const rolls: -1 | 0 | 1 = raw >= 1440 ? 1 : raw < 0 ? -1 : 0;

  const fractional = ((g % 60) + 60) % 60 !== 0;
  const candidates: number[] = [];
  // 1. wrong sign — the classic error (useless when the clocks agree)
  if (mod1440(g) !== 0) candidates.push(mod1440(askMin - g));
  // 2. dropped minutes — right hour, wrong minutes (the Delhi/Kathmandu trap)
  candidates.push(
    fractional
      ? mod1440(askMin + 60 * Math.round(g / 60))
      : mod1440(answerMin + (rand() < 0.5 ? 60 : -60)),
  );
  // 3. near miss
  candidates.push(mod1440(answerMin + pick(fractional ? [-30, 30, -120, 120] : [-120, 120])));
  // 4. fallback pool
  candidates.push(mod1440(answerMin + 180), mod1440(answerMin - 180), askMin);

  const options = [answerMin];
  for (let c of candidates) {
    if (options.length === 4) break;
    let guard = 0;
    while (options.includes(c) && guard++ < 24) c = mod1440(c + 60);
    if (!options.includes(c)) options.push(c);
  }
  // Fisher–Yates with the injected rand
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { askCity, askMin, answerMin, rolls, options, correctIdx: options.indexOf(answerMin) };
}

/** Stars earned at a streak length: 3 → 1, 5 → 2, 10 → 3. */
export function starsFor(streak: number): number {
  return streak >= 10 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;
}
