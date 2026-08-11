<script>
  import { onMount } from 'svelte';

  // Tuning knobs (can also be passed as props if you prefer)
  let gap = 42;      // px between dots / grid lines — sparser, so the field reads as texture
  let radius = 100;  // px radius of cursor influence — a tighter, more local reaction
  let push = 12;     // max px a dot is pushed away — a nudge rather than a shove

  let canvas;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    let dpr = 1, w = 0, h = 0, dots = [];
    const mouse = { x: -9999, y: -9999 };
    let raf;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = gap / 2; y < h + gap; y += gap)
        for (let x = gap / 2; x < w + gap; x += gap)
          dots.push({ bx: x, by: y, x, y });
    };

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // faint grid lines
      ctx.strokeStyle = 'rgba(30,82,168,0.015)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = gap / 2; x < w; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = gap / 2; y < h; y += gap) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      // dots
      for (const d of dots) {
        const dx = d.bx - mouse.x, dy = d.by - mouse.y;
        const dist = Math.hypot(dx, dy);
        let tx = d.bx, ty = d.by, near = 0;
        if (dist < radius) {
          near = 1 - dist / radius;
          const f = near * push;
          const a = Math.atan2(dy, dx);
          tx = d.bx + Math.cos(a) * f;
          ty = d.by + Math.sin(a) * f;
        }
        // slower easing — the field drifts back rather than snapping
        d.x += (tx - d.x) * 0.10;
        d.y += (ty - d.y) * 0.10;
        // dots barely grow near the cursor now (was 1.4 → 3.6px)
        const r = 1.1 + near * 0.8;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fillStyle = near > 0
          ? `rgba(44,111,214,${0.07 + near * 0.08})`
          : 'rgba(30,82,168,0.05)';
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    build();
    draw();
    window.addEventListener('resize', build);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    // cleanup on destroy / HMR
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  });
</script>

<canvas bind:this={canvas}></canvas>

<!-- Optional decorative blobs — delete if you don't want them -->
<div class="blob blob--blue"></div>
<div class="blob blob--red"></div>

<style>
  /* z-index -1, not 0: a fixed element at 0 still paints above static page
     content in the same stacking context, so these decorations washed over
     body text. pointer-events:none only stopped them swallowing clicks. */
  canvas {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    width: 100%;
    height: 100%;
  }

  @keyframes dsBlob {
    /* drift shortened (30px/-20px → 12px/-8px) and scale pulse nearly removed
       (1.08 → 1.02), so the blobs read as a still gradient that breathes rather
       than something visibly moving behind the content */
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(12px, -8px) scale(1.02); }
  }
  .blob {
    position: fixed;
    border-radius: 50%;
    filter: blur(20px);
    pointer-events: none;
    z-index: -1;
  }
  .blob--blue {
    top: -160px; right: -120px;
    width: 560px; height: 560px;
    background: radial-gradient(circle, rgba(44,111,214,.07), transparent 66%);
    animation: dsBlob 30s ease-in-out infinite;
  }
  .blob--red {
    top: 280px; left: -160px;
    width: 480px; height: 480px;
    background: radial-gradient(circle, rgba(229,52,42,.035), transparent 66%);
    animation: dsBlob 38s ease-in-out infinite reverse;
  }

  /* Respect users who have asked the OS for less motion: keep the static
     gradient, drop the drift and the cursor-reactive field entirely. */
  @media (prefers-reduced-motion: reduce) {
    .blob { animation: none; }
    canvas { display: none; }
  }
</style>