// src/lib/server/upload.ts
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { env } from '$env/dynamic/private';
import { randomUUID } from 'crypto';
import { invalidateStatCache } from '$lib/server/fileCache';

const FILES_DIR = path.resolve(env.FILES_DIR ?? '.tempFiles');

/* ensure folder exists once, at module load */
if (!fs.existsSync(FILES_DIR)) {
	fs.mkdirSync(FILES_DIR, { recursive: true });
}

/**
 * Extensions we are willing to write to disk.
 *
 * Deliberately permissive — this covers product/blog imagery, customer TIN
 * documents and spreadsheets, and the media the /files route streams — because
 * the point of the check is to reject executable and script-bearing uploads,
 * not to police document formats.
 *
 * `.svg` is excluded on purpose: SVG is script-bearing, and serving one back
 * from our own origin would be a stored-XSS vector. Use PNG/WEBP for logos.
 */
const ALLOWED_EXTENSIONS = new Set([
	// images
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.avif',
	'.gif',
	// documents
	'.pdf',
	'.txt',
	'.csv',
	'.doc',
	'.docx',
	'.xls',
	'.xlsx',
	// media
	'.mp3',
	'.mp4',
	'.webm'
]);

export class UploadError extends Error {}

/**
 * Save an uploaded file and return the stored file name.
 *
 * @param file  File object coming from formData
 * @returns     The generated file name (with extension) that was written to disk
 * @throws      {UploadError} if no file was supplied or its type isn't allowed
 * @throws      If the write itself fails
 */
export async function saveUploadedFile(file: File | undefined | null): Promise<string> {
	// The signature has always advertised `undefined`, but `path.extname(undefined)`
	// throws a bare TypeError and `file.stream()` was unguarded — so callers that
	// trusted the type got a 500 instead of a usable error.
	if (!file || typeof file.stream !== 'function') {
		throw new UploadError('No file was provided to upload.');
	}

	const ext = path.extname(file.name ?? '').toLowerCase();
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		throw new UploadError(
			`Files of type "${ext || 'unknown'}" can't be uploaded. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}.`
		);
	}

	// The stored name is a UUID, so a hostile original filename can't traverse
	// out of FILES_DIR or collide with an existing file.
	const fileName = `${randomUUID()}${ext}`;
	const target = path.join(FILES_DIR, fileName);

	// Node's fromWeb types are narrower than the DOM ReadableStream that File
	// exposes; they are the same object at runtime.
	const nodeStream = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);

	try {
		await pipeline(nodeStream, fs.createWriteStream(target));
	} catch (err) {
		// A partial file left behind by a failed write would be served as a
		// truncated response by /files/[name].
		await fsp.rm(target, { force: true }).catch(() => {});
		throw err;
	}

	// Must match the key /files/[name] caches under, which is
	// path.resolve(FILES_DIR, <fileName>). This previously passed
	// path.resolve(FILES_DIR, target) — with target ALREADY containing
	// FILES_DIR — producing ".../.tempFiles/.tempFiles/<name>", a key that
	// could never match, so invalidation silently did nothing.
	invalidateStatCache(path.resolve(FILES_DIR, fileName));

	return fileName; // store this string in your DB
}

/**
 * Remove a previously stored upload by the file name saveUploadedFile returned.
 * Used to clean up when the DB write that would have referenced it rolls back.
 * Missing files are not an error — the goal state is "not on disk".
 */
export async function deleteUploadedFile(fileName: string): Promise<void> {
	// Defend against a caller passing through something attacker-influenced:
	// only ever touch a plain file directly inside FILES_DIR.
	const target = path.resolve(FILES_DIR, fileName);
	const relative = path.relative(FILES_DIR, target);
	if (relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep)) {
		throw new UploadError('Refusing to delete a path outside the uploads directory.');
	}

	await fsp.rm(target, { force: true });
	invalidateStatCache(target);
}
