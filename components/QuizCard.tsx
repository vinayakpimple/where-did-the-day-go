"use client";

import { useEffect, useMemo, useState } from "react";
import { gapMinutes } from "@/lib/tz";
import { makeQuestion, levelFor, starsFor, type Question } from "@/lib/quiz";
import { recordQuiz, bumpQuizStats } from "@/lib/passport";
import * as sound from "@/lib/sound";
import { t, type Messages } from "@/lib/i18n";
import MiniClock from "@/components/MiniClock";
import Confetti from "@/components/Confetti";

type CityLite = { name: string; tz: string };

export default function QuizCard({
  from, to, pairSlug, msgs, locale,
}: { from: CityLite; to: CityLite; pairSlug: string; msgs: Messages; locale: string }) {
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [burst, setBurst] = useState(0);
  const [starLine, setStarLine] = useState(false);

  const fresh = () => {
    // Today's real gap, straight from Intl (invariant 1) — half/quarter zones included.
    const gap = gapMinutes(new Date(), from.tz, to.tz);
    setQ(makeQuestion(gap, levelFor(streak), Math.random));
    setPicked(null);
    setStarLine(false);
  };
  // First question client-side only (the gap depends on the visitor's "now").
  useEffect(fresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timeStr = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    return (min: number) => fmt.format(new Date(Date.UTC(2020, 0, 1, Math.floor(min / 60), min % 60)));
  }, [locale]);

  if (!q) {
    return (
      <div className="quizgrid" aria-busy="true">
        <div className="qopt skeleton" /><div className="qopt skeleton" />
        <div className="qopt skeleton" /><div className="qopt skeleton" />
      </div>
    );
  }

  const askName = q.askCity === "from" ? from.name : to.name;
  const otherName = q.askCity === "from" ? to.name : from.name;
  const askCol = q.askCity === "from" ? "var(--sf)" : "var(--del)";
  const otherCol = q.askCity === "from" ? "var(--del)" : "var(--sf)";
  const answered = picked !== null;
  const wasRight = answered && picked === q.correctIdx;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const right = i === q.correctIdx;
    bumpQuizStats(right);
    if (right) {
      const s = streak + 1;
      setStreak(s);
      setBest((b) => Math.max(b, s));
      setBurst((n) => n + 1);
      const stars = starsFor(s);
      if (stars > starsFor(s - 1)) {
        recordQuiz(pairSlug, s, stars);
        setStarLine(true);
        sound.fanfare();
      } else {
        sound.ding();
      }
    } else {
      recordQuiz(pairSlug, streak, starsFor(streak));
      setStreak(0);
      sound.tick();
    }
  };

  const rollChip = q.rolls === 1 ? t(msgs, "ribbon.nextDay") : q.rolls === -1 ? t(msgs, "ribbon.prevDay") : "";

  // Split on bracketed sentinels rather than spaces — CJK locales have no spaces.
  const questionParts = t(msgs, "quiz.question", {
    time: timeStr(q.askMin), city: "[[CITY]]", other: "[[OTHER]]",
  }).split(/(\[\[CITY\]\]|\[\[OTHER\]\])/);

  return (
    <div className="quizbox">
      <Confetti burst={burst} />
      <p className="quizq">
        {questionParts.map((part, i) =>
          part === "[[CITY]]" ? <b key={i} style={{ color: askCol }}>{askName}</b>
            : part === "[[OTHER]]" ? <b key={i} style={{ color: otherCol }}>{otherName}</b>
              : <span key={i}>{part}</span>)}
      </p>
      <div className="quizgrid">
        {q.options.map((opt, i) => (
          <button key={i} className="qopt"
            data-state={answered ? (i === q.correctIdx ? "correct" : i === picked ? "wrong" : "idle") : "idle"}
            disabled={answered}
            aria-label={`${timeStr(opt)}${i === q.correctIdx && rollChip ? ` (${rollChip})` : ""}`}
            onClick={() => choose(i)}>
            <MiniClock minutes={opt} />
            <span className="qtime" style={{ direction: "ltr" }}>{timeStr(opt)}</span>
            {rollChip && i === q.correctIdx && answered && <span className="qchip">{rollChip}</span>}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="quizresult">
        {answered && (wasRight
          ? t(msgs, "quiz.correct", { time: timeStr(q.answerMin) })
          : t(msgs, "quiz.wrong", { time: timeStr(q.answerMin) }))}
        {starLine && ` ${t(msgs, "quiz.starEarned")}`}
      </div>
      <div className="quizfoot">
        <span className="quizstreak">
          {t(msgs, "quiz.streak", { n: new Intl.NumberFormat(locale).format(streak) })}
          {" "}{"⭐".repeat(starsFor(Math.max(streak, 0)))}
          {best > 0 && ` · ${t(msgs, "quiz.best", { n: new Intl.NumberFormat(locale).format(best) })}`}
        </span>
        <button className="tab" onClick={fresh}>
          {answered && !wasRight ? t(msgs, "quiz.tryAgain") : t(msgs, "quiz.next")}
        </button>
      </div>
    </div>
  );
}
