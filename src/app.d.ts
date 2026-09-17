import type { User, Session } from 'better-auth/minimal';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
			/** Dashboard permissions, resolved in hooks for /dashboard requests. */
			access?: import('$lib/server/permissions').ResolvedAccess;
			/** Set by hooks when a dashboard page load isn't permitted. */
			denied?: string;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// papaparse ships no types and has no @types package installed; the CSV export
// in $lib/print.ts only uses unparse(), so an ambient any is enough.
declare module 'papaparse';

export {};
