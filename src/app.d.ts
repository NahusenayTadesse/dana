import type { User, Session } from 'better-auth/minimal';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
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
