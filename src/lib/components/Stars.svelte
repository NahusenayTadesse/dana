<!--  Stars.svelte  -->
<script lang="ts">
  import { onMount } from 'svelte';

  let stars: { top: string; left: string; delay: string }[] = [];         
  let container;                

  onMount(() => {
    /* create 200 stars once the DOM exists */
    stars = Array.from({ length: 200 }, () => ({
      top: `${100 * Math.random()}%`,
      left: `${100 * Math.random()}%`,
      delay: `${2 * Math.random()}s`  
    }));
  });
</script>

<!-- the star field -->
<div bind:this={container} class="stars -z-1 bg-linear-to-r from-dark-blue to-black h-screen w-screen dark:block hidden">
  {#each stars as star}
    <figure
      class="star"
      style:top={star.top}
      style:left={star.left}
      style:animation-delay={star.delay}
    > </figure>
  {/each}
</div>

<style>
  /* full-screen black sky */
  .stars {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }

  /* a 1 px white dot that fades in and out forever */
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 1px 1px rgba(255, 255, 255, 0.4);
    animation: twinkle 1s infinite;
  }

  @keyframes twinkle {
    0%, 100% { opacity: 0.2; }
    50%      { opacity: 1; }
  }
</style>