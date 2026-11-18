// Mounts the DexScreener embed when the chart section comes near the viewport.

export function mountChart(frame) {
  const src = frame.dataset.embed;
  if (!src || frame.querySelector("iframe")) return;
  const iframe = document.createElement("iframe");
  iframe.title = "Live chart on DexScreener";
  iframe.src = src;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.allow = "clipboard-write";
  iframe.addEventListener("load", () => frame.querySelector(".chart-frame__loading")?.remove());
  frame.append(iframe);
}
