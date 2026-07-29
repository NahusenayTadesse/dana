<script lang="ts">
  // Import Paraglide translation functions
  import * as m from "$lib/paraglide/messages.js";
  import { fly } from 'svelte/transition';

  type Testimonial = {
    id: number;
    name: string;
    position: string | null;
    message: string;
    avatar: string | null;
  };

  let { testimonials = [] as Testimonial[] } = $props();

  function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
</script>

<section class="relative overflow-hidden border-y border-primary/10 bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
  <div
    class="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.1),transparent_38%)]"
  ></div>
  <div
    class="absolute top-10 right-[-10%] -z-10 h-80 w-80 animate-pulse rounded-full bg-primary/10 blur-3xl"
  ></div>

  <div class="mx-auto max-w-7xl">
    <div
      transition:fly={{ y: 24, duration: 650 }}
      class="mb-12 flex flex-col items-center gap-3 text-center"
    >
      <span class="text-xs font-bold uppercase tracking-widest text-primary">
        {m.testimonials_badge()}
      </span>
      <h2 class="max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
        {m.about_page_testimonials_title()}
      </h2>
      <p class="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {m.about_page_testimonials_description()}
      </p>
    </div>

    <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {#each testimonials as t, i (t.id)}
        <div
          transition:fly={{ y: 20, duration: 550, delay: i * 100 }}
          class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-primary/10 bg-card/40 p-7.5 shadow-xl backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-primary/5 md:p-8"
        >
          <div>
            <!-- Large decorative quote marks using the theme's primary color channel -->
            <div class="font-sans font-black text-6xl leading-[0.6] text-primary/30 select-none">
              &ldquo;
            </div>
            <p class="mt-2 text-[15.5px] leading-relaxed text-foreground/90">
              {t.message}
            </p>
          </div>

          <!-- User Profile Identity -->
          <div class="mt-5.5 flex items-center gap-3.5">
            {#if t.avatar}
              <img
                src={`/files/${t.avatar}`}
                alt={t.name}
                loading="lazy"
                class="h-10.5 w-10.5 rounded-xl object-cover ring-2 ring-primary/10 transition duration-500 group-hover:scale-110"
              />
            {:else}
              <div
                class="flex h-10.5 w-10.5 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 font-sans text-base font-extrabold text-primary-foreground transition duration-500 group-hover:scale-110"
              >
                {initials(t.name)}
              </div>
            {/if}
            <div>
              <div class="font-bold text-sm text-foreground">{t.name}</div>
              {#if t.position}
                <div class="text-[12.5px] text-muted-foreground">{t.position}</div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>