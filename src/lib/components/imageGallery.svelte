<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import * as m from '$lib/paraglide/messages.js';
  import { cubicOut } from 'svelte/easing';

  // Generate the 10 image paths dynamically from the static/assets directory
  const images = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    src: `/assets/image${i + 1}.jpg`,
    title: m.team_gallery_image_title({ index: i + 1 }),
    subtitle: m.team_gallery_image_subtitle()
  }));

  // Svelte 5 Rune State for active lightbox
  let selectedIndex = $state<number | null>(null);

  function openLightbox(index: number) {
    selectedIndex = index;
  }

  function closeLightbox() {
    selectedIndex = null;
  }

  function nextImage(e?: Event) {
    e?.stopPropagation();
    if (selectedIndex !== null) {
      selectedIndex = (selectedIndex + 1) % images.length;
    }
  }

  function prevImage(e?: Event) {
    e?.stopPropagation();
    if (selectedIndex !== null) {
      selectedIndex = (selectedIndex - 1 + images.length) % images.length;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (selectedIndex === null) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowRight') nextImage();
    if (event.key === 'ArrowLeft') prevImage();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="py-16 px-6 max-w-[1320px] mx-auto w-full">
  <!-- Header -->
  <div class="mb-10 text-center max-w-xl mx-auto">
    <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
      Asset Collection
    </h2>
    <p class="mt-3 text-muted-foreground text-sm sm:text-base">
      Click on any preview to open the lightbox gallery viewer.
    </p>
  </div>

  <!-- Grid Gallery -->
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
    {#each images as image, i (image.id)}
      <div 
        in:fly={{ y: 20, duration: 500, delay: i * 60, easing: cubicOut }}
        class="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 cursor-pointer"
        onclick={() => openLightbox(i)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && openLightbox(i)}
      >
        <!-- Thumbnail Image -->
        <img 
          src={image.src} 
          alt={image.title}
          loading="lazy"
          class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        <!-- Hover Overlay Gradient -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <span class="font-mono text-[10px] tracking-widest text-primary-foreground/70 uppercase">
            0{image.id} / 10
          </span>
          <h3 class="font-bold text-white text-sm translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            {image.title}
          </h3>
          <p class="text-[11px] text-gray-300 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
            {image.subtitle}
          </p>
        </div>

        <!-- Glass Badge in Corner -->
        <div class="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/60 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6M14 10l6-6M9 21H3v-6M10 14l-6 6"/>
          </svg>
        </div>
      </div>
    {/each}
  </div>

  <!-- Lightbox Modal -->
  {#if selectedIndex !== null}
    <!-- Backdrop -->
    <div
      in:fade={{ duration: 250 }}
      out:fade={{ duration: 200 }}
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
    >
      <!-- Click-outside-to-close as a real button behind the card: a click
           handler on the backdrop div was unreachable by keyboard, and it
           forced the card to carry a stopPropagation handler of its own. -->
      <button
        type="button"
        class="absolute inset-0 z-0 cursor-default"
        onclick={closeLightbox}
        aria-label={m.lightbox_close()}
      ></button>

      <!-- Modal Card -->
      <div
        in:scale={{ start: 0.93, duration: 300, easing: cubicOut }}
        out:scale={{ start: 0.95, duration: 200 }}
        class="relative z-10 max-w-5xl w-full max-h-[85vh] flex flex-col items-center justify-center outline-none"
        role="dialog"
        aria-modal="true"
        aria-label={m.lightbox_aria()}
        tabindex="-1"
      >
        <!-- Close Button -->
        <button 
          onclick={closeLightbox}
          class="absolute -top-12 right-0 text-white/70 hover:text-white p-2 rounded-full transition-transform hover:scale-110 active:scale-95"
          aria-label={m.lightbox_close()}
        >
          <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        <!-- Main Displayed Image -->
        <div class="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/40">
          <img 
            src={images[selectedIndex].src} 
            alt={images[selectedIndex].title}
            class="max-h-[75vh] w-auto max-w-full object-contain select-none"
          />

          <!-- Floating Info Overlay inside Modal -->
          <div class="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-between items-end">
            <div>
              <p class="font-mono text-xs text-primary-foreground/70 uppercase">
                {m.lightbox_counter({ current: selectedIndex + 1, total: images.length })}
              </p>
              <h3 class="text-xl font-bold text-white">
                {images[selectedIndex].title}
              </h3>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <button 
          onclick={prevImage}
          class="absolute left-2 sm:-left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 border border-white/20 text-white/80 hover:text-white hover:bg-black/90 transition-all hover:scale-110 active:scale-90 backdrop-blur-md"
          aria-label={m.lightbox_previous()}
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <button 
          onclick={nextImage}
          class="absolute right-2 sm:-right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 border border-white/20 text-white/80 hover:text-white hover:bg-black/90 transition-all hover:scale-110 active:scale-90 backdrop-blur-md"
          aria-label={m.lightbox_next()}
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  {/if}
</section>