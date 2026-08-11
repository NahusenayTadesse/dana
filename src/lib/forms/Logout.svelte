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
	import * as m from '$lib/paraglide/messages.js';
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}>
		<X />
		{m.logout_trigger()}
	</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>{m.logout_title()}</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto rounded-md border p-2">
			<h5 class="text-center">{m.logout_confirm()}</h5>
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
								toast.success(m.logout_success());
							} else {
								toast.error(m.logout_failed());
							}
							// 3. stop spinner
						};
					}}
				>
					<Button type="submit" disabled={deleting} variant="destructive" size="lg">
						{#if deleting}
							<LoadingBtn name={m.logout_loading()} />
						{:else}
							<LogOut />
							{m.logout_title()}
						{/if}
					</Button>
				</form>

				<Button onclick={() => (open = false)} size="lg">{m.common_cancel()}</Button>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
