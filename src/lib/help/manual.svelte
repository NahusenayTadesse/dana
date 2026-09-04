<script lang="ts">
	import { HELP_SECTIONS, TOPIC_COUNT } from './content';
	import RichText from './rich-text.svelte';

	/**
	 * The whole manual as one printable document — a title page, contents, then
	 * every section in full.
	 *
	 * It lives in the page but hidden, and is handed to $lib/print's printElement
	 * when the operator asks for the PDF. Printing the real DOM is how the rest
	 * of the app makes PDFs (see the comment at the top of $lib/print.ts), so the
	 * logo, the colours and the layout survive the trip to paper.
	 *
	 * It is laid out as a delivered document rather than a screen dump: a
	 * letterhead masthead, a title page, then numbered chapters. The palette is
	 * taken straight off the mark at the top (navy #071046, green #73c227) so the
	 * whole thing reads as one piece of stationery.
	 */
	let { generatedOn = new Date() }: { generatedOn?: Date } = $props();

	const stamp = $derived(
		generatedOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
	);
</script>

{#snippet brandRule()}
	<!-- The three blocks echo the squares in the mark; purely decorative, so it
	     is hidden from anything reading the document aloud. -->
	<div class="brand-rule" aria-hidden="true">
		<span class="rule-navy"></span>
		<span class="rule-green"></span>
		<span class="rule-dot"></span>
	</div>
{/snippet}

<div class="manual">
	<!-- Title page -->
	<section class="cover">
		<header class="masthead">
			<img class="masthead-logo" src="/digitalLogo.png" alt="Digital Construct" />
			<p class="masthead-tag">digitalconstruct.io</p>
		</header>

		{@render brandRule()}

		<div class="cover-body">
			<p class="cover-eyebrow">Dashboard manual</p>
			<h1 class="cover-title">Running the Dana&nbsp;Steel website</h1>
			<p class="cover-sub">
				A complete guide to the dashboard — what each screen does, how to change it, and what happens
				when you do. Written for the people who run the business.
			</p>

			<dl class="cover-facts">
				<div><dt>Sections</dt><dd>{HELP_SECTIONS.length}</dd></div>
				<div><dt>Topics</dt><dd>{TOPIC_COUNT}</dd></div>
				<div><dt>Issued</dt><dd>{stamp}</dd></div>
			</dl>
		</div>

		<aside class="cover-note">
			<span class="cover-note-mark" aria-hidden="true"></span>
			<p>
				Keep this beside the dashboard. Every screen named here is the one you are looking at, and
				every step is written in the order you would actually do it.
			</p>
		</aside>
	</section>

	<!-- Contents -->
	<section class="contents">
		<h2 class="doc-h2">Contents</h2>
		<ol class="toc">
			{#each HELP_SECTIONS as section, i (section.id)}
				<li>
					<span class="toc-n">{String(i + 1).padStart(2, '0')}</span>
					<div>
						<p class="toc-title">{section.title}</p>
						<p class="toc-blurb">{section.blurb}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<!-- Body -->
	{#each HELP_SECTIONS as section, i (section.id)}
		<section class="chapter">
			<header class="chapter-head">
				<span class="chapter-n">{String(i + 1).padStart(2, '0')}</span>
				<div>
					<h2 class="doc-h2">{section.title}</h2>
					<p class="chapter-blurb">{section.blurb}</p>
				</div>
			</header>

			{#each section.topics as topic (topic.id)}
				<article class="topic">
					<h3 class="doc-h3">{topic.title}</h3>
					<p class="topic-summary">{topic.summary}</p>

					{#if topic.where}
						<p class="topic-where"><span>Where</span>{topic.where}</p>
					{/if}

					{#if topic.steps?.length}
						<ol class="steps">
							{#each topic.steps as step, s (s)}
								<li><RichText text={step} /></li>
							{/each}
						</ol>
					{/if}

					{#if topic.notes?.length}
						<ul class="notes">
							{#each topic.notes as note, n (n)}
								<li><RichText text={note} /></li>
							{/each}
						</ul>
					{/if}
				</article>
			{/each}
		</section>
	{/each}

	<!-- Closing stationery: the mark again, small, the way a letter is signed. -->
	<footer class="colophon">
		{@render brandRule()}
		<div class="colophon-row">
			<img class="colophon-logo" src="/digitalLogo.png" alt="Digital Construct" />
			<p class="colophon-meta">Issued {stamp} · digitalconstruct.io</p>
		</div>
	</footer>
</div>

<style>
	/*
		Self-contained on purpose: the print sheet strips the app's own chrome, so
		this document carries its own type scale, palette and rules rather than
		relying on anything from the dashboard around it.
	*/
	.manual {
		--ink: #101a2b;
		--soft: #4a5768;
		--rule: #d5dce6;
		--navy: #071046;
		--green: #73c227;
		color: var(--ink);
		font-size: 11pt;
		line-height: 1.55;
		max-width: 46rem;
		margin: 0 auto;
		/* Chrome leaves background colours out of a print unless "Background
		   graphics" is ticked — off by default. This overrides that checkbox, and
		   it is inherited, so every panel and chip below prints as designed. */
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}

	/* ---- Letterhead ------------------------------------------------------ */

	.masthead {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.masthead-logo {
		width: 220px;
		max-width: 220px;
		height: auto;
		object-fit: contain;
	}

	.masthead-tag {
		margin: 0 0 0.35rem;
		font-size: 8.5pt;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--soft);
		white-space: nowrap;
	}

	.brand-rule {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 0.9rem;
	}
	.brand-rule span {
		height: 5px;
		border-radius: 1px;
	}
	.rule-navy {
		flex: 1;
		background: var(--navy);
	}
	.rule-green {
		width: 46px;
		background: var(--green);
	}
	.rule-dot {
		width: 5px;
		background: var(--navy);
	}

	/* ---- Title page ------------------------------------------------------ */

	.cover {
		display: flex;
		flex-direction: column;
		min-height: 232mm;
		margin-bottom: 2rem;
	}

	/* Pushed off the masthead and away from the closing note so the title sits
	   in the optical middle of the page rather than crowding the top. */
	.cover-body {
		margin: auto 0;
		padding: 2rem 0;
	}

	.cover-eyebrow {
		margin: 0 0 0.5rem;
		font-size: 9pt;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--green);
		font-weight: 700;
	}

	.cover-title {
		margin: 0 0 0.75rem;
		font-size: 34pt;
		line-height: 1.04;
		letter-spacing: -0.025em;
		font-weight: 800;
		color: var(--navy);
		max-width: 22ch;
	}

	.cover-sub {
		margin: 0;
		max-width: 36rem;
		color: var(--soft);
		font-size: 11.5pt;
	}

	.cover-facts {
		display: flex;
		gap: 2.6rem;
		margin: 2.2rem 0 0;
	}
	.cover-facts div {
		margin: 0;
		border-top: 3px solid var(--green);
		padding-top: 0.5rem;
		min-width: 6.5rem;
	}
	.cover-facts dt {
		margin: 0;
		font-size: 8.5pt;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--soft);
	}
	.cover-facts dd {
		margin: 0.15rem 0 0;
		font-size: 14pt;
		font-weight: 700;
		color: var(--navy);
	}

	.cover-note {
		display: flex;
		align-items: flex-start;
		gap: 0.85rem;
		background: var(--navy);
		color: #fff;
		padding: 1rem 1.2rem;
		/* One squared-off corner and one soft corner — the same asymmetry the D
		   in the mark has. */
		border-radius: 3px 3px 16px 3px;
	}
	.cover-note p {
		margin: 0;
		font-size: 10pt;
		line-height: 1.5;
		max-width: 52ch;
	}
	.cover-note-mark {
		flex: none;
		width: 12px;
		height: 12px;
		margin-top: 0.28rem;
		background: var(--green);
		border-radius: 1px;
	}

	/* ---- Contents -------------------------------------------------------- */

	.contents {
		margin-bottom: 2rem;
	}

	.doc-h2 {
		margin: 0;
		font-size: 16pt;
		font-weight: 800;
		letter-spacing: -0.015em;
		color: var(--navy);
	}

	.toc {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
	}
	.toc li {
		display: grid;
		grid-template-columns: 2.4rem 1fr;
		gap: 0 0.7rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--rule);
	}
	.toc-n {
		font-family: ui-monospace, monospace;
		font-size: 9pt;
		font-weight: 700;
		color: var(--green);
		padding-top: 0.15rem;
	}
	.toc-title {
		margin: 0;
		font-weight: 700;
		color: var(--navy);
	}
	.toc-blurb {
		margin: 0;
		font-size: 9.5pt;
		color: var(--soft);
	}

	/* ---- Chapters -------------------------------------------------------- */

	.chapter {
		margin-bottom: 1.8rem;
	}

	.chapter-head {
		display: grid;
		grid-template-columns: 2.6rem 1fr;
		gap: 0 0.75rem;
		align-items: start;
		padding-bottom: 0.6rem;
		border-bottom: 2px solid var(--navy);
		break-after: avoid;
	}
	.chapter-n {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.1rem;
		height: 2.1rem;
		background: var(--navy);
		color: #fff;
		font-family: ui-monospace, monospace;
		font-size: 10pt;
		font-weight: 700;
		border-radius: 3px 3px 12px 3px;
	}
	.chapter-blurb {
		margin: 0.25rem 0 0;
		font-size: 10pt;
		color: var(--soft);
	}

	.topic {
		padding: 0.9rem 0;
		border-bottom: 1px solid var(--rule);
		break-inside: avoid;
	}

	.doc-h3 {
		margin: 0 0 0.2rem;
		font-size: 12pt;
		font-weight: 700;
		color: var(--ink);
	}

	.topic-summary {
		margin: 0;
		color: var(--soft);
	}

	/* A pointer to a screen, so it is set apart from the prose like a label on a
	   drawing rather than run in with it. */
	.topic-where {
		margin: 0.5rem 0 0;
		font-size: 9.5pt;
		color: var(--navy);
		font-weight: 600;
		border-left: 3px solid var(--green);
		padding-left: 0.6rem;
	}
	.topic-where span {
		font-size: 8pt;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-weight: 500;
		margin-right: 0.45rem;
		color: var(--soft);
	}

	.steps {
		margin: 0.6rem 0 0;
		padding-left: 1.2rem;
		/* Tailwind's preflight strips list markers globally, so a numbered list
		   has to ask for its numbers back — without this the steps print as an
		   indented block with no 1, 2, 3 at all. */
		list-style: decimal;
	}
	.steps li {
		margin-bottom: 0.28rem;
		padding-left: 0.15rem;
	}
	.steps li::marker {
		color: var(--navy);
		font-weight: 700;
	}

	.notes {
		margin: 0.6rem 0 0;
		padding-left: 1.2rem;
		list-style: square;
	}
	.notes li {
		margin-bottom: 0.28rem;
		padding-left: 0.15rem;
		color: var(--soft);
	}
	.notes li::marker {
		color: var(--green);
	}

	/* ---- Sign-off -------------------------------------------------------- */

	.colophon {
		margin-top: 2.2rem;
		break-inside: avoid;
	}
	.colophon-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		margin-top: 0.9rem;
	}
	.colophon-logo {
		width: 150px;
		max-width: 150px;
		height: auto;
		object-fit: contain;
	}
	.colophon-meta {
		margin: 0;
		font-size: 8.5pt;
		letter-spacing: 0.06em;
		color: var(--soft);
		text-align: right;
	}

	/*
		The app's print stylesheet flattens everything inside the print sheet to
		one ink colour, caps every image at 90px and greys every border — the right
		call for a data table exported from a dark theme, where the alternative is
		white text on white paper. A manual is a document though: the mark has to
		read at letterhead size, the navy panels need their white text, and the
		accents carry meaning. Svelte's scoping puts these selectors above that
		blanket rule, so the two can coexist without either being loosened.
	*/
	@media print {
		.manual,
		.manual * {
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		/* The mark is the letterhead, not an inline picture: the sheet's 90px
		   image cap would shrink it to a thumbnail. */
		.manual .masthead-logo {
			width: 220px !important;
			max-width: 220px !important;
			max-height: none !important;
		}
		.manual .colophon-logo {
			width: 150px !important;
			max-width: 150px !important;
			max-height: none !important;
		}

		.manual .cover-title,
		.manual .doc-h2,
		.manual .toc-title,
		.manual .cover-facts dd,
		.manual .topic-where,
		.manual .steps li::marker {
			color: #071046 !important;
		}

		.manual .cover-eyebrow,
		.manual .toc-n,
		.manual .notes li::marker {
			color: #73c227 !important;
		}

		/* Knocked out of the navy panels — the sheet's blanket #111 would leave
		   these invisible on their own background. */
		.manual .cover-note,
		.manual .cover-note p,
		.manual .chapter-n {
			color: #fff !important;
		}

		.manual .masthead-tag,
		.manual .cover-sub,
		.manual .cover-facts dt,
		.manual .toc-blurb,
		.manual .chapter-blurb,
		.manual .topic-summary,
		.manual .topic-where span,
		.manual .notes li,
		.manual .colophon-meta {
			color: #4a5768 !important;
		}

		.manual .rule-navy,
		.manual .rule-dot,
		.manual .chapter-n,
		.manual .cover-note {
			background: #071046 !important;
		}

		.manual .rule-green,
		.manual .cover-note-mark {
			background: #73c227 !important;
		}

		.manual .chapter-head {
			border-bottom-color: #071046 !important;
		}

		.manual .cover-facts div {
			border-top-color: #73c227 !important;
		}

		.manual .topic-where {
			border-left-color: #73c227 !important;
		}

		/* The title page is a page. So is the contents, and so is each chapter —
		   a manual is read by section. */
		.manual .cover {
			break-after: page;
		}

		.manual .contents {
			break-after: page;
		}

		.manual .chapter {
			break-before: page;
		}
	}
</style>
