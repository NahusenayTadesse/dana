import { z } from 'zod/v4';
import { SITE_IMAGE_SLOT_MAP } from '$lib/siteImages';
import { imageFile } from '$lib/uploadTypes';

const slotKey = z.string().refine((value) => value in SITE_IMAGE_SLOT_MAP, {
	message: 'Unknown image slot.'
});

/**
 * One form for every slot. `existing` is the comma-joined list of stored values
 * the admin chose to keep (GalleryUpload edits it in place), `image` is a
 * single replacement and `images` the newly added gallery files.
 */
export const updateSlotSchema = z.object({
	slot: slotKey,
	existing: z.string().default(''),
	// Same allowlist as the uploader, so e.g. a HEIC fails validation up front.
	image: imageFile().optional(),
	images: imageFile().array().optional()
});

export const resetSlotSchema = z.object({
	slot: slotKey
});

export type UpdateSlot = z.infer<typeof updateSlotSchema>;
export type ResetSlot = z.infer<typeof resetSlotSchema>;
