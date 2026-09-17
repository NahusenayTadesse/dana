// hls.js only maps type declarations onto its full build. The `light` entry is
// the same API minus subtitle/alt-audio/EME support, so it can borrow them.
declare module 'hls.js/light' {
	export * from 'hls.js';
	export { default } from 'hls.js';
}
