/** One row of the FAQ table. A negative id is a bundled question not yet stored. */
export type FaqTableRow = {
	id: number;
	sortOrder: number;
	icon: string;
	questionEn: string;
	questionAm: string | null;
	answerEn: string;
	answerAm: string | null;
	isActive: boolean;
};
