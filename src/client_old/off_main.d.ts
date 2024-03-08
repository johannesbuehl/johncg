export {};

declare global {
	interface Window {
		update: (data: string) => void;
		jump: (data: string) => void;
		play: () => void;
	}
}
