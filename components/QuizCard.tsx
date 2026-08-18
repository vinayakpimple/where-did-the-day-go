"use client";

import { useEffect, useMemo, useState } from "react";
import { gapMinutes } from "@/lib/tz";
import { makeQuestion, type Question } from "@/lib/quiz";
import { recordVisit, recordQuiz, bumpQuizStats } from "@/lib/passport";
import * as sound from "@/lib/sound";
import { t, type Messages } from "@/lib/i18n";
import MiniClock from "@/components/MiniClock";
import Confetti from "@/components/Confetti";

type CityLite = { name: string; tz: string };

const QUIZ_LEN = 3;

export default function QuizCard({
  from, to, pairSlug, msgs, locale, dstKey, onFocus, onStamped,
}: {
  from: CityLite; to: CityLite; pairSlug: string; msgs: Messages; locale: string;
  dstKey: string;
  onFocus?: () => void;
  onStamped?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const [stamped, setStamped] = useState(false);
  const [dstPick, setDstPick] = useState<null | "same" | "change">(null);

  const askDst = dstKey !== "neither" && idx === 2;

  const fresh = (n: number) => {
    const gap = gapMinutes(new Date(), from.tz, to.tz);
    setQ(makeQuestion(gap, 1, Math.random));
    setPicked(null);
    setDstPick(null);
    setIdx(n);
  };
  useEffect(() => { fresh(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timeStr = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    return (min: number) => fmt.format(new Date(Date.UTC(2020, 0, 1, Math.floor(min / 60), min % 60)));
  }, [locale]);

  const stampOnce = () => {
    if (stamped) return;
    recordVisit(pairSlug, from.name, to.name);
    recordQuiz(pairSlug, 1, 1);
    setStamped(true);
    onStamped?.();
  };

  const mark = (right: boolean) => {
    bumpQuizStats(right);
    if (right) {
      stampOnce();
      setBurst((n) => n + 1);
      sound.ding();
    } else {
      sound.tick();
    }
  };

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
  const answered = askDst ? dstPick !== null : picked !== null;
  const dstCorrect = dstKey === "neither" ? "same" : "change";
  const wasRight = askDst
    ? dstPick === dstCorrect
    : picked === q.correctIdx;
  const done = idx >= QUIZ_LEN - 1 && answered;

  const questionParts = t(msgs, "quiz.question", {
    time: timeStr(q.askMin), city: "[[CITY]]", other: "[[OTHER]]",
  }).split(/(\[\[CITY\]\]|\[\[OTHER\]\])/);
  const rollChip = q.rolls === 1 ? t(msgs, "ribbon.nextDay") : q.rolls === -1 ? t(msgs, "ribbon.prevDay") : "";

  return (
    <div className="quizbox" onFocus={onFocus}>
      <Confetti burst={burst} />
      {askDst ? (
        <p className="quizq">{t(msgs, "quiz.dst.q")}</p>
      ) : (
        <p className="quizq">
          {questionParts.map((part, i) =>
            part === "[[CITY]]" ? <b key={i} style={{ color: askCol }}>{askName}</b>
              : part === "[[OTHER]]" ? <b key={i} style={{ color: otherCol }}>{otherName}</b>
                : <span key={i}>{part}</span>)}
        </p>
      )}

      {askDst ? (
        <div className="quizgrid">
          {(["same", "change"] as const).map((opt) => (
            <button key={opt} className="qopt"
              data-state={answered ? (opt === dstCorrect ? "correct" : opt === dstPick ? "wrong" : "idle") : "idle"}
              disabled={answered}
              onClick={() => { if (answered) return; setDstPick(opt); mark(opt === dstCorrect); }}>
              <span className="qtime">{t(msgs, opt === "same" ? "quiz.dst.same" : "quiz.dst.change")}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="quizgrid">
          {q.options.map((opt, i) => (
            <button key={i} className="qopt"
              data-state={answered ? (i === q.correctIdx ? "correct" : i === picked ? "wrong" : "idle") : "idle"}
              disabled={answered}
              aria-label={`${timeStr(opt)}${i === q.correctIdx && rollChip ? ` (${rollChip})` : ""}`}
              onClick={() => { if (answered) return; setPicked(i); mark(i === q.correctIdx); }}>
              <MiniClock minutes={opt} />
              <span className="qtime" style={{ direction: "ltr" }}>{timeStr(opt)}</span>
              {rollChip && i === q.correctIdx && answered && <span className="qchip">{rollChip}</span>}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="quizresult">
        {answered && (wasRight
          ? (askDst ? t(msgs, "quiz.dst.correct") : t(msgs, "quiz.correct", { time: timeStr(q.answerMin) }))
          : (askDst ? t(msgs, "quiz.dst.wrong") : t(msgs, "quiz.wrong", { time: timeStr(q.answerMin) })))}
        
      </div>
      <div className="quizfoot">
        <span className="quizstreak">{t(msgs, "quiz.progress", { n: String(idx + 1), total: String(QUIZ_LEN) })}</span>
        {!done && (
          <button className="tab" onClick={() => fresh(idx + 1)}>
            {answered && !wasRight ? t(msgs, "quiz.tryAgain") : t(msgs, "quiz.next")}
          </button>
        )}
      </div>
    </div>
  );
}
