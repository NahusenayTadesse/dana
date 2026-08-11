import Papa from 'papaparse';

/**
 * Shared print-to-PDF plumbing.
 *
 * Everything printable in the app is copied into a single `.print-sheet`
 * element parented directly to <body>; the print stylesheet in `layout.css`
 * hides the app and reveals only that sheet. Printing the real DOM — rather
 * than redrawing it into a jsPDF document — is what lets images, badges,
 * colours and layout survive the trip to paper. "Save as PDF" in the browser's
 * print dialog produces the file.
 */

let sheet: HTMLDivElement | null = null;
let previousTitle: string | null = null;
let listening = false;

function getSheet() {
	if (!sheet || !sheet.isConnected) {
		sheet = document.createElement('div');
		sheet.className = 'print-sheet';
		document.body.appendChild(sheet);
	}
	return sheet;
}

/** Put the page back the way it was once the dialog closes (or is cancelled). */
export function endPrint() {
	document.documentElement.classList.remove('printing', 'printing-portrait');
	if (sheet) sheet.innerHTML = '';
	if (previousTitle !== null) {
		document.title = previousTitle;
		previousTitle = null;
	}
}

function listen() {
	if (listening || typeof window === 'undefined') return;
	window.addEventListener('afterprint', endPrint);
	listening = true;
}

/** Resolve once every <img> in the sheet has settled, so nothing prints blank. */
function imagesReady(scope: HTMLElement) {
	const imgs = Array.from(scope.querySelectorAll('img'));
	return Promise.all(
		imgs.map((img) => {
			img.loading = 'eager';
			if (img.complete && img.naturalWidth > 0) return Promise.resolve();
			return new Promise<void>((resolve) => {
				img.addEventListener('load', () => resolve(), { once: true });
				img.addEventListener('error', () => resolve(), { once: true });
			});
		})
	);
}

/**
 * Controls mean nothing on paper. Sort/label buttons are flattened to their
 * text — column headers live inside them — and true inputs are dropped.
 */
export function stripControls(root: HTMLElement) {
	root.querySelectorAll('button').forEach((b) => {
		const text = (b.textContent || '').trim();
		if (text) {
			const span = document.createElement('span');
			span.textContent = text;
			b.replaceWith(span);
		} else {
			b.remove();
		}
	});
	root
		.querySelectorAll('input, select, textarea, [role="checkbox"], [data-print-hide]')
		.forEach((n) => n.remove());
	return root;
}

/**
 * Fill the print sheet and open the browser's print dialog.
 * `fileName` becomes the suggested PDF name (browsers use document.title).
 */
export async function printSheet(
	fill: (host: HTMLElement) => void,
	fileName: string,
	orientation: 'landscape' | 'portrait' = 'landscape'
) {
	listen();
	const host = getSheet();
	host.innerHTML = '';
	fill(host);

	previousTitle = document.title;
	document.title = fileName;
	document.documentElement.classList.add('printing');
	if (orientation === 'portrait') document.documentElement.classList.add('printing-portrait');

	await new Promise((r) => requestAnimationFrame(r));
	await imagesReady(host);
	window.print();
}

/** Print a live element (a table, a receipt) exactly as it looks on screen. */
export async function printElement(
	target: Element | string,
	{
		fileName,
		title = '',
		orientation = 'landscape'
	}: { fileName: string; title?: string; orientation?: 'landscape' | 'portrait' }
) {
	const source = typeof target === 'string' ? document.querySelector(target) : target;
	if (!source) {
		console.error(`Nothing to print for ${String(target)}.`);
		return;
	}

	const clone = stripControls(source.cloneNode(true) as HTMLElement);
	clone.removeAttribute('id');
	clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));

	await printSheet((host) => {
		if (title) {
			const header = document.createElement('header');
			header.className = 'print-sheet-header';
			const h1 = document.createElement('h1');
			h1.textContent = title;
			const stamp = document.createElement('p');
			stamp.textContent = new Date().toLocaleString();
			header.append(h1, stamp);
			host.appendChild(header);
		}
		host.appendChild(clone);
	}, fileName, orientation);
}

/** Turn a row matrix into a downloaded .csv file. */
export function downloadCSV(rows: (string | number | null | undefined)[][], fileName: string) {
	const csv = Papa.unparse(rows);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${fileName}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}

/** Scrape a rendered <table> into a row matrix for CSV export. */
export function tableToRows(target: Element | string) {
	const el = typeof target === 'string' ? document.querySelector(target) : target;
	if (!el) return [];
	return Array.from(el.querySelectorAll('tr')).map((row) =>
		Array.from(row.querySelectorAll('th, td')).map((cell) =>
			(cell as HTMLElement).innerText.trim()
		)
	);
}
