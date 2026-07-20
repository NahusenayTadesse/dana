<script lang="ts">
  // Import Paraglide translation functions
  import * as m from "$lib/paraglide/messages.js";

  // Re-assembling translated loop objects with static data fields (initials)
  const testimonials = $derived([
    {
      id: 1,
      initials: "Y.A",
      quote: m.testimonial_1_quote(),
      name: m.testimonial_1_name(),
      role: m.testimonial_1_role()
    },
    {
      id: 2,
      initials: "M.K",
      quote: m.testimonial_2_quote(),
      name: m.testimonial_2_name(),
      role: m.testimonial_2_role()
    },
    {
      id: 3,
      initials: "A.T",
      quote: m.testimonial_3_quote(),
      name: m.testimonial_3_name(),
      role: m.testimonial_3_role()
    }
  ]);
</script>

<section class="bg-background border-t border-border">
  <div class="max-w-[1320px] mx-auto px-7 py-25 lg:py-26">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      
      {#each testimonials as t (t.id)}
        <div class="bg-card border border-border/80 rounded-2xl p-7.5 md:p-8 relative flex flex-col justify-between">
          <div>
            <!-- Large decorative quote marks using the theme's primary color channel -->
            <div class="font-sans font-black text-6xl leading-[0.6] text-primary/28 select-none">
              &ldquo;
            </div>
            <p class="mt-2 text-[15.5px] leading-relaxed text-foreground/90">
              {t.quote}
            </p>
          </div>
          
          <!-- User Profile Identity -->
          <div class="mt-5.5 flex items-center gap-3.5">
            <div class="w-10.5 h-10.5 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-sans font-extrabold text-base text-primary-foreground">
              {t.initials}
            </div>
            <div>
              <div class="font-bold text-sm text-foreground">{t.name}</div>
              <div class="text-[12.5px] text-muted-foreground">{t.role}</div>
            </div>
          </div>
        </div>
      {/each}
      
    </div>
  </div>
</section>