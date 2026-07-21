<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  // Import your type-safe compiled Paraglide translation functions
  import * as m from '$lib/paraglide/messages.js';

  // Svelte 5 runes for URLs & Hero state
  let { 
    exploreUrl = "/shop", 
    quoteUrl = "/checkout", 
    factoryUrl = "/factory" 
  } = $props();

  // Background gallery images with smooth transition
  const heroBackgrounds = [
    { src: "/images/manufacture top view.webp", label: "Manufacturing Hub" },
    { src: "/images/manufacture.webp", label: "Production Floor" },
    { src: "/images/front desk.webp", label: "Main Office" }
  ];

  let currentBgIndex = $state(0);

  function setBackground(index: number) {
    currentBgIndex = index;
  }
</script>

<style>
  /* Custom smooth floating animation keyframes */
  @keyframes floatSlow {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-8px);
    }
  }

  @keyframes floatLag {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-12px);
    }
  }

  .animate-float-1 {
    animation: floatSlow 6s ease-in-out infinite;
  }

  .animate-float-2 {
    animation: floatLag 7s ease-in-out infinite 1s;
  }

  .animate-float-3 {
    animation: floatSlow 8s ease-in-out infinite 2s;
  }
</style>

<section class="relative overflow-hidden border-b border-border bg-background min-h-[680px] flex flex-col justify-center">
  
  <!-- Dynamic Background Image with Smooth Crossfade -->
  {#key currentBgIndex}
    <div 
      in:fade={{ duration: 800 }}
      out:fade={{ duration: 400 }}
      class="absolute inset-0 bg-no-repeat bg-cover bg-center saturate-[0.9] contrast-[1.02] transition-transform duration-1000 ease-out hover:scale-105"
      style="background-image: url('{heroBackgrounds[currentBgIndex].src}');"
    ></div>
  {/key}
  
  <!-- Gradient Grids & Overlays -->
  <div class="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40 pointer-events-none"></div>
  <div class="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/95 pointer-events-none"></div>
  <div class="absolute inset-0 opacity-50 bg-[linear-gradient(rgba(60,116,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(60,116,255,0.07)_1px,transparent_1px)] bg-[size:52px_52px] animate-[pulse_22s_linear_infinite] pointer-events-none"></div>

  <!-- Main Container -->
  <div class="relative max-w-[1320px] w-full mx-auto px-7 py-24 md:py-28 flex flex-col justify-center min-h-[640px] z-10">
    
    <!-- Top Badge -->
    <div 
      in:fly={{ y: 15, duration: 600, delay: 100, easing: cubicOut }}
      class="inline-flex items-center gap-2.5 px-3.5 py-1.5 border border-primary/40 bg-primary/10 rounded-full font-mono text-[11.5px] tracking-[0.24em] uppercase text-primary-foreground w-fit mb-6.5 transition-all duration-300 hover:border-primary/70 hover:bg-primary/20 hover:scale-[1.02] cursor-default"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
      {m.badge_text()}
    </div>
    
    <!-- Hero Heading -->
    <h1 
      in:fly={{ y: 20, duration: 700, delay: 200, easing: cubicOut }}
      class="font-sans font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight max-w-[14ch] text-foreground drop-shadow-[0_2px_40px_rgba(0,0,0,0.5)]"
    >
      {m.hero_title()}
    </h1>
    
    <!-- Subtitle -->
    <p 
      in:fly={{ y: 20, duration: 700, delay: 300, easing: cubicOut }}
      class="mt-6 text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground max-w-[56ch]"
    >
      {m.hero_subtitle()}
    </p>
    
    <!-- Action Buttons -->
    <div 
      in:fly={{ y: 20, duration: 700, delay: 400, easing: cubicOut }}
      class="mt-9 flex flex-wrap gap-3.5"
    >
      <a 
        href={exploreUrl} 
        class="group transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(60,116,255,0.5)] active:translate-y-0 active:scale-[0.98]"
        style="display:flex;align-items:center;gap:9px;background:linear-gradient(135deg,#3C74FF,#1B3A8C);color:#fff;border:none;padding:16px 26px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 12px 34px rgba(60,116,255,.4)"
      >
        {m.btn_explore()}
        <svg class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      
      <a 
        href={quoteUrl} 
        class="bg-background text-foreground transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-background/80 active:translate-y-0 active:scale-[0.98]"
        style="border:1px solid rgba(255,255,255,.2);padding:16px 26px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px)"
      >
        {m.btn_quote()}
      </a>
      
      <a 
        href={factoryUrl} 
        class="bg-background text-foreground flex flex-row gap-2 group transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-background/80 active:translate-y-0 active:scale-[0.98]"
        style="border:1px solid rgba(255,255,255,.2);padding:16px 26px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px)"
      >
        <svg class="w-4.5 h-4.5 transition-transform duration-500 group-hover:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v6h-6"/><path d="M21 3a9 9 0 0 0-9 6"/></svg>
        {m.btn_factory_360()}
      </a>
    </div>

    <!-- Background View Switcher Thumbnails -->
    <div 
      in:fade={{ duration: 800, delay: 550 }}
      class="mt-10 flex items-center gap-3"
    >
      <span class="text-xs font-mono text-muted-foreground uppercase tracking-widest mr-1 hidden sm:inline-block">View:</span>
      {#each heroBackgrounds as bg, idx}
        <button
          type="button"
          onclick={() => setBackground(idx)}
          class="group relative h-12 w-20 overflow-hidden rounded-lg border transition-all duration-300 focus:outline-none {currentBgIndex === idx ? 'border-primary ring-2 ring-primary/40 scale-105' : 'border-border/40 opacity-70 hover:opacity-100'}"
        >
          <img src={bg.src} alt={bg.label} class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/20"></div>
        </button>
      {/each}
    </div>

    <!-- Drag Hint Footer -->
    <!-- <div 
      in:fade={{ duration: 800, delay: 600 }}
      class="mt-8 inline-flex items-center gap-2.5 text-muted-foreground font-mono text-[11.5px] tracking-widest uppercase"
    >
      <svg class="w-4.5 h-4.5 animate-[pulse_2s_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8 22 12l-4 4M6 8l-4 4 4 4M2 12h20"/></svg>
      {m.drag_hint()}
    </div> -->
  </div>

  <!-- Floating Glass Stat Chips with Continuous Floating Animation -->
  <div class="absolute top-[120px] right-[6%] hidden lg:flex flex-col gap-3.5 z-10">
    <!-- Capacity Chip -->
    <div in:fly={{ x: 30, duration: 700, delay: 400, easing: cubicOut }}>
      <div class="animate-float-1 bg-card/55 backdrop-blur-xl border border-border/50 rounded-2xl p-4 min-w-[186px] shadow-2xl shadow-black/40 transition-all duration-300 hover:[animation-play-state:paused] hover:scale-105 hover:border-primary/50 hover:bg-card/75 cursor-default">
        <div class="font-mono text-[10.5px] tracking-widest uppercase text-muted-foreground">{m.stat_capacity_label()}</div>
        <div class="font-sans font-extrabold text-3xl mt-1.5 text-card-foreground">
          {m.stat_capacity_value()}
        </div>
      </div>
    </div>
    
    <!-- Coverage Chip -->
    <div in:fly={{ x: 30, duration: 700, delay: 500, easing: cubicOut }}>
      <div class="animate-float-2 bg-card/55 backdrop-blur-xl border border-border/50 rounded-2xl p-4 min-w-[186px] shadow-2xl shadow-black/40 transition-all duration-300 hover:[animation-play-state:paused] hover:scale-105 hover:border-primary/50 hover:bg-card/75 cursor-default">
        <div class="font-mono text-[10.5px] tracking-widest uppercase text-muted-foreground">{m.stat_coverage_label()}</div>
        <div class="font-sans font-extrabold text-3xl mt-1.5 text-card-foreground">
          {m.stat_coverage_value()}
        </div>
      </div>
    </div>
    
    <!-- Certification Chip -->
    <div in:fly={{ x: 30, duration: 700, delay: 600, easing: cubicOut }}>
      <div class="animate-float-3 bg-card/55 backdrop-blur-xl border border-border/50 rounded-2xl px-5 py-3.5 min-w-[186px] flex items-center gap-3 shadow-2xl shadow-black/40 transition-all duration-300 hover:[animation-play-state:paused] hover:scale-105 hover:border-primary/50 hover:bg-card/75 group cursor-default">
        <div class="w-9.5 h-9.5 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
          <svg class="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <div>
          <div class="font-extrabold text-sm text-card-foreground">{m.stat_cert_title()}</div>
          <div class="text-[11.5px] text-muted-foreground">{m.stat_cert_subtitle()}</div>
        </div>
      </div>
    </div>

    <!-- Active Operations Live Image Chip -->
    <div in:fly={{ x: 30, duration: 700, delay: 700, easing: cubicOut }}>
      <div class="animate-float-1 overflow-hidden bg-card/55 backdrop-blur-xl border border-border/50 rounded-2xl p-2 min-w-[186px] shadow-2xl shadow-black/40 transition-all duration-300 hover:scale-105">
        <img src="/images/working.webp" alt="Live operations" class="h-20 w-full rounded-xl object-cover" />
        <p class="mt-2 text-center text-xs font-bold text-foreground">Facility Operations</p>
      </div>
    </div>
  </div>

  <!-- 360 Badge Bottom-Right -->
  <a
    href="/factory"
    in:fade={{ duration: 600, delay: 700 }}
    class="absolute bottom-6.5 right-7 z-10 flex items-center gap-2 bg-card/60 backdrop-blur-md border border-border/40 rounded-full py-2.5 pr-4 pl-3 transition-all duration-300 hover:scale-105 hover:bg-card/80"
  >
    <span class="w-7 h-7 rounded-full border border-dashed border-primary flex items-center justify-center animate-[spin_9s_linear_infinite]">
      <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
    </span>
    <span class="font-mono text-[11px] tracking-wider text-card-foreground">{m.live_badge()}</span>
  </a>
</section>