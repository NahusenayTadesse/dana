<script>
  import { onMount } from 'svelte';

  // Tuning knobs (can also be passed as props if you prefer)
  let gap = 30;      // px between dots / grid lines
let radius = 130;  // px radius of cursor influence
   let push = 26;     // max px a dot is pushed away

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
      ctx.strokeStyle = 'rgba(30,82,168,0.06)';
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
        d.x += (tx - d.x) * 0.18;
        d.y += (ty - d.y) * 0.18;
        const r = 1.4 + near * 2.2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fillStyle = near > 0
          ? `rgba(44,111,214,${0.28 + near * 0.6})`
          : 'rgba(30,82,168,0.20)';
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
  canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    width: 100%;
    height: 100%;
  }

  @keyframes dsBlob {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(30px, -20px) scale(1.08); }
  }
  .blob {
    position: fixed;
    border-radius: 50%;
    filter: blur(20px);
    pointer-events: none;
    z-index: 0;
  }
  .blob--blue {
    top: -160px; right: -120px;
    width: 560px; height: 560px;
    background: radial-gradient(circle, rgba(44,111,214,.28), transparent 66%);
    animation: dsBlob 16s ease-in-out infinite;
  }
  .blob--red {
    top: 280px; left: -160px;
    width: 480px; height: 480px;
    background: radial-gradient(circle, rgba(229,52,42,.14), transparent 66%);
    animation: dsBlob 20s ease-in-out infinite reverse;
  }
</style>