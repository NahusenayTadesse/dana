<script lang="ts">
	import SettingsForm from '$lib/components/dashboard/settings-form.svelte';

	let { data } = $props();
</script>

<SettingsForm
	{data}
	screen="company"
	title="Company Details"
	intro="Your phone numbers, email addresses, addresses, opening hours and social links. These feed the site header, the footer, the contact page, the maps and the website assistant all at once, so you only change them here."
/>
