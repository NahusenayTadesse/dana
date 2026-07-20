<script lang="ts">
  // Import type-safe Paraglide translation functions
  import * as m from "$lib/paraglide/messages.js";

  // Svelte 5 runes for callbacks
  let { 
    onAdminClick = () => {},
    logoSrc = "assets/logo.png"
  } = $props();

  // Reusable social media SVGs passed into our layout loop
  const socialIcons = [
    `<svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>`,
    `<svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    `<svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37z"/></svg>`
  ];
</script>

<footer class="bg-background border-t border-border">
  <div class="max-w-[1320px] mx-auto px-7 pt-18 pb-10">
    
    <!-- Navigation Columns Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-11">
      
      <!-- Column 1: Brand & Identity -->
      <div class="flex flex-col gap-4.5">
        <div class="bg-gradient-to-b from-white to-[#eef1f6] rounded-xl p-2.5 inline-flex w-fit shadow-lg shadow-primary/20">
          <img src={logoSrc} alt="Dana Steels Factory" class="h-8.5 object-contain">
        </div>
        <p class="text-[13.5px] leading-relaxed text-muted-foreground max-w-[34ch]">
          {m.footer_desc()}
        </p>
        <div class="flex gap-2.5 mt-1">
          {#each socialIcons as icon, idx}
            <button 
              class="w-9.5 h-9.5 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer" 
              aria-label="Social Link"
            >
              {@html icon}
            </button>
          {/each}
        </div>
      </div>

      <!-- Column 2: Products -->
      <div>
        <div class="font-mono text-[11px] tracking-widest uppercase text-muted-foreground/80 mb-4.5">
          {m.footer_title_products()}
        </div>
        <nav class="flex flex-col gap-3 text-[13.5px] text-muted-foreground">
          <a href="#ppgi" class="hover:text-foreground transition-colors">{m.prod_ppgi()}</a>
          <a href="#gi" class="hover:text-foreground transition-colors">{m.prod_gi()}</a>
          <a href="#tiles" class="hover:text-foreground transition-colors">{m.prod_tiles()}</a>
          <a href="#ridge" class="hover:text-foreground transition-colors">{m.prod_ridge()}</a>
          <a href="#gutters" class="hover:text-foreground transition-colors">{m.prod_gutters()}</a>
        </nav>
      </div>

      <!-- Column 3: Company -->
      <div>
        <div class="font-mono text-[11px] tracking-widest uppercase text-muted-foreground/80 mb-4.5">
          {m.footer_title_company()}
        </div>
        <nav class="flex flex-col gap-3 text-[13.5px] text-muted-foreground">
          <a href="#about" class="hover:text-foreground transition-colors">{m.comp_about()}</a>
          <a href="#factory" class="hover:text-foreground transition-colors">{m.comp_factory()}</a>
          <a href="#projects" class="hover:text-foreground transition-colors">{m.comp_projects()}</a>
          <a href="#blog" class="hover:text-foreground transition-colors">{m.comp_blog()}</a>
          <a href="#careers" class="hover:text-foreground transition-colors">{m.comp_careers()}</a>
        </nav>
      </div>

      <!-- Column 4: Contact Context -->
      <div>
        <div class="font-mono text-[11px] tracking-widest uppercase text-muted-foreground/80 mb-4.5">
          {m.footer_title_contact()}
        </div>
        <div class="flex flex-col gap-3.5 text-[13.5px] text-foreground/90">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
            <span>0919 05 06 07</span>
          </div>
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m22 7-10 6L2 7"/></svg>
            <span class="break-all">sales@danasteel.com</span>
          </div>
          <div class="flex items-start gap-2.5">
            <svg class="w-4 h-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{m.contact_address()}</span>
          </div>
          
          <!-- WhatsApp Floating Row Action Button -->
          <a 
            href="https://wa.me/251919050607" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="mt-1.5 inline-flex items-center gap-2 bg-[rgba(37,211,102,0.12)] border border-[rgba(37,211,102,0.4)] text-[#4be084] px-3.5 py-2.5 rounded-xl font-bold text-sm w-fit hover:bg-[rgba(37,211,102,0.2)] transition-colors"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20z"/></svg>
            {m.btn_whatsapp()}
          </a>
        </div>
      </div>

    </div>

    <!-- Bottom Copyright Bar -->
    <div class="mt-13 pt-6.5 border-t border-border flex flex-col sm:flex-row justify-between flex-wrap gap-3.5 text-[12.5px] text-muted-foreground/80">
      <span>{m.copyright_text()}</span>
      <div class="flex gap-5.5">
        <a href="#privacy" class="hover:text-foreground transition-colors">{m.link_privacy()}</a>
        <a href="#terms" class="hover:text-foreground transition-colors">{m.link_terms()}</a>
      </div>
    </div>

  </div>
</footer>