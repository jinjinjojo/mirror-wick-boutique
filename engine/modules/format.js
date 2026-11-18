// Number and time formatting for live market data. Pure functions (unit-tested).

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const ok = (n) => typeof n === "number" && Number.isFinite(n);

export function fmtPrice(n) {
  if (!ok(n)) return "—";
  if (n >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n === 0) return "$0";
  const leading = -Math.floor(Math.log10(n)) - 1; // zeros right after "0.", e.g. 0.000001973 → 5
  if (leading >= 4) {
    // DexScreener style: $0.0₅1973 means five zeros after the decimal point, then 1973.
    const digits = (n * 10 ** (leading + 1)).toPrecision(4).replace(".", "").replace(/0+$/, "").slice(0, 4);
    const sub = String(leading)
      .split("")
      .map((d) => SUB[Number(d)])
      .join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${Number(n.toPrecision(4)).toString()}`;
}

export function fmtCompact(n) {
  if (!ok(n)) return "—";
  const abs = Math.abs(n);
  const trim = (x) => x.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1e9) return `$${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `$${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `$${trim(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

export function fmtPct(n) {
  if (!ok(n)) return "—";
  if (n === 0) return "0.0%";
  return `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
}

export const fmtInt = (n) => (ok(n) ? Math.round(n).toLocaleString("en-US") : "—");

export const shortAddr = (a) => (a && a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a || "");

export function timeAgo(t, now = Date.now()) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Countdown text for the launch time: "1d 04:05:06" before, "Launching now" for an hour after, then "Launching soon". */
export function countdownText(ms) {
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return ms > -3600000 ? "Launching now" : "Launching soon";
  const pad = (n) => String(n).padStart(2, "0");
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${d ? `${d}d ` : ""}${pad(h)}:${pad(m)}:${pad(s)}`;
}
