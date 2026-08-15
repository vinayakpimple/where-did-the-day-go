import type { Messages } from "./i18n";
import { t } from "./i18n";

/** What a child that age is plausibly doing at a given local hour. */
type Slot = { end: number; emoji: string; key: string };

const SLOTS: Slot[] = [
  { end: 6, emoji: "😴", key: "asleep" },
  { end: 8, emoji: "🌅", key: "waking" },
  { end: 9, emoji: "🥣", key: "breakfast" },
  { end: 12, emoji: "📚", key: "school" },
  { end: 14, emoji: "🍛", key: "lunch" },
  { end: 16, emoji: "✏️", key: "afternoon" },
  { end: 18, emoji: "⚽", key: "playing" },
  { end: 20, emoji: "🍽️", key: "dinner" },
  { end: 22, emoji: "📖", key: "bedtime" },
  { end: 24, emoji: "🌙", key: "lightsOut" },
];

/** No school on Saturday or Sunday — decided per city, since the two can differ. */
const WEEKEND_SWAP: Record<string, { emoji: string; key: string }> = {
  school: { emoji: "🛝", key: "weekendMorning" },
  afternoon: { emoji: "🎨", key: "weekendAfternoon" },
};

function slotFor(hour: number, weekend: boolean) {
  const s = SLOTS.find((x) => hour < x.end) ?? SLOTS[SLOTS.length - 1];
  const swap = weekend ? WEEKEND_SWAP[s.key] : undefined;
  return swap ? { emoji: swap.emoji, key: swap.key } : { emoji: s.emoji, key: s.key };
}

/** Short label with emoji, for the pill on a clock card. */
export function activityBadge(msgs: Messages, hour: number, weekend: boolean): string {
  const s = slotFor(hour, weekend);
  return `${s.emoji} ${t(msgs, `badge.${s.key}`)}`;
}

/** Verb phrase that reads inside a sentence. */
export function activityVerb(msgs: Messages, hour: number, weekend: boolean): string {
  return t(msgs, `act.${slotFor(hour, weekend).key}`);
}

export function activityEmoji(hour: number, weekend: boolean): string {
  return slotFor(hour, weekend).emoji;
}

/* ---------------- sky ---------------- */

/** Gradients run dark-top to bright-bottom; kept dark enough for light ink except in `brightSky` hours. */
export function sky(h: number): string {
  if (h < 5) return "linear-gradient(180deg,#07091a,#0d1330)";
  if (h < 7) return "linear-gradient(180deg,#241d45,#5e3340)";
  if (h < 9) return "linear-gradient(180deg,#79aede,#f6cd93)";
  if (h < 16) return "linear-gradient(180deg,#5aa1e8,#b3d9f7)";
  if (h < 18) return "linear-gradient(180deg,#6b9edb,#f4b877)";
  if (h < 20) return "linear-gradient(180deg,#242449,#83402f)";
  if (h < 22) return "linear-gradient(180deg,#141a3a,#3a2f57)";
  return "linear-gradient(180deg,#07091a,#111737)";
}

/** Hours whose gradient is bright top-to-bottom — those cards flip to dark ink. */
export function brightSky(h: number): boolean {
  return h >= 7 && h < 18;
}

export function isDaylight(h: number): boolean {
  return h >= 6 && h < 19;
}
