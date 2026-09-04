export type LinkRow = {
	id: number;
	orderId: number;
	customerName: string | null;
	orderStatus: string | null;
	createdAt: string;
	expiresAt: string;
	usedAt: string | null;
	/** Used wins over expired: a paid link is not "expired" even once it lapses. */
	state: 'used' | 'expired' | 'live';
};
