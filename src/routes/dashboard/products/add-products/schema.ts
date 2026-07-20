import { z } from 'zod/v4';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 5MB limit
const ACCEPTED_FILE_TYPES = [
	'image/jpeg', // Common for both platforms
	'image/png', // Common for both platforms (and screenshots)
	'image/webp', // Common modern format (often Android screenshots/exports)
	'image/heic', // High Efficiency Image File (iOS default)
	'image/heif', // High Efficiency Image File (related to HEIC)
	'application/pdf' // Document format, kept from original
];


export const add = z.object({
    name: z.string().min(1, 'Product Name is required.').max(100, 'Name must be 100 characters or less.'),
    slug: z.string().min(1, 'Slug is required.').max(120, 'Slug must be 120 characters or less.'),
    brand: z.string().max(100, 'Brand must be 100 characters or less.').optional().nullable(),
    categoryId: z.number('Category is required.' ).int(),
    
    // Images & text blocks
    image: z
        .instanceof(File)
        .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
        .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
        .optional()
        .nullable(),
    gallery: z // Left intact per your request
        .instanceof(File)
        .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
        .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
        .array()
        .optional(),
        
    description: z
        .string()
        .max(255, { message: "Product description can't be more than 255 characters." }) // Adjusted to match your varchar(255)
        .optional()
        .nullable(),
    overview: z.string().optional().nullable(),

    // Retail / inventory fields
    quantity: z.coerce
        .number()
        .int({ message: 'Quantity can only be full numbers, no decimals.' })
        .nonnegative({ message: 'Quantity cannot be negative.' }) // Changed from positive to nonnegative to allow 0 default
        .default(0),
    commissionAmount: z.string().default('0'), // Handled as string for decimal type precision
    supplierId: z.coerce.number().int().optional().nullable(),
    reorderLevel: z.coerce
        .number()
        .int({ message: 'Reorder Level can only be full numbers, no decimals.' })
        .positive({ message: 'Reorder Level must be a positive number.' })
        .optional()
        .nullable(),

    // Technical specifications
    thickness: z.string().max(100).optional().nullable(),
    width: z.string().max(100).optional().nullable(),
    coatingType: z.string().max(100).optional().nullable(),
    colorOptions: z.string().max(255).optional().nullable(),
    sizeRange: z.string().max(100).optional().nullable(),
    finish: z.string().max(100).optional().nullable(),

    // Supporting content blocks
    performanceFeatures: z.string().optional().nullable(),
    advantages: z.string().optional().nullable(),
    applications: z.string().optional().nullable(),

    isFeaturedOnHome: z.boolean().default(false)
});
