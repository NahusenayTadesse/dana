/** One row of the promo-codes table, shared by the page and its edit dialog. */
export type PromoRow = {
	id: number;
	code: string;
	discountPercentage: number;
	discountLabel: string;
	reason: string;
	/** `YYYY-MM-DD`, or '' for "no date set" — what the date inputs bind to. */
	startsAt: string;
	expiresAt: string;
	window: string;
	maxUses: number | null;
	timesUsed: number;
	usage: string;
	isActive: boolean;
	status: 'Active' | 'Scheduled' | 'Expired' | 'Used up' | 'Off';
};
