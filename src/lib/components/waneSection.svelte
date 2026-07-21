<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Shield, Cpu, Scale, Coins, ShoppingBag, ArrowUpRight, ChevronLeft, ChevronRight } from "@lucide/svelte";
  import * as m from '$lib/paraglide/messages.js';

  // Shared infrastructure data mapped to dynamic Paraglide message functions
  const sharedServices = [
    { name: m.tech(), icon: Cpu },
    { name: m.finance(), icon: Coins },
    { name: m.legal(), icon: Scale },
    { name: m.procurement(), icon: ShoppingBag },
    { name: m.brand(), icon: Shield },
  ];

  // Product Showcase Images for Interactive Carousel
  const productImages = [
    "/images/products list.webp",
    "/images/products list1.webp",
    "/images/products show1.webp",
    "/images/products show2.webp",
    "/images/products show3.webp"
  ];

  let currentProductIndex = $state(0);

  function nextProduct() {
    currentProductIndex = (currentProductIndex + 1) % productImages.length;
  }

  function prevProduct() {
    currentProductIndex = (currentProductIndex - 1 + productImages.length) % productImages.length;
  }
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

    <!-- Glassmorphic Shared Infrastructure Section with Image Integration -->
    <div class="mt-16 rounded-3xl border border-border/40 bg-card/40 p-8 backdrop-blur-xl shadow-lg sm:p-12 lg:mt-20">
      <div class="grid grid-cols-1 gap-y-12 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-0">
        
        <div class="lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 class="text-2xl font-bold tracking-tight text-foreground">{m.infraTitle()}</h3>
            <p class="mt-4 text-sm text-muted-foreground leading-relaxed">
              {m.infraDescription()}
            </p>
          </div>

          <!-- Workplace Ambient Image -->
          <div class="mt-6 overflow-hidden rounded-2xl border border-border/30">
            <img 
              src="/images/front desk.webp" 
              alt="Front Desk Infrastructure" 
              class="h-36 w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>

        <div class="lg:col-span-2 flex flex-col justify-between gap-6">
          <!-- Services Grid -->
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {#each sharedServices as service}
              <div class="flex flex-col justify-between rounded-xl border border-border/30 bg-background/50 p-5 shadow-sm transition-all hover:bg-background/80">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <service.icon class="h-5 w-5" />
                </div>
                <p class="mt-4 font-medium text-sm text-foreground">{service.name}</p>
              </div>
            {/each}

            <!-- Additional visual metric/service card -->
            <div class="relative overflow-hidden rounded-xl border border-border/30 bg-background/50 p-2 shadow-sm">
              <img 
                src="/images/working.webp" 
                alt="Active Operations" 
                class="h-full w-full rounded-lg object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              <span class="absolute bottom-3 left-3 text-xs font-bold text-white">Operations</span>
            </div>
          </div>

          <!-- Integrated Interactive Product Carousel -->
          <div class="relative overflow-hidden rounded-2xl border border-border/40 shadow-md">
            <img 
              src={productImages[currentProductIndex]} 
              alt="Product Showcase" 
              class="h-48 w-full object-cover transition-all duration-500"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
            
            <div class="absolute bottom-3 left-4 text-xs font-semibold text-foreground">
              Procurement & Inventory Catalog
            </div>

            <div class="absolute bottom-3 right-3 flex items-center gap-2">
              <button 
                type="button"
                onclick={prevProduct} 
                class="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-background/70 backdrop-blur-md text-foreground transition-all hover:bg-background"
                aria-label="Previous Image"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>
              <button 
                type="button"
                onclick={nextProduct} 
                class="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-background/70 backdrop-blur-md text-foreground transition-all hover:bg-background"
                aria-label="Next Image"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Additional Client Partner Banner -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="relative overflow-hidden rounded-2xl border border-border/30 h-32 group">
        <img 
          src="/images/client.webp" 
          alt="Client Collaboration" 
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div class="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent"></div>
        <div class="absolute inset-y-0 left-6 flex items-center">
          <p class="text-sm font-bold text-foreground">Partner-First Network</p>
        </div>
      </div>

      <div class="relative overflow-hidden rounded-2xl border border-border/30 h-32 group">
        <img 
          src="/images/portolio 1.webp" 
          alt="Portfolio Ecosystem" 
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div class="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent"></div>
        <div class="absolute inset-y-0 left-6 flex items-center">
          <p class="text-sm font-bold text-foreground">Unified Portfolio Solutions</p>
        </div>
      </div>
    </div>

    <!-- CTA Button -->
    <div class="mt-12 flex justify-center">
  
    </div>
  </div>
</section>