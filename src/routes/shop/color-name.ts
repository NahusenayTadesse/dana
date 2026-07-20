export const NAMED_COLORS: Record<string, string> = {
    '#f8f9fa': 'White',
    '#e9ecef': 'Off White',
    '#adb5bd': 'Silver',
    '#6c757d': 'Grey',
    '#343a40': 'Charcoal',
    '#212529': 'Black',
    '#c0392b': 'Red',
    '#e67e22': 'Orange',
    '#f1c40f': 'Yellow',
    '#2ecc71': 'Green',
    '#16a085': 'Teal',
    '#3498db': 'Blue',
    '#2c3e50': 'Navy',
    '#9b59b6': 'Purple',
    '#7f8c8d': 'Slate',
    '#8b4513': 'Brown',
    '#b87333': 'Copper',
    '#cd7f32': 'Bronze'
    // extend this table with your actual catalog swatches for exact matches
};

function hexToRgb(hex: string): [number, number, number] | null {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
        ? clean.split('').map((c) => c + c).join('')
        : clean;
    if (full.length !== 6) return null;
    const num = parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function colorDistance(a: [number, number, number], b: [number, number, number]) {
    return Math.sqrt(
        (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    );
}

/** Returns a friendly name for a hex color, or the original string if it's already a name / unparsable. */
export function getColorName(colorStr: string): string {
    if (!colorStr) return '';
    if (!colorStr.startsWith('#')) return colorStr; // already a name like "Ivory"

    const rgb = hexToRgb(colorStr);
    if (!rgb) return colorStr;

    let closestName = colorStr;
    let closestDist = Infinity;

    for (const [hex, name] of Object.entries(NAMED_COLORS)) {
        const candidateRgb = hexToRgb(hex);
        if (!candidateRgb) continue;
        const dist = colorDistance(rgb, candidateRgb);
        if (dist < closestDist) {
            closestDist = dist;
            closestName = name;
        }
    }

    return closestName;
}