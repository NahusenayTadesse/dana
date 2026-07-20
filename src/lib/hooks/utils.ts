export function initCustomCursor() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  if (reduced || touch) return;

  // Hide native cursor
  const style = document.createElement("style");
  style.textContent = "* { cursor: none !important; }";
  document.head.appendChild(style);

  // Cursor dot
  const core = document.createElement("div");
  core.style.cssText = `
    position:fixed;
    left:-4px;
    top:-4px;
    width:7px;
    height:7px;
    border-radius:50%;
    background:#3C74FF;
    box-shadow:
      0 0 10px rgba(60,116,255,.95),
      0 0 26px rgba(60,116,255,.55);
    z-index:99999;
    pointer-events:none;
    will-change:transform;
    transition:opacity .2s;
  `;

  // Cursor ring
  const ring = document.createElement("div");
  ring.style.cssText = `
    position:fixed;
    left:-19px;
    top:-19px;
    width:38px;
    height:38px;
    border-radius:50%;
    border:1.5px solid rgba(127,166,255,.75);
    background:transparent;
    box-shadow:0 0 22px rgba(229,52,42,.18);
    display:flex;
    align-items:center;
    justify-content:center;
    pointer-events:none;
    z-index:99998;
    will-change:transform;
    transition:
      border-color .25s,
      background .25s;
  `;

  // Optional label
  const label = document.createElement("div");
  label.style.cssText = `
    font-family:monospace;
    font-size:9px;
    text-transform:uppercase;
    color:white;
    white-space:nowrap;
    opacity:0;
    transition:opacity .2s;
  `;

  ring.appendChild(label);
  document.body.appendChild(ring);
  document.body.appendChild(core);

  let mouseX = -9999;
  let mouseY = -9999;
  let ringX = -9999;
  let ringY = -9999;
  let hovered = false;

  const lerp = (a, b, t) => a + (b - a) * t;

  function updateHover(target) {
    const labelTarget = target?.closest?.("[data-cursor-label]");

    const active =
      !!labelTarget ||
      !!target?.closest?.("button,a,[data-cursor]") ||
      /pointer|grab/.test(getComputedStyle(target).cursor);

    hovered = active;

    ring.style.borderColor = active
      ? "#7FA6FF"
      : "rgba(127,166,255,.75)";

    ring.style.background = active
      ? "rgba(60,116,255,.12)"
      : "transparent";

    core.style.opacity = active ? "0" : "1";

    label.textContent = labelTarget?.dataset.cursorLabel || "";
    label.style.opacity = labelTarget ? "1" : "0";

    ring._scale = active ? 1.53 : 1;
  }

  document.addEventListener("pointermove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener("pointerover", (e) => {
    updateHover(e.target);
  });

  document.addEventListener("pointerenter", () => {
    core.style.opacity = "1";
    ring.style.opacity = "1";
  });

  document.addEventListener("pointerleave", () => {
    core.style.opacity = "0";
    ring.style.opacity = "0";
  });

  ring._scale = 1;

  function animate() {
    core.style.transform = `translate(${mouseX}px, ${mouseY}px)`;

    ringX = lerp(ringX, mouseX, 0.18);
    ringY = lerp(ringY, mouseY, 0.18);

    ring.style.transform = `translate(${ringX}px, ${ringY}px) scale(${ring._scale})`;

    requestAnimationFrame(animate);
  }

  animate();
}