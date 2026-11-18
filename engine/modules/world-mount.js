// Loads the 3D world module (engine/world/world.js, Three.js vendored) only when its section is near.

export async function mountWorldSection(section, { live, reduced }) {
  const stage = section.querySelector("[data-world-stage]");
  let opts = {};
  try {
    opts = JSON.parse(section.dataset.world);
  } catch {
    section.classList.add("is-failed");
    return;
  }
  try {
    const { mountWorld } = await import("../world/world.js");
    if (live && !opts.demo) live.needTrades?.();
    const liveSource = live ?? {
      subscribe(fn) {
        fn({ type: "status", status: "prelaunch" });
        return () => {};
      },
      getState: () => ({ status: "prelaunch", stats: null, trades: [] }),
    };
    await mountWorld(stage, { ...opts, live: liveSource, reducedMotion: reduced });
    section.classList.add("is-mounted");
  } catch (e) {
    section.classList.add("is-failed");
    console.warn("world: staying on the fallback image", e);
  }
}
