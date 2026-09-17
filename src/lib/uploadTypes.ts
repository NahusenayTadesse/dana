import { z } from 'zod/v4';

// MIME types that `$lib/server/upload.ts` will actually write to disk. Form
// schemas must not accept anything outside these, or validation passes and the
// upload then throws (HEIC/HEIF are not in the uploader's allowlist).

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

/** Images plus PDF — for receipts and documents. */
export const IMAGE_OR_PDF_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];

/** `accept` attribute value for image inputs. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** An image file: JPEG, PNG, WEBP, AVIF or GIF, up to 10 MB. */
export const imageFile = () =>
	z
		.file()
		.max(MAX_UPLOAD_BYTES, 'File must be 10 MB or smaller')
		.mime(IMAGE_MIME_TYPES, 'Use a JPEG, PNG, WEBP, AVIF or GIF image');

/** An image or PDF, up to 10 MB. */
export const imageOrPdfFile = () =>
	z
		.file()
		.max(MAX_UPLOAD_BYTES, 'File must be 10 MB or smaller')
		.mime(IMAGE_OR_PDF_MIME_TYPES, 'Use an image (JPEG, PNG, WEBP, AVIF, GIF) or a PDF');
