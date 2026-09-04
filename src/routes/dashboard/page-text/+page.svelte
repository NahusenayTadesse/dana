<script lang="ts">
	import SettingsForm from '$lib/components/dashboard/settings-form.svelte';

	let { data } = $props();
</script>

<SettingsForm
	{data}
	screen="content"
	title="Page Text & Figures"
	intro="The headline figures on the About and Factory pages, and the call-to-action band at the bottom of the homepage. Anything written in two languages has a field for each."
/>
