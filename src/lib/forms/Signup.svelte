<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { SignupSchema } from '$lib/ZodSchema';
	import { Eye, EyeOff } from '@lucide/svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';

	let {
		data,
		action = '?/signup'
	}: { data: SuperValidated<Infer<SignupSchema>>; action?: string } = $props();

	const { form, errors, delayed, enhance, allErrors, message } = superForm(data, {});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let eye = $state(false);
	let EyeIcon = $derived(eye ? EyeOff : Eye);
</script>

<Card.Root class="mx-auto flex w-full max-w-md flex-col justify-center justify-self-center">
	<Card.Header>
		<div class="flex w-full flex-col items-center justify-center">
			<img src="/logo.webp" class="my-4 h-8" alt={m.signup_logo_alt()} />
		</div>
		<Card.Title class="flex flex-row justify-between text-2xl">{m.signup_title()}</Card.Title>
		<Card.Description>{m.signup_description()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" id="main" class="space-y-4" {action} use:enhance>
			<Errors allErrors={$allErrors} />

			<div class="grid gap-4">
				<InputComp
					label={m.signup_full_name_label()}
					name="name"
					type="text"
					{form}
					{errors}
					placeholder={m.signup_full_name_placeholder()}
				/>
			</div>
			<InputComp
				label={m.signup_email_label()}
				name="email"
				type="email"
				{form}
				{errors}
				placeholder={m.signup_email_placeholder()}
			/>
			<InputComp
				label={m.signup_phone_label()}
				name="phone"
				type="tel"
				{form}
				{errors}
				placeholder={m.signup_phone_placeholder()}
			/>
			<div class="grid gap-2">
				<div class="flex items-center">
					<Label for="password">{m.signup_password_label()}</Label>
				</div>
				<div class="relative">
					<Input
						id="password"
						name="password"
						type={eye ? 'text' : 'password'}
						bind:value={$form.password}
						required
					/>
					<button
						type="button"
						onclick={() => (eye = !eye)}
						title={eye ? m.signup_hide_password() : m.signup_show_password()}
						aria-label={eye ? m.signup_hide_password() : m.signup_show_password()}
					>
						<EyeIcon
							class="absolute top-0.5 right-2 h-6 w-6 transition-transform duration-300 ease-in-out"
						/>
					</button>
					{#if $errors.password}<span class="text-red-500">{$errors.password}</span>{/if}
				</div>
			</div>
			<Button type="submit" form="main" class="h-12 w-full text-lg shadow-md">
				{#if $delayed}
					<LoadingBtn name={m.signup_loading()} />
				{:else}
					{m.signup_submit()}
				{/if}
			</Button>
		</form>
	</Card.Content>
</Card.Root>
