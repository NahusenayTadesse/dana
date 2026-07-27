<script lang="ts">
	let { hex }: { hex?: string } = $props();
</script>

<div class="flex items-center gap-2">
	<div class="size-6 rounded" style="background-color: {hex};"></div>
	<span class="font-mono text-sm">{hex}</span>
</div>
