export function initPremiumCursor() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  if (reduced || touch) return;

  // Hide native cursor
  const style = document.createElement("style");
  style.textContent = "* { cursor: none !important; }";
  document.head.appendChild(style);

  // ---------------------------------------------------------------------
  // Lattice canvas — a soft field of nodes that drift, get nudged away
  // from the cursor, and connect to nearby neighbours + the cursor itself
  // with thin, distance-faded lines. Sits behind the dot/ring.
  // ---------------------------------------------------------------------
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position:fixed;
    inset:0;
    width:100vw;
    height:100vh;
    z-index:99997;
    pointer-events:none;
    opacity:0;
    transition:opacity .4s;
  `;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  type Node = {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
    phase: number;
  };

  const NODE_COUNT = 26;
  const LATTICE_RADIUS = 150; // how far from the cursor nodes appear
  const LINK_DIST = 68; // max distance for node-to-node links
  const CURSOR_LINK_DIST = 120; // max distance for node-to-cursor links
  const REPEL_RADIUS = 46;
  const REPEL_STRENGTH = 14;

  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * LATTICE_RADIUS;
    nodes.push({
      x: 0,
      y: 0,
      baseX: Math.cos(angle) * r,
      baseY: Math.sin(angle) * r,
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // ---------------------------------------------------------------------
  // Cursor dot
  // ---------------------------------------------------------------------
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
      background .25s,
      box-shadow .25s;
  `;

  // Optional label
  const label = document.createElement("div");
  label.style.cssText = `
    font-family:monospace;
    font-size:9px;
    text-transform:uppercase;
    letter-spacing:.06em;
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
  let active = false; // hover-active state (buttons/links)

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  function updateHover(target: HTMLElement) {
    const labelTarget = target?.closest?.("[data-cursor-label]") as HTMLElement | null;

    active =
      !!labelTarget ||
      !!target?.closest?.("button,a,[data-cursor]") ||
      /pointer|grab/.test(getComputedStyle(target).cursor);

    hovered = active;

    ring.style.borderColor = active ? "#7FA6FF" : "rgba(127,166,255,.75)";
    ring.style.background = active ? "rgba(60,116,255,.12)" : "transparent";
    ring.style.boxShadow = active
      ? "0 0 34px rgba(60,116,255,.35)"
      : "0 0 22px rgba(229,52,42,.18)";

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
    updateHover(e.target as HTMLElement);
  });

  document.addEventListener("pointerenter", () => {
    core.style.opacity = "1";
    ring.style.opacity = "1";
    canvas.style.opacity = "1";
  });

  document.addEventListener("pointerleave", () => {
    core.style.opacity = "0";
    ring.style.opacity = "0";
    canvas.style.opacity = "0";
  });

  ring._scale = 1;

  // ---------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------
  let t = 0;

  function drawLattice() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Nudge the cursor-facing intensity: lattice breathes wider + brighter
    // when hovering an interactive element.
    const intensity = active ? 1.4 : 1;
    const lineAlpha = active ? 0.22 : 0.14;
    const nodeAlpha = active ? 0.65 : 0.45;

    for (const n of nodes) {
      // Gentle organic drift (Perlin-ish via layered sine)
      const driftX = Math.sin(t * 0.0011 + n.phase) * 6;
      const driftY = Math.cos(t * 0.0013 + n.phase * 1.3) * 6;

      const targetX = mouseX + (n.baseX + driftX) * intensity;
      const targetY = mouseY + (n.baseY + driftY) * intensity;

      // Repel slightly from the exact cursor point for a "parting" feel
      const dx = targetX - mouseX;
      const dy = targetY - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let fx = targetX;
      let fy = targetY;
      if (dist < REPEL_RADIUS) {
        const push = (REPEL_RADIUS - dist) / REPEL_RADIUS;
        fx += (dx / dist) * push * REPEL_STRENGTH;
        fy += (dy / dist) * push * REPEL_STRENGTH;
      }

      n.x = lerp(n.x || fx, fx, 0.09);
      n.y = lerp(n.y || fy, fy, 0.09);
    }

    // Links: node-to-node
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK_DIST) {
          const alpha = (1 - d / LINK_DIST) * lineAlpha;
          ctx.strokeStyle = `rgba(127,166,255,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Links: node-to-cursor
    for (const n of nodes) {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < CURSOR_LINK_DIST) {
        const alpha = (1 - d / CURSOR_LINK_DIST) * (lineAlpha + 0.06);
        ctx.strokeStyle = `rgba(60,116,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
      }

      // Node dot
      const twinkle = 0.6 + 0.4 * Math.sin(t * 0.004 + n.phase * 2);
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(127,166,255,${nodeAlpha * twinkle})`;
      ctx.fill();
    }
  }

  function animate() {
    t += 16;

    core.style.transform = `translate(${mouseX}px, ${mouseY}px)`;

    ringX = lerp(ringX, mouseX, 0.18);
    ringY = lerp(ringY, mouseY, 0.18);

    ring.style.transform = `translate(${ringX}px, ${ringY}px) scale(${ring._scale})`;

    drawLattice();

    requestAnimationFrame(animate);
  }

  animate();
}