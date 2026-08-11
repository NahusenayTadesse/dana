<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import * as m from '$lib/paraglide/messages.js';

  // Every image file actually present in /static/assets — keep this list in sync
  // with the folder contents (SvelteKit can't glob the static dir at build time).
  const imageFiles = [
    '1.webp',
    '2.webp',
    '4.webp',
    '5.webp',
    '8.webp',
    '10.webp',
    '11.webp',
    '12.webp',
    '14.webp',
    '15.webp',
    '18.webp',
    '19.webp',
    '77.webp',
    'products show4.webp',
    'factory-gate.jpg',
    'forklift.jpg',
    'reception.jpg',
    'rollforming.jpg',
    'showroom.jpg',
    'slitting-line.jpg',
    'warehouse.jpg',
    'image1.jpg',
    'image2.jpg',
    'image5.jpg',
    'image7.jpg',
    'image8.jpg',
    'image9.jpg',
    'image10.jpg'
  ];

  const images = imageFiles.map((file, i) => ({
    id: i + 1,
    src: encodeURI(`/assets/${file}`),
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

  // Repeating bento rhythm — every 8 tiles has one big feature, one tall, one wide.
  function tileSpan(i: number) {
    switch (i % 8) {
      case 0:
        return 'sm:col-span-2 sm:row-span-2';
      case 3:
        return 'sm:row-span-2';
      case 5:
        return 'sm:col-span-2';
      default:
        return '';
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="py-16 px-6  max-w-9/10 mx-auto w-full">
  <!-- Header -->


  <!-- Grid Gallery -->
  <div
    class="grid grid-flow-dense grid-cols-2 auto-rows-[140px] gap-4 sm:grid-cols-3 sm:auto-rows-[160px] md:grid-cols-4 md:auto-rows-[190px]"
  >
    {#each images as image, i (image.id)}
      <div
        in:fly={{ y: 20, duration: 500, delay: i * 40, easing: cubicOut }}
        class="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md transition-all duration-500 hover:-translate-y-1 hover:rotate-[-0.3deg] hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer {tileSpan(
          i
        )}"
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
          class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        <!-- Resting gradient so tiles read as a cohesive mosaic even without hover -->
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-0"
        ></div>

        <!-- Hover ring accent -->
        <div
          class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-2 ring-primary/50 ring-inset transition-opacity duration-300 group-hover:opacity-100"
        ></div>

        <!-- Hover Overlay Gradient -->
        <div
          class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span class="font-mono text-[10px] tracking-widest text-primary-foreground/70 uppercase">
            {String(image.id).padStart(2, '0')} / {images.length}
          </span>
          <h3
            class="translate-y-2 text-sm font-bold text-white transition-transform duration-300 group-hover:translate-y-0"
          >
            {image.title}
          </h3>
          <p
            class="translate-y-2 text-[11px] text-gray-300 transition-transform delay-75 duration-300 group-hover:translate-y-0"
          >
            {image.subtitle}
          </p>
        </div>

        <!-- Glass Badge in Corner -->
        <div
          class="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-card/60 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
        >
          <svg
            class="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 3h6v6M14 10l6-6M9 21H3v-6M10 14l-6 6" />
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