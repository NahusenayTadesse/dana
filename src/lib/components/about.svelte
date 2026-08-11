<script lang="ts">
  // Import type-safe Paraglide translation functions
  import * as m from "$lib/paraglide/messages.js";

  // Svelte 5 runes for passing dynamic stats or asset paths if desired
  let { 
    imageSrc = "/images/manufacture top view.webp"
  } = $props();

  // Facility gallery images to cycle through
  const heroGallery = [
    { src: "/images/manufacture top view.webp", badgeSub: m.about_badge_sub() },
    { src: "/images/manufacture.webp", badgeSub: "Production Facility" },
    { src: "/images/front desk1.webp", badgeSub: "Main Reception" }
  ];

  let selectedImageIndex = $state(0);
</script>

<section class="max-w-[1320px] mx-auto px-7 py-26 md:py-28">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
    
    <!-- Image Column with Interactive Gallery & Glass Overlay Badge -->
    <div class="transition-all duration-700 ease-out space-y-4">
      <div class="relative rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/50 group">
        <img 
          src={heroGallery[selectedImageIndex]?.src ?? imageSrc} 
          alt={m.about_img_alt()} 
          class="w-full h-[520px] object-cover transition-all duration-500"
        />
        
        <!-- Factory Badge Overlay -->
        <div class="absolute left-5.5 bottom-5.5 bg-background/66 backdrop-blur-md border border-border/12 rounded-xl p-3.5 sm:p-4.5 font-mono">
          <div class="text-[10.5px] tracking-widest text-[#8FA9DE] uppercase">
            {m.about_badge_native()}
          </div>
          <div class="text-sm font-bold text-foreground mt-1">
            {heroGallery[selectedImageIndex]?.badgeSub}
          </div>
        </div>
      </div>

      <!-- Thumbnail Switcher Bar -->
      <div class="flex items-center gap-3">
        {#each heroGallery as item, index}
          <button 
            type="button"
            onclick={() => (selectedImageIndex = index)}
            class="relative h-16 w-24 overflow-hidden rounded-lg border transition-all duration-300 focus:outline-none {selectedImageIndex === index ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border/50 opacity-60 hover:opacity-100'}"
          >
            <img 
              src={item.src} 
              alt={m.alt_facility_preview()} 
              class="h-full w-full object-cover" 
            />
          </button>
        {/each}
      </div>
    </div>
    
    <!-- Text Content Column -->
    <div class="transition-all duration-700 ease-out delay-120">
      <!-- Section Label -->
      <div class="font-mono text-xs tracking-[0.26em] uppercase text-primary mb-4">
        {m.about_tagline()}
      </div>
      
      <!-- Heading -->
      <h2 class="font-sans font-extrabold text-3xl sm:text-4xl lg:text-[44px] leading-[1.08] tracking-tight text-foreground">
        {m.about_title()}
      </h2>
      
      <!-- Description -->
      <p class="mt-5 text-base leading-relaxed text-muted-foreground">
        {m.about_description()}
      </p>
      
      <!-- Stats Grid -->
      <div class="mt-8.5 grid grid-cols-3 gap-4.5">
        <div class="border-l-2 border-primary pl-4">
          <div class="font-sans font-extrabold text-3xl text-foreground">100+</div>
          <div class="text-sm text-muted-foreground mt-0.5">{m.stat_employees()}</div>
        </div>
        <div class="border-l-2 border-primary pl-4">
          <div class="font-sans font-extrabold text-3xl text-foreground">1,200+</div>
          <div class="text-sm text-muted-foreground mt-0.5">{m.stat_projects()}</div>
        </div>
        <div class="border-l-2 border-primary pl-4">
          <div class="font-sans font-extrabold text-3xl text-foreground">40+</div>
          <div class="text-sm text-muted-foreground mt-0.5">{m.stat_cities()}</div>
        </div>
      </div>
      
      <!-- Mission / Vision -->
      <div class="mt-8.5 flex flex-col sm:flex-row gap-8.5">
        <div>
          <div class="font-extrabold text-[15px] text-foreground mb-1.5 flex items-center gap-2">
            <span class="w-2 h-2 bg-primary rounded-sm"></span>
            {m.mission_title()}
          </div>
          <div class="text-sm text-muted-foreground leading-relaxed max-w-[34ch]">
            {m.mission_text()}
          </div>
        </div>
        
        <div>
          <div class="font-extrabold text-[15px] text-foreground mb-1.5 flex items-center gap-2">
            <!-- Custom structural red indicator left from legacy design -->
            <span class="w-2 h-2 bg-[#E5342A] rounded-sm"></span>
            {m.vision_title()}
          </div>
          <div class="text-sm text-muted-foreground leading-relaxed max-w-[34ch]">
            {m.vision_text()}
          </div>
        </div>
      </div>

      <!-- Contextual Team & Operations Cards -->
      <div class="mt-8.5 grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
        <div class="relative overflow-hidden rounded-xl border border-border/50 group h-28">
          <img 
            src="/images/working.webp" 
            alt={m.alt_workplace_operations()} 
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <span class="absolute bottom-2 left-3 text-xs font-semibold text-white">{m.about_caption_daily_operations()}</span>
        </div>

        <div class="relative overflow-hidden rounded-xl border border-border/50 group h-28">
          <img 
            src="/images/client.webp" 
            alt={m.alt_client_relations()} 
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <span class="absolute bottom-2 left-3 text-xs font-semibold text-white">{m.about_caption_client_partnerships()}</span>
        </div>
      </div>
      
    </div>
  </div>
</section>