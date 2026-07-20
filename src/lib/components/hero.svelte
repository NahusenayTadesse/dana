<script lang="ts">
  // Import your type-safe compiled Paraglide translation functions
	import * as m from '$lib/paraglide/messages.js';

  // Svelte 5 runes for URLs
  let { 
    exploreUrl = "/products", 
    quoteUrl = "/checkout", 
    factoryUrl = "/about" 
  } = $props();
</script>

<section class="relative overflow-hidden border-b border-border bg-background min-h-[640px] flex flex-col justify-center">
  
  <!-- Background Image with Filter / Positioning -->
  <div 
    class="absolute inset-0 bg-no-repeat saturate-[0.9] contrast-[1.02]"
    style="background-image: url('assets/warehouse.jpg'); background-size: auto 145%; background-position: 32% center;"
  ></div>
  
  <!-- Gradient Grids & Overlays -->
  <div class="absolute inset-0 bg-gradient-to-r from-background/92 via-background/72 to-background/35"></div>
  <div class="absolute inset-0 bg-gradient-to-b from-background/35 via-transparent to-background/90"></div>
  <div class="absolute inset-0 opacity-50 bg-[linear-gradient(rgba(60,116,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(60,116,255,0.07)_1px,transparent_1px)] bg-[size:52px_52px] animate-[pulse_22s_linear_infinite]"></div>

  <!-- Main Container -->
  <div class="relative max-w-[1320px] w-full mx-auto px-7 py-24 md:py-28 flex flex-col justify-center min-h-[640px]">
    
    <!-- Top Badge -->
    <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 border border-primary/40 bg-primary/10 rounded-full font-mono text-[11.5px] tracking-[0.24em] uppercase text-primary-foreground w-fit mb-6.5">
      <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
      {m.badge_text()}
    </div>
    
    <!-- Hero Heading -->
    <h1 class="font-sans font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight max-w-[14ch] text-foreground drop-shadow-[0_2px_40px_rgba(0,0,0,0.5)]">
      {m.hero_title()}
    </h1>
    
    <!-- Subtitle -->
    <p class="mt-6 text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground max-w-[56ch]">
      {m.hero_subtitle()}
    </p>
    
    <!-- Action Buttons -->
    <div class="mt-9 flex flex-wrap gap-3.5">
      <a 
        href={exploreUrl} 
          style="display:flex;align-items:center;gap:9px;background:linear-gradient(135deg,#3C74FF,#1B3A8C);color:#fff;border:none;padding:16px 26px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 12px 34px rgba(60,116,255,.4)"
        >
        {m.btn_explore()}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      
      <a 
        href={quoteUrl} 
		class="bg-background text-foreground"
  style="border:1px solid rgba(255,255,255,.2);padding:16px 26px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px)"
        >
        {m.btn_quote()}
      </a>
      
      <a 
        href={factoryUrl} 
class="bg-background text-foreground flex flex-row gap-2"
  style="border:1px solid rgba(255,255,255,.2);padding:16px 26px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px)"      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v6h-6"/><path d="M21 3a9 9 0 0 0-9 6"/></svg>
        {m.btn_factory_360()}
      </a>
    </div>

    <!-- Drag Hint Footer -->
    <div class="mt-13 inline-flex items-center gap-2.5 text-muted-foreground font-mono text-[11.5px] tracking-widest uppercase">
      <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8 22 12l-4 4M6 8l-4 4 4 4M2 12h20"/></svg>
      {m.drag_hint()}
    </div>
  </div>

  <!-- Floating Glass Stat Chips -->
  <div class="absolute top-[120px] right-[6%] hidden lg:flex flex-col gap-3.5 z-10">
    <!-- Capacity Chip -->
    <div class="bg-card/55 backdrop-blur-xl border border-border/50 rounded-2xl p-4 min-w-[186px] shadow-2xl shadow-black/40">
      <div class="font-mono text-[10.5px] tracking-widest uppercase text-muted-foreground">{m.stat_capacity_label()}</div>
      <div class="font-sans font-extrabold text-3xl mt-1.5 text-card-foreground">
        <!-- Passing dynamic variables to Paraglide functions if needed, or static mapping -->
        {m.stat_capacity_value()}
      </div>
    </div>
    
    <!-- Coverage Chip -->
    <div class="bg-card/55 backdrop-blur-xl border border-border/50 rounded-2xl p-4 min-w-[186px] shadow-2xl shadow-black/40">
      <div class="font-mono text-[10.5px] tracking-widest uppercase text-muted-foreground">{m.stat_coverage_label()}</div>
      <div class="font-sans font-extrabold text-3xl mt-1.5 text-card-foreground">
        {m.stat_coverage_value()}
      </div>
    </div>
    
    <!-- Certification Chip -->
    <div class="bg-card/55 backdrop-blur-xl border border-border/50 rounded-2xl px-5 py-3.5 min-w-[186px] flex items-center gap-3 shadow-2xl shadow-black/40">
      <div class="w-9.5 h-9.5 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z"/><path d="m9 12 2 2 4-4"/></svg>
      </div>
      <div>
        <div class="font-extrabold text-sm text-card-foreground">{m.stat_cert_title()}</div>
        <div class="text-[11.5px] text-muted-foreground">{m.stat_cert_subtitle()}</div>
      </div>
    </div>
  </div>

  <!-- 360 Badge Bottom-Right -->
  <div class="absolute bottom-6.5 right-7 z-10 flex items-center gap-2 bg-card/60 backdrop-blur-md border border-border/40 rounded-full py-2.5 pr-4 pl-3">
    <span class="w-7 h-7 rounded-full border border-dashed border-primary flex items-center justify-center animate-[spin_9s_linear_infinite]">
      <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
    </span>
    <span class="font-mono text-[11px] tracking-wider text-card-foreground">{m.live_badge()}</span>
  </div>
</section>