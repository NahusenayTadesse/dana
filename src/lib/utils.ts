import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/**
 * Turn a stored image value into a usable `src`.
 *
 * Uploads are stored as bare file names and served by /files/[name]; a value
 * that already starts with "/" is a bundled static asset and is used as-is.
 * Both are URI-encoded, because a few bundled file names contain spaces.
 */
export function assetUrl(stored: string | null | undefined): string {
	const value = (stored ?? '').trim();
	if (!value) return '';
	if (/^(https?:)?\/\//.test(value)) return value;
	return encodeURI(value.startsWith('/') ? value : `/files/${value}`);
}
