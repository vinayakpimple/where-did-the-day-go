import { ImageResponse } from "next/og";
import { parsePair } from "@/lib/cities";
import { isLocale, getMessages, t } from "@/lib/i18n";
import { routeFacts } from "@/lib/route-facts";
import { clock12, weekdayName } from "@/lib/tz";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export const alt = "Two city clocks and the time gap between them";

type Props = { params: Promise<{ locale: string; pair: string }> };

export default async function Image({ params }: Props) {
  const { locale, pair } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const parsed = parsePair(pair);
  const msgs = await getMessages(loc);

  if (!parsed) {
    return new ImageResponse(
      <Card title={t(msgs, "site.name")} line={t(msgs, "site.tagline")} />,
      { ...size },
    );
  }

  const { from, to } = parsed;
  const f = routeFacts(from, to, loc, msgs);
  const fromTime = clock12(f.nowParts.from.hour, f.nowParts.from.minute, loc);
  const toTime = clock12(f.nowParts.to.hour, f.nowParts.to.minute, loc);
  const fromDay = weekdayName(f.nowParts.from, loc);
  const toDay = weekdayName(f.nowParts.to, loc);
  const sameDay =
    f.nowParts.from.day === f.nowParts.to.day &&
    f.nowParts.from.month === f.nowParts.to.month &&
    f.nowParts.from.year === f.nowParts.to.year;

  const gapLine = f.gap === 0
    ? t(msgs, "route.subtitle.same", { from: from.name, to: to.name, gap: f.gapLabel })
    : t(msgs, f.gap > 0 ? "route.subtitle.ahead" : "route.subtitle.behind", {
      from: from.name, to: to.name, gap: f.gapLabel,
    });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "#080c17",
          backgroundImage:
            "radial-gradient(900px 420px at 8% -10%, rgba(57,135,229,0.28), transparent 60%), radial-gradient(720px 380px at 96% 8%, rgba(201,133,0,0.22), transparent 58%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 700, color: "#c5cbdb" }}>
          <div style={{
            width: 14, height: 14, borderRadius: 99,
            background: "linear-gradient(94deg,#3987e5,#c98500)",
          }} />
          {t(msgs, "site.name")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            {from.name} → {to.name}
          </div>
          <div style={{ fontSize: 30, fontWeight: 750, color: "#199e70" }}>{gapLine}</div>
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          <TimeCard name={from.name} time={fromTime} day={fromDay} accent="#3987e5" />
          <TimeCard name={to.name} time={toTime} day={toDay} accent="#c98500" later={!sameDay} />
        </div>
      </div>
    ),
    { ...size },
  );
}

function Card({ title, line }: { title: string; line: string }) {
  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: 64, background: "#080c17", color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 52, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 26, color: "#c5cbdb", marginTop: 12 }}>{line}</div>
    </div>
  );
}

function TimeCard({
  name, time, day, accent, later,
}: { name: string; time: string; day: string; accent: string; later?: boolean }) {
  return (
    <div
      style={{
        flex: 1, display: "flex", flexDirection: "column", gap: 6,
        background: "#0f1524", border: "1px solid rgba(255,255,255,0.11)",
        borderRadius: 24, padding: "22px 26px",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 750, color: accent }}>{name}</div>
      <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em" }}>{time}</div>
      <div style={{ fontSize: 20, color: "#c5cbdb", fontWeight: 650 }}>
        {day}{later ? " · →" : ""}
      </div>
    </div>
  );
}
