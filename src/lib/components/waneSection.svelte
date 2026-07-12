<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Shield, Cpu, Scale, Coins, ShoppingBag, ArrowUpRight } from "@lucide/svelte";
  import * as m from '$lib/paraglide/messages.js';

  // Shared infrastructure data mapped to dynamic Paraglide message functions
  const sharedServices = [
    { name: m.tech(), icon: Cpu },
    { name: m.finance(), icon: Coins },
    { name: m.legal(), icon: Scale },
    { name: m.procurement(), icon: ShoppingBag },
    { name: m.brand(), icon: Shield },
  ];
</script>

<section class="relative overflow-hidden bg-background py-24 sm:py-32">
  <!-- Subtle ambient background glows using shadcn token colors -->
  <div class="absolute inset-0 -z-10 flex items-center justify-center opacity-20 blur-3xl" aria-hidden="true">
    <div class="aspect-1155/678 w-288.75 bg-linear-to-tr from-primary to-accent"></div>
  </div>

  <div class="mx-auto max-w-7xl px-6 lg:px-8">
    <div class="mx-auto max-w-3xl text-center">
      <h2 class="text-base font-semibold uppercase tracking-wider text-primary">{m.tagline()}</h2>
      <p class="mt-2 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        {m.title()}
      </p>
      <p class="mt-6 text-lg leading-8 text-muted-foreground">
        {m.description()}
      </p>
    </div>

    <!-- Glassmorphic Shared Infrastructure Section -->
    <div class="mt-16 rounded-3xl border border-border/40 bg-card/40 p-8 backdrop-blur-xl shadow-lg sm:p-12 lg:mt-20">
      <div class="grid grid-cols-1 gap-y-12 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-0">
        
        <div class="lg:col-span-1 flex flex-col justify-center">
          <h3 class="text-2xl font-bold tracking-tight text-foreground">{m.infraTitle()}</h3>
          <p class="mt-4 text-sm text-muted-foreground leading-relaxed">
            {m.infraDescription()}
          </p>
        </div>

        <div class="lg:col-span-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {#each sharedServices as service}
            <div class="flex flex-col justify-between rounded-xl border border-border/30 bg-background/50 p-5 shadow-sm transition-all hover:bg-background/80">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <service.icon class="h-5 w-5" />
              </div>
              <p class="mt-4 font-medium text-sm text-foreground">{service.name}</p>
            </div>
          {/each}
        </div>

      </div>
    </div>

    <!-- CTA Button -->
    <div class="mt-12 flex justify-center">
      <Button 
        href="https://wanetrading.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        size="lg"
        class="gap-2 shadow-sm shadow-primary/20 hover:shadow-md transition-all"
      >
        {m.cta()}
        <ArrowUpRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</section>