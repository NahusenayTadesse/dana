<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { PERMISSION_MODULES } from '$lib/permissions';

	let {
		selected = $bindable([]),
		inherited = [],
		locked = [],
		disabled = false,
		idPrefix = 'perm'
	}: {
		/** Keys granted directly by this editor. */
		selected?: string[];
		/** Keys already granted another way (e.g. through the user's role): shown checked, not editable. */
		inherited?: string[];
		/** Keys this editor may not change (the acting user doesn't hold them). */
		locked?: string[];
		disabled?: boolean;
		idPrefix?: string;
	} = $props();

	const groups = [...new Set(PERMISSION_MODULES.map((m) => m.group))].map((group) => ({
		group,
		modules: PERMISSION_MODULES.filter((m) => m.group === group)
	}));

	const selectedSet = $derived(new Set(selected));
	const inheritedSet = $derived(new Set(inherited));
	const lockedSet = $derived(new Set(locked));

	const keyOf = (module: string, action: string) => `${module}.${action}`;
	const editable = (key: string) => !disabled && !lockedSet.has(key) && !inheritedSet.has(key);

	function toggle(key: string, on: boolean) {
		if (!editable(key)) return;
		const next = new Set(selected);
		if (on) next.add(key);
		else next.delete(key);
		selected = [...next];
	}

	/** Grant or clear every editable action of a module. */
	function toggleModule(module: (typeof PERMISSION_MODULES)[number], on: boolean) {
		const next = new Set(selected);
		for (const action of module.actions) {
			const key = keyOf(module.key, action.key);
			if (!editable(key)) continue;
			if (on) next.add(key);
			else next.delete(key);
		}
		selected = [...next];
	}

	function moduleState(module: (typeof PERMISSION_MODULES)[number]) {
		const keys = module.actions.map((a) => keyOf(module.key, a.key));
		const on = keys.filter((k) => selectedSet.has(k) || inheritedSet.has(k)).length;
		return { all: on === keys.length, some: on > 0 && on < keys.length };
	}
</script>

<div class="flex flex-col gap-6">
	{#each groups as { group, modules } (group)}
		<section class="flex flex-col gap-2">
			<h4 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{group}</h4>
			<div class="divide-y rounded-lg border">
				{#each modules as module (module.key)}
					{@const state = moduleState(module)}
					{@const moduleEditable = module.actions.some((a) => editable(keyOf(module.key, a.key)))}
					<div class="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4">
						<label class="flex min-w-44 items-center gap-2 font-medium">
							<Checkbox
								checked={state.all}
								indeterminate={state.some}
								disabled={!moduleEditable}
								onCheckedChange={(on) => toggleModule(module, on === true)}
								aria-label="All {module.label} permissions"
							/>
							{module.label}
						</label>
						<div class="flex flex-wrap gap-x-4 gap-y-2">
							{#each module.actions as action (action.key)}
								{@const key = keyOf(module.key, action.key)}
								{@const viaOther = inheritedSet.has(key)}
								<label
									class="flex items-center gap-1.5 text-sm"
									class:text-muted-foreground={!editable(key)}
									title={viaOther ? `${action.description} (granted by role)` : action.description}
									for="{idPrefix}-{key}"
								>
									<Checkbox
										id="{idPrefix}-{key}"
										checked={selectedSet.has(key) || viaOther}
										disabled={!editable(key)}
										onCheckedChange={(on) => toggle(key, on === true)}
									/>
									{action.label}
									{#if viaOther}<span class="text-xs">(role)</span>{/if}
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>
