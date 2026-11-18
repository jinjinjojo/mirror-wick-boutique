// Fills the stats section from the shared live source; flashes values that change.
import { fmtPrice, fmtCompact, fmtPct, fmtInt } from "./format.js";

const NOTE = {
  loading: "Loading live numbers…",
  nopair: "Waiting for the first trade to show up on DexScreener.",
  error: "Live data is busy right now. Retrying automatically.",
};

export function bindStats(section, live) {
  if (!live) return;
  const cells = new Map([...section.querySelectorAll("[data-stat]")].map((el) => [el.dataset.stat, el]));
  const note = section.querySelector(".stats__note");
  const baseNote = note?.lastChild?.textContent ?? "";
  const set = (key, value, sub = "", tone = "") => {
    const cell = cells.get(key);
    if (!cell) return;
    const v = cell.querySelector("[data-v]");
    const s = cell.querySelector("[data-sub]");
    if (v && v.textContent !== value) {
      v.textContent = value;
      cell.classList.remove("is-flash");
      void cell.offsetWidth;
      cell.classList.add("is-flash");
    }
    if (v) v.className = `stat__value num${tone ? ` ${tone}` : ""}`;
    if (s) s.textContent = sub;
  };
  live.subscribe((e) => {
    if (e.type === "status") {
      if (e.status === "prelaunch") return;
      section.removeAttribute("data-prelaunch");
      if (note?.lastChild) note.lastChild.textContent = NOTE[e.status] ?? baseNote;
      note?.querySelector(".live-dot")?.classList.toggle("live-dot--off", e.status !== "live");
    }
    if (e.type === "stats") {
      const st = e.stats;
      const tone = st.change24h > 0 ? "up" : st.change24h < 0 ? "down" : "";
      set("price", fmtPrice(st.priceUsd), st.change24h == null ? "" : `${fmtPct(st.change24h)} 24h`, "");
      cells.get("price")?.querySelector("[data-sub]")?.classList.toggle("up", tone === "up");
      cells.get("price")?.querySelector("[data-sub]")?.classList.toggle("down", tone === "down");
      set("marketCap", fmtCompact(st.marketCap));
      set("fdv", fmtCompact(st.fdv));
      set("liquidity", fmtCompact(st.liquidityUsd));
      set("volume", fmtCompact(st.volume24h));
      const trades = st.buys24h == null && st.sells24h == null ? null : (st.buys24h ?? 0) + (st.sells24h ?? 0);
      set("txns", fmtInt(trades), trades == null ? "" : `${fmtInt(st.buys24h)} buys · ${fmtInt(st.sells24h)} sells`);
      set("change", fmtPct(st.change24h), "", tone);
    }
  });
}
