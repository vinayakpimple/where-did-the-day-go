"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, RANKED, pairSlug, type City } from "@/lib/cities";
import { t, type Messages } from "@/lib/i18n";

function norm(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function Field({
  id, label, value, onPick, placeholder, exclude, msgs,
}: {
  id: string; label: string; value: City | null; onPick: (c: City) => void;
  placeholder: string; exclude?: string; msgs: Messages;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const n = norm(q.trim());
    const pool = CITIES.filter((c) => c.slug !== exclude);
    if (!n) return RANKED.filter((c) => c.slug !== exclude).slice(0, 8);
    return pool
      .filter((c) =>
        norm(c.name).includes(n) || norm(c.country).includes(n) ||
        c.slug.includes(n) || (c.aka ?? []).some((a) => norm(a).includes(n)))
      .sort((a, b) => {
        const as = norm(a.name).startsWith(n) ? 0 : 1;
        const bs = norm(b.name).startsWith(n) ? 0 : 1;
        return as - bs || b.rank - a.rank;
      })
      .slice(0, 10);
  }, [q, exclude]);

  return (
    <div className="pf">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" autoComplete="off" placeholder={placeholder}
        value={open ? q : value?.name ?? ""}
        onFocus={() => { setOpen(true); setQ(""); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" />
      {open && (
        <ul id={`${id}-list`} role="listbox">
          {results.length === 0 && <li style={{ padding: "10px 12px", color: "var(--muted)" }}>
            {t(msgs, "home.pick.noResults")}
          </li>}
          {results.map((c) => (
            <li key={c.slug} role="option" aria-selected={value?.slug === c.slug}>
              <button type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(c); setOpen(false); }}>
                <span>{c.name}</span><span className="cc">{c.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CityPicker({
  locale, msgs, initialFrom, initialTo, onChange,
}: {
  locale: string; msgs: Messages; initialFrom: City; initialTo: City;
  onChange?: (from: City, to: City) => void;
}) {
  const router = useRouter();
  const [from, setFromState] = useState<City | null>(initialFrom);
  const [to, setToState] = useState<City | null>(initialTo);

  const setFrom = (c: City | null) => {
    setFromState(c);
    if (c && to && c.slug !== to.slug) onChange?.(c, to);
  };
  const setTo = (c: City | null) => {
    setToState(c);
    if (from && c && from.slug !== c.slug) onChange?.(from, c);
  };

  const ready = from && to && from.slug !== to.slug;
  const href = ready ? `/${locale}/${pairSlug(from.slug, to.slug)}` : "#";

  return (
    <div>
      <div className="picker">
        <Field id="from" label={t(msgs, "home.pick.from")} value={from}
          onPick={setFrom} placeholder={t(msgs, "home.pick.search")}
          exclude={to?.slug} msgs={msgs} />
        <button className="swapbtn" type="button" aria-label={t(msgs, "route.swap")}
          onClick={() => {
            const a = from, b = to;
            setFromState(b); setToState(a);
            if (a && b) onChange?.(b, a);
          }}>⇄</button>
        <Field id="to" label={t(msgs, "home.pick.to")} value={to}
          onPick={setTo} placeholder={t(msgs, "home.pick.search")}
          exclude={from?.slug} msgs={msgs} />
      </div>
      <a className="gobtn" href={href} aria-disabled={!ready}
        onClick={(e) => { if (ready) { e.preventDefault(); router.push(href); } }}>
        {t(msgs, "home.pick.go")}
      </a>
    </div>
  );
}
