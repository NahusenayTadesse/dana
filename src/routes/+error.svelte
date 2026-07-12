<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import {
		AlertTriangleIcon,
		ArrowLeftIcon,
		HomeIcon,
		RefreshCwIcon,
		MailIcon
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	const status = $derived(page.status ?? 500);
	const errorMessage = $derived(page.error?.message ?? m.error_page_default_message());

	function getErrorTitle(status: number) {
		if (status === 404) return m.error_page_not_found_title();
		if (status === 403) return m.error_page_forbidden_title();
		if (status === 401) return m.error_page_unauthorized_title();
		if (status >= 500) return m.error_page_server_title();

		return m.error_page_generic_title();
	}

	function getErrorDescription(status: number) {
		if (status === 404) return m.error_page_not_found_description();
		if (status === 403) return m.error_page_forbidden_description();
		if (status === 401) return m.error_page_unauthorized_description();
		if (status >= 500) return m.error_page_server_description();

		return m.error_page_generic_description();
	}

	function goBack() {
		window.history.back();
	}

	function refreshPage() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>{status} | {m.error_page_meta_title()}</title>
</svelte:head>

<section
	class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8"
>
	<div
		class="absolute top-0 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="absolute right-0 bottom-0 -z-10 h-96 w-96 rounded-full bg-destructive/10 blur-3xl"
	></div>

	<div class="mx-auto w-full max-w-2xl">
		<div
			class="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-2xl backdrop-blur-2xl"
		>
			<div class="border-b border-border bg-muted/30 px-6 py-5 sm:px-8">
				<div class="flex items-center gap-3">
					<div
						class="flex size-11 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive"
					>
						<AlertTriangleIcon class="size-5" />
					</div>

					<div>
						<p class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
							{m.error_page_badge()}
						</p>
						<p class="font-mono text-sm font-semibold text-destructive">
							{m.error_page_status_label({ status })}
						</p>
					</div>
				</div>
			</div>

			<div class="px-6 py-10 text-center sm:px-8 sm:py-12">
				<p class="font-mono text-7xl font-black tracking-tight text-primary/20 sm:text-8xl">
					{status}
				</p>

				<h1 class="-mt-4 text-3xl font-black tracking-tight sm:text-5xl">
					{getErrorTitle(status)}
				</h1>

				<p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
					{getErrorDescription(status)}
				</p>

				<div
					class="mx-auto mt-6 max-w-xl rounded-2xl border border-border bg-background/70 p-4 text-left"
				>
					<p class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
						{m.error_page_details_label()}
					</p>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						{errorMessage}
					</p>
				</div>

				<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button href="/" class="gap-2">
						<HomeIcon class="size-4" />
						{m.error_page_back_home()}
					</Button>

					<Button variant="outline" class="gap-2" onclick={goBack}>
						<ArrowLeftIcon class="size-4" />
						{m.error_page_go_back()}
					</Button>

					<Button variant="outline" class="gap-2" onclick={refreshPage}>
						<RefreshCwIcon class="size-4" />
						{m.error_page_try_again()}
					</Button>
				</div>

				<div class="mt-8 border-t border-border pt-6">
					<a
						href="/contact-us"
						class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
					>
						<MailIcon class="size-4" />
						{m.error_page_contact_support()}
					</a>
				</div>
			</div>
		</div>
	</div>
</section>
