<script lang="ts">
	import SettingsForm from '$lib/components/dashboard/settings-form.svelte';
	import { can } from '$lib/permissions';

	let { data } = $props();
</script>

<SettingsForm
	{data}
	canEdit={can(data.access, 'settings.edit')}
	screen="operations"
	title="Business Settings"
	intro="The VAT rate applied across the site, and where staff notifications are sent. These affect money and who gets told about an order, so they sit apart from the wording screens."
/>
