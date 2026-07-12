<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';

	import { LogOut, KeyRound, User } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: string | undefined } = $props();

	let loggingOut = $state(false);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger aria-label={m.account_menu_open_aria()}>
		<Avatar.Root>
			<Avatar.Fallback
				class="flex items-center justify-center rounded-full border-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 font-medium text-white dark:from-indigo-800 dark:via-purple-700 dark:to-pink-800"
			>
				{data?.[0]?.toUpperCase()}
			</Avatar.Fallback>
		</Avatar.Root>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-48 p-2">
		<DropdownMenu.Group>
			<DropdownMenu.Label>{m.account_menu_label()}</DropdownMenu.Label>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={() => goto('/account')}>
				<User />
				{m.account_menu_my_account()}
			</DropdownMenu.Item>

			<DropdownMenu.Item onclick={() => goto('/change-password')}>
				<KeyRound />
				{m.account_menu_change_password()}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				<form
					method="post"
					action="/dashboard/?/logout"
					use:enhance={() => {
						loggingOut = true;

						return async ({ update }) => {
							await update();
							loggingOut = false;
						};
					}}
				>
					<button
						type="submit"
						disabled={loggingOut}
						class="flex flex-row items-center justify-center gap-2"
					>
						{#if loggingOut}
							<LoadingBtn name={m.account_menu_logging_out()} />
						{:else}
							<LogOut class="" /> {m.account_menu_logout()}
						{/if}
					</button>
				</form>
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
