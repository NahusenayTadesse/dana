/**
 * The FAQ the About page ships with.
 *
 * Same rule as $lib/siteSettings and $lib/siteImages: the code declares the
 * original list, and rows in `faq_items` replace it wholesale. An empty table
 * is the site exactly as before, and "restore originals" is a DELETE.
 *
 * Replaces the fixed nine-entry array that used to sit in faq.svelte, where
 * adding a tenth question meant two new translation keys and a deploy.
 */

export type FaqEntry = {
	/** Stable key for the accordion; also the icon lookup for the defaults. */
	icon: FaqIconName;
	questionEn: string;
	questionAm: string;
	answerEn: string;
	answerAm: string;
};

/**
 * The icons an operator can pick from. A fixed set rather than free text:
 * the component has to resolve the name to a real component, and an unknown
 * name would render nothing at all.
 */
export const FAQ_ICONS = [
	'shield',
	'package',
	'ruler',
	'wrench',
	'layers',
	'coins',
	'truck',
	'file',
	'factory',
	'help'
] as const;

export type FaqIconName = (typeof FAQ_ICONS)[number];

export const FAQ_ICON_LABELS: Record<FaqIconName, string> = {
	shield: 'Shield — quality, guarantees',
	package: 'Box — products, packaging',
	ruler: 'Ruler — sizes, custom lengths',
	wrench: 'Spanner — fittings, accessories',
	layers: 'Layers — coatings, coils',
	coins: 'Coins — pricing, payment',
	truck: 'Lorry — delivery, distribution',
	file: 'Document — specs, paperwork',
	factory: 'Factory — production, capacity',
	help: 'Question mark — anything else'
};

export const DEFAULT_FAQ: FaqEntry[] = [
	{
		icon: 'shield',
		questionEn: 'What makes DANA STEEL products reliable?',
		questionAm: 'የዳና ስቲል ምርቶችን አስተማማኝ የሚያደርጋቸው ምንድን ነው?',
		answerEn:
			'Every batch is processed under strict quality control — coating weight, gauge accuracy and profile geometry are checked against spec before the product leaves our factory in Adama.',
		answerAm:
			'እያንዳንዱ ምርት በጥብቅ የጥራት ቁጥጥር ውስጥ ያልፋል — የሽፋን ክብደት፣ የውፍረት ትክክለኛነትና የቅርጽ ልኬት ምርቱ ከአዳማ ፋብሪካችን ከመውጣቱ በፊት ይመረመራል።'
	},
	{
		icon: 'package',
		questionEn: 'What steel profiles do you offer?',
		questionAm: 'ምን ዓይነት የብረት ቅርጾችን ታቀርባላችሁ?',
		answerEn:
			'We specialize in Pre-Painted Galvanized Iron (PPGI), Galvanized Iron (GI), beautifully profiled roof tiles, and essential steel building accessories.',
		answerAm:
			'በቅድሚያ የተቀቡ የተለበጡ ብረቶች (PPGI)፣ የተለበጡ ብረቶች (GI)፣ ውብ የጣሪያ ታይሎችና አስፈላጊ የግንባታ ተቀጥላዎች ላይ እንሠራለን።'
	},
	{
		icon: 'ruler',
		questionEn: 'Do you offer custom profiling and lengths?',
		questionAm: 'በተለየ ልኬትና ርዝመት ማምረት ትችላላችሁ?',
		answerEn:
			'Yes. Dana Steel provides flexible cut-to-length options on profiled sheets to match the precise requirements of your industrial or residential projects.',
		answerAm:
			'አዎ። ዳና ስቲል ለኢንዱስትሪም ሆነ ለመኖሪያ ፕሮጀክቶችዎ ትክክለኛ ፍላጎት የሚስማማ ተለዋዋጭ የመቁረጥ አገልግሎት ይሰጣል።'
	},
	{
		icon: 'wrench',
		questionEn: 'What structural steel accessories are available?',
		questionAm: 'ምን ዓይነት የብረት ተቀጥላዎች ይገኛሉ?',
		answerEn:
			'We offer essential matching roofing accessories including standard ridges, gutters, valleys, and specialized industrial fasteners.',
		answerAm:
			'መደበኛ ማገሮች፣ የውኃ መውረጃዎች፣ የጣሪያ መገጣጠሚያዎችና ልዩ የኢንዱስትሪ ማያያዣዎችን ጨምሮ አስፈላጊ ተጓዳኝ ተቀጥላዎችን እናቀርባለን።'
	},
	{
		icon: 'factory',
		questionEn: 'Can you handle bulk or distributor wholesale orders?',
		questionAm: 'የጅምላ ወይም የአከፋፋይ ትዕዛዞችን ማስተናገድ ትችላላችሁ?',
		answerEn:
			'Yes. Our factory in Adama is set up to handle wholesale allocations for developers, trading houses and nationwide distributors.',
		answerAm:
			'አዎ። በአዳማ ያለው ፋብሪካችን ለአልሚዎች፣ ለንግድ ድርጅቶችና በመላ አገሪቱ ላሉ አከፋፋዮች የጅምላ አቅርቦትን ለማስተናገድ የተደራጀ ነው።'
	},
	{
		icon: 'coins',
		questionEn: 'Are your factory prices competitive?',
		questionAm: 'የፋብሪካችሁ ዋጋ ተወዳዳሪ ነው?',
		answerEn:
			'Yes. Dana Steel focuses on providing high-grade commercial and industrial steel sheets at highly competitive market rates directly from our factory floor.',
		answerAm:
			'አዎ። ዳና ስቲል ከፋብሪካው በቀጥታ ከፍተኛ ጥራት ያለው የንግድና የኢንዱስትሪ ብረት በተወዳዳሪ የገበያ ዋጋ ለማቅረብ ያተኩራል።'
	},
	{
		icon: 'truck',
		questionEn: 'Are Dana Steel products distributed nationwide?',
		questionAm: 'የዳና ስቲል ምርቶች በመላ አገሪቱ ይሰራጫሉ?',
		answerEn:
			'We supply and deliver our coated steel products to builders, contractors, wholesalers and developers across all regions of Ethiopia from our factory in Adama.',
		answerAm:
			'ከአዳማ ፋብሪካችን ተነስተን በኢትዮጵያ በሁሉም ክልሎች ላሉ ግንበኞች፣ ተቋራጮች፣ ጅምላ ነጋዴዎችና አልሚዎች የተለበጡ የብረት ምርቶቻችንን እናቀርባለን።'
	},
	{
		icon: 'file',
		questionEn: 'Do you provide product technical sheets and documentation?',
		questionAm: 'የምርት ቴክኒካዊ ሰነዶችን ታቀርባላችሁ?',
		answerEn:
			'Yes. We offer thickness confirmations and detailed technical documentation to support engineering inspections.',
		answerAm:
			'አዎ። ለምህንድስና ምርመራ የሚያግዙ የውፍረት ማረጋገጫዎችንና ዝርዝር ቴክኒካዊ ሰነዶችን እናቀርባለን።'
	},
	{
		icon: 'help',
		questionEn: 'How do I reach your sales team?',
		questionAm: 'የሽያጭ ቡድናችሁን እንዴት ማግኘት እችላለሁ?',
		answerEn:
			'Call or message our sales desk, or send a quote request through the website and we will come back with pricing, technical details and a delivery schedule.',
		answerAm:
			'የሽያጭ ክፍላችንን ይደውሉ ወይም መልእክት ይላኩ፤ ወይም በድረ-ገጹ የዋጋ ጥያቄ ይላኩ፤ ዋጋ፣ ቴክኒካዊ ዝርዝርና የማድረሻ ጊዜ ሰሌዳ ይዘን እንመለሳለን።'
	}
];

export type FaqRow = {
	id: number;
	sortOrder: number;
	icon: string;
	questionEn: string;
	questionAm: string | null;
	answerEn: string;
	answerAm: string | null;
	isActive: boolean;
};

/** What the About page renders: stored rows if there are any, else the defaults. */
export function resolveFaq(rows: FaqRow[]): FaqEntry[] {
	if (!rows.length) return DEFAULT_FAQ;

	return rows
		.filter((row) => row.isActive)
		.map((row) => ({
			icon: (FAQ_ICONS as readonly string[]).includes(row.icon)
				? (row.icon as FaqIconName)
				: 'help',
			questionEn: row.questionEn,
			questionAm: row.questionAm || row.questionEn,
			answerEn: row.answerEn,
			answerAm: row.answerAm || row.answerEn
		}));
}

/** The half of an entry matching the visitor's language, falling back to English. */
export function faqText(entry: FaqEntry, locale: string) {
	return locale === 'am'
		? { question: entry.questionAm, answer: entry.answerAm }
		: { question: entry.questionEn, answer: entry.answerEn };
}
