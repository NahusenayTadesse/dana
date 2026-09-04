/**
 * Turn whatever a person copies out of YouTube into the id the embed needs.
 *
 * The operator pastes a link from the address bar or the Share button, so all
 * of these have to work — and so does a bare id, because somebody will
 * eventually paste one of those too:
 *
 *   https://www.youtube.com/watch?v=Pds8-d8su7s&t=42s
 *   https://youtu.be/Pds8-d8su7s?si=AbCdEf
 *   https://www.youtube.com/embed/Pds8-d8su7s
 *   https://www.youtube.com/shorts/Pds8-d8su7s
 *   https://www.youtube.com/live/Pds8-d8su7s
 *   Pds8-d8su7s
 *
 * Returns null for anything that isn't a video link, so the dashboard can say
 * so at save time rather than shipping a blank player.
 */

/** YouTube ids are exactly 11 characters of URL-safe base64. */
const ID = /^[A-Za-z0-9_-]{11}$/;

const PATH_PREFIXES = ['embed', 'shorts', 'live', 'v'];

const HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];

export function youtubeId(input: string): string | null {
	const value = input.trim();
	if (!value) return null;

	// A bare id, pasted straight in.
	if (ID.test(value)) return value;

	let url: URL;
	try {
		// People paste "youtube.com/watch?v=..." without the scheme just as often.
		url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
	} catch {
		return null;
	}

	if (!HOSTS.includes(url.hostname.toLowerCase())) return null;

	// youtu.be/<id>
	const segments = url.pathname.split('/').filter(Boolean);
	if (url.hostname.toLowerCase().endsWith('youtu.be')) {
		return segments[0] && ID.test(segments[0]) ? segments[0] : null;
	}

	// youtube.com/watch?v=<id>
	const query = url.searchParams.get('v');
	if (query && ID.test(query)) return query;

	// youtube.com/embed|shorts|live|v/<id>
	if (segments.length >= 2 && PATH_PREFIXES.includes(segments[0].toLowerCase())) {
		return ID.test(segments[1]) ? segments[1] : null;
	}

	return null;
}

/** The privacy-preserving embed URL for a pasted link, or '' if it isn't one. */
export function youtubeEmbedUrl(input: string): string {
	const id = youtubeId(input);
	return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : '';
}
