import { z } from 'zod/v4';
import { SITE_IMAGE_SLOT_MAP } from '$lib/siteImages';

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
	image: z.file().max(10_000_000, 'Images must be 10MB or smaller.').optional(),
	images: z.file().max(10_000_000, 'Images must be 10MB or smaller.').array().optional()
});

export const resetSlotSchema = z.object({
	slot: slotKey
});

export type UpdateSlot = z.infer<typeof updateSlotSchema>;
export type ResetSlot = z.infer<typeof resetSlotSchema>;
