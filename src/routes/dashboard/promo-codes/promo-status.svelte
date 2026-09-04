<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { BadgeCheck, CalendarClock, CircleSlash, OctagonMinus, Ban } from '@lucide/svelte';
	import type { PromoRow } from './types';

	let { status }: { status: PromoRow['status'] } = $props();

	// Table/statuses.svelte has no key for a code that is scheduled, expired or
	// spent, and it prints the key as the label — so these four states would all
	// read "unknown" in grey.
	const meta = {
		Active: { icon: BadgeCheck, colour: 'bg-green-500' },
		Scheduled: { icon: CalendarClock, colour: 'bg-yellow-500' },
		Expired: { icon: OctagonMinus, colour: 'bg-red-500' },
		'Used up': { icon: CircleSlash, colour: 'bg-red-500' },
		Off: { icon: Ban, colour: 'bg-gray-500' }
	} as const;

	const { icon: Icon, colour } = $derived(meta[status] ?? meta.Off);
</script>

<Badge variant="secondary" class="{colour} text-white">
	<Icon />
	{status}
</Badge>
