<script>
	import { enhance } from '$app/forms';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { LogOut, X } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	let open = $state(false);

	let deleting = $state(false);

	import { toast } from 'svelte-sonner';
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}><X /> Sign out</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Sign Out</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto rounded-md border p-2">
			<h5 class="text-center">Are you sure you want to Logout?</h5>
			<div class="flex flex-row items-center justify-center gap-4 pt-4">
				<form
					method="post"
					action="/account/?/logout"
					use:enhance={() => {
						deleting = true; // 1. start spinner

						return async ({ result, update }) => {
							await update(); // 2. apply action result to page
							deleting = false;
							if (result) {
								toast.success('Logged out successfully');
							} else {
								toast.error('Failed to log out');
							}
							// 3. stop spinner
						};
					}}
				>
					<Button type="submit" disabled={deleting} variant="destructive" size="lg">
						{#if deleting}
							<LoadingBtn name="Signing Out" />
						{:else}
							<LogOut /> Sign Out
						{/if}
					</Button>
				</form>

				<Button onclick={() => (open = false)} size="lg">Cancel</Button>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
