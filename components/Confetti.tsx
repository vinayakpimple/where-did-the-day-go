"use client";

/**
 * CSS-only confetti. Re-renders 24 falling pieces every time `burst` changes;
 * under prefers-reduced-motion the CSS swaps the animation for a single static
 * star fade (see globals.css).
 */
export default function Confetti({ burst }: { burst: number }) {
  if (!burst) return null;
  const colors = ["var(--sf)", "var(--del)", "var(--acc)", "#fff"];
  return (
    <div className="confetti" key={burst} aria-hidden="true">
      <span className="confetti-star">⭐</span>
      {Array.from({ length: 24 }, (_, i) => (
        <i key={i} style={{
          insetInlineStart: `${(i * 41) % 100}%`,
          background: colors[i % 4],
          ["--dx" as string]: `${((i * 67) % 240) - 120}px`,
          ["--dr" as string]: `${((i * 131) % 720) - 360}deg`,
          animationDelay: `${(i * 37) % 200}ms`,
        }} />
      ))}
    </div>
  );
}
