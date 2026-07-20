<script lang="ts">
  // Import Paraglide translation functions
  import * as m from "$lib/paraglide/messages.js";

  // Svelte 5 runes for component logic/callbacks
  let { 
    onEnterTour = () => {},
    bgImage = "assets/rollforming.jpg"
  } = $props();

  // Re-assembling translated loop objects with their layout properties (like icons or numbers)
  const features = $derived([
    { id: 1, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, title: m.feat_1_title(), desc: m.feat_1_desc() },
    { id: 2, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>`, title: m.feat_2_title(), desc: m.feat_2_desc() },
    { id: 3, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polyline points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`, title: m.feat_3_title(), desc: m.feat_3_desc() },
    { id: 4, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`, title: m.feat_4_title(), desc: m.feat_4_desc() }
  ]);

  const processSteps = $derived([
    { n: "01", title: m.step_1_title(), desc: m.step_1_desc() },
    { n: "02", title: m.step_2_title(), desc: m.step_2_desc() },
    { n: "03", title: m.step_3_title(), desc: m.step_3_desc() },
    { n: "04", title: m.step_4_title(), desc: m.step_4_desc() }
  ]);

  const industries = $derived([
    { id: 1, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`, name: m.ind_commercial() },
    { id: 2, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, name: m.ind_residential() },
    { id: 3, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`, name: m.ind_infrastructure() },
    { id: 4, icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`, name: m.ind_government() }
  ]);

  const stats = $derived([
    { id: 1, display: "25k+", label: m.stat_lbl_capacity() },
    { id: 2, display: "40+", label: m.stat_lbl_cities() },
    { id: 3, display: "100+", label: m.stat_lbl_team() },
    { id: 4, display: "1,200+", label: m.stat_lbl_projects() },
    { id: 5, display: "100%", label: m.stat_lbl_testing() },
    { id: 6, display: "ISO", label: m.stat_lbl_compliance() }
  ]);
</script>

<!-- FEATURES GRID SECTION -->
<section class="max-w-[1320px] mx-auto px-7 py-26 md:py-28">
  <div class="text-center max-w-[640px] mx-auto mb-13">
    <div class="font-mono text-xs tracking-[0.26em] uppercase text-primary mb-3.5">
      {m.features_tagline()}
    </div>
    <h2 class="font-sans font-extrabold text-3xl sm:text-4xl lg:text-[44px] tracking-tight leading-[1.08] text-foreground">
      {m.features_title()}
    </h2>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
    {#each features as f (f.id)}
      <div class="bg-card border border-border/80 rounded-2xl p-6.5">
        <div class="w-11.5 h-11.5 rounded-xl bg-gradient-to-br from-primary/24 to-primary/5 border border-primary/32 flex items-center justify-center text-primary mb-4.5">
          {@html f.icon}
        </div>
        <h3 class="font-sans font-bold text-lg text-foreground">{f.title}</h3>
        <p class="mt-2 text-[13.5px] text-muted-foreground leading-relaxed">{f.desc}</p>
      </div>
    {/each}
  </div>
</section>

<!-- FACTORY EXPERIENCE STRIP -->
<section class="relative overflow-hidden border-t border-border">
  <!-- Background Image with Filters -->
  <img 
    src={bgImage} 
    alt="" 
    class="absolute inset-0 w-full h-full object-cover brightness-[0.4] saturate-[0.85]"
  />
  <div class="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent"></div>
  
  <div class="relative max-w-[1320px] mx-auto px-7 py-25 lg:py-26 grid grid-cols-1 lg:grid-cols-2 gap-15 items-center">
    
    <!-- Left Column: Context -->
    <div>
      <div class="font-mono text-xs tracking-[0.26em] uppercase text-primary/80 mb-4">
        {m.tour_tagline()}
      </div>
      <h2 class="font-sans font-extrabold text-3xl sm:text-4xl lg:text-[46px] tracking-tight leading-[1.06] text-primary-foreground">
        {m.tour_title()}
      </h2>
      <p class="mt-5 text-base leading-relaxed text-muted-foreground max-w-[48ch]">
        {m.tour_description()}
      </p>
      <button 
        onclick={onEnterTour} 
        class="mt-8 inline-flex items-center gap-2.5 bg-primary text-primary-foreground font-bold text-[15px] px-6 py-3.5 rounded-xl border border-border/20 backdrop-blur-md hover:bg-primary/90 transition-colors cursor-pointer"
      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v6h-6"/></svg>
        {m.btn_tour()}
      </button>
    </div>

    <!-- Right Column: Process Map -->
    <div class="flex flex-col gap-3.5">
      {#each processSteps as p (p.n)}
        <div class="flex items-center gap-4 bg-card/60 backdrop-blur-md border border-border/40 rounded-xl p-4">
          <div class="font-sans font-black text-xl text-primary min-w-[34px]">{p.n}</div>
          <div>
            <div class="font-bold text-[15px] text-foreground">{p.title}</div>
            <div class="text-sm text-muted-foreground mt-0.5">{p.desc}</div>
          </div>
        </div>
      {/each}
    </div>

  </div>
</section>

<!-- INDUSTRIES SECTION -->
<section class="bg-background border-y border-border">
  <div class="max-w-[1320px] mx-auto px-7 py-25 lg:py-26">
    
    <div class="mb-12">
      <div class="font-mono text-xs tracking-[0.26em] uppercase text-primary mb-3.5">
        {m.ind_tagline()}
      </div>
      <h2 class="font-sans font-extrabold text-3xl sm:text-4xl lg:text-[44px] tracking-tight text-foreground">
        {m.ind_title()}
      </h2>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each industries as i (i.id)}
        <div class="bg-card border border-border/80 rounded-xl p-5.5 flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-lg bg-primary/14 border border-primary/28 flex items-center justify-center text-primary flex-shrink-0">
            {@html i.icon}
          </div>
          <div class="font-bold text-[14.5px] leading-snug text-foreground">
            {i.name}
          </div>
        </div>
      {/each}
    </div>

  </div>
</section>

<!-- GRANULAR STATS BAR -->
<section class="max-w-[1320px] mx-auto px-7 py-25 lg:py-26">
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    {#each stats as s (s.id)}
      <div class="text-center p-6.5 bg-card border border-border/80 rounded-2xl flex flex-col justify-center">
        <!-- Text gradient color treatment matches your custom brand style layout safely -->
        <div class="font-sans font-black text-3xl sm:text-4xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
          {s.display}
        </div>
        <div class="text-[12.5px] text-muted-foreground mt-1.5 font-medium leading-tight">
          {s.label}
        </div>
      </div>
    {/each}
  </div>
</section>