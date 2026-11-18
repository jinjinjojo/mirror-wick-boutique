// Live market data straight from the visitor's browser, no keys:
//   stats  → DexScreener  tokens/v1/solana/{mint}          (every 30 s)
//   trades → GeckoTerminal pools/{pool}/trades               (every 12 s, only when a section asks for them)
// One instance per page; sections subscribe to it. Pauses while the tab is hidden.

const DS = (mint) => `https://api.dexscreener.com/tokens/v1/solana/${mint}`;
const GT_TRADES = (pool) => `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/trades`;
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function pickPair(pairs, preferred = "") {
  if (!Array.isArray(pairs) || !pairs.length) return null;
  if (preferred) {
    const hit = pairs.find((p) => p?.pairAddress === preferred);
    if (hit) return hit;
  }
  return pairs.reduce((best, p) => ((num(p?.liquidity?.usd) ?? -1) > (num(best?.liquidity?.usd) ?? -1) ? p : best));
}

export function statsFromPair(p) {
  return {
    priceUsd: num(p?.priceUsd),
    change24h: num(p?.priceChange?.h24),
    marketCap: num(p?.marketCap) ?? num(p?.fdv),
    fdv: num(p?.fdv),
    liquidityUsd: num(p?.liquidity?.usd),
    volume24h: num(p?.volume?.h24),
    buys24h: num(p?.txns?.h24?.buys),
    sells24h: num(p?.txns?.h24?.sells),
    pairUrl: p?.url ?? null,
    pairAddress: p?.pairAddress ?? null,
    dexId: p?.dexId ?? null,
  };
}

export function tradesFromGecko(json, seen) {
  const rows = Array.isArray(json?.data) ? json.data : [];
  const out = [];
  for (const r of rows) {
    const a = r?.attributes ?? {};
    const id = r?.id ?? a.tx_hash;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const side = a.kind === "sell" ? "sell" : "buy";
    out.push({
      id,
      side,
      usd: num(a.volume_in_usd) ?? 0,
      tokenAmount: num(side === "buy" ? a.to_token_amount : a.from_token_amount) ?? 0,
      wallet: a.tx_from_address ?? "",
      time: Date.parse(a.block_timestamp) || Date.now(),
      tx: a.tx_hash ?? "",
    });
  }
  return out.sort((x, y) => x.time - y.time);
}

export function createLive({ mint = "", pair = "", fetchImpl = globalThis.fetch?.bind(globalThis), statsEvery = 30000, tradesEvery = 12000 } = {}) {
  const subs = new Set();
  const seen = new Set();
  const state = { status: mint ? "loading" : "prelaunch", stats: null, trades: [] };
  let pool = pair || "";
  let firstTrades = true;
  let wantTrades = false;
  let statsTimer = 0;
  let tradesTimer = 0;
  let running = false;

  const emit = (e) => subs.forEach((fn) => {
    try {
      fn(e);
    } catch (err) {
      console.error(err);
    }
  });
  const setStatus = (s) => {
    if (state.status === s) return;
    state.status = s;
    emit({ type: "status", status: s });
  };

  async function refresh() {
    if (!mint) {
      setStatus("prelaunch");
      return;
    }
    try {
      const res = await fetchImpl(DS(mint));
      if (!res?.ok) throw new Error(`DexScreener ${res?.status}`);
      const body = await res.json();
      const p = pickPair(Array.isArray(body) ? body : body?.pairs, pair);
      if (!p) {
        setStatus("nopair");
        return;
      }
      state.stats = statsFromPair(p);
      if (!pool && state.stats.pairAddress) pool = state.stats.pairAddress;
      emit({ type: "stats", stats: state.stats });
      setStatus("live");
    } catch {
      setStatus(state.stats ? "live" : "error");
    }
  }

  async function refreshTrades() {
    if (!mint || !pool) return;
    try {
      const res = await fetchImpl(GT_TRADES(pool));
      if (!res?.ok) throw new Error(`GeckoTerminal ${res?.status}`);
      let fresh = tradesFromGecko(await res.json(), seen);
      if (firstTrades) {
        fresh = fresh.slice(-12);
        firstTrades = false;
      }
      if (!fresh.length) return;
      state.trades = [...state.trades, ...fresh].slice(-200);
      emit({ type: "trades", trades: fresh });
    } catch {
      /* keep the last good trades; try again next tick */
    }
  }

  const visible = () => typeof document === "undefined" || !document.hidden;
  function loop() {
    clearTimeout(statsTimer);
    statsTimer = setTimeout(async () => {
      if (visible()) await refresh();
      if (running) loop();
    }, statsEvery);
  }
  function tradeLoop() {
    clearTimeout(tradesTimer);
    tradesTimer = setTimeout(async () => {
      if (visible()) await refreshTrades();
      if (running && wantTrades) tradeLoop();
    }, tradesEvery);
  }

  return {
    subscribe(fn) {
      subs.add(fn);
      fn({ type: "status", status: state.status });
      if (state.stats) fn({ type: "stats", stats: state.stats });
      return () => subs.delete(fn);
    },
    getState: () => ({ status: state.status, stats: state.stats, trades: [...state.trades] }),
    refresh,
    refreshTrades,
    async start() {
      if (running) return;
      running = true;
      await refresh();
      if (mint) loop();
    },
    async needTrades() {
      if (wantTrades || !mint) return;
      wantTrades = true;
      if (!state.stats) await refresh();
      await refreshTrades();
      if (running) tradeLoop();
    },
    stop() {
      running = false;
      clearTimeout(statsTimer);
      clearTimeout(tradesTimer);
    },
  };
}
