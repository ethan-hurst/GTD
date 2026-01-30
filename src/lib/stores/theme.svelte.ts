export class ThemeStore {
	current = $state<'light' | 'dark' | 'system'>('system');

	constructor() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('theme');
			this.current = (stored as any) || 'system';
			this.apply();
		}
	}

	apply() {
		if (typeof window === 'undefined') return;

		const isDark = this.current === 'dark' ||
			(this.current === 'system' &&
			 window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.classList.toggle('dark', isDark);
	}

	set(theme: 'light' | 'dark' | 'system') {
		this.current = theme;
		if (theme === 'system') {
			localStorage.removeItem('theme');
		} else {
			localStorage.setItem('theme', theme);
		}
		this.apply();
	}

	listen() {
		if (typeof window === 'undefined') return () => {};

		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => this.apply();
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	}
}

export const theme = new ThemeStore();
