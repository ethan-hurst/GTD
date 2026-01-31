// Mobile detection state management
class MobileState {
	// Matches when viewport is below tablet breakpoint (768px)
	isMobile = $state(false);
	// Matches when viewport is below desktop breakpoint (1024px)
	isTablet = $state(false);
	// True only on tablet-sized screens (768px-1023px)
	isTabletOnly = $derived(this.isTablet && !this.isMobile);

	private cleanups: (() => void)[] = [];

	init() {
		if (typeof window === 'undefined') return;

		// Mobile: below 768px
		const mobileQuery = window.matchMedia('(max-width: 767px)');
		this.isMobile = mobileQuery.matches;
		const mobileHandler = (e: MediaQueryListEvent) => { this.isMobile = e.matches; };
		mobileQuery.addEventListener('change', mobileHandler);
		this.cleanups.push(() => mobileQuery.removeEventListener('change', mobileHandler));

		// Tablet: below 1024px (includes mobile)
		const tabletQuery = window.matchMedia('(max-width: 1023px)');
		this.isTablet = tabletQuery.matches;
		const tabletHandler = (e: MediaQueryListEvent) => { this.isTablet = e.matches; };
		tabletQuery.addEventListener('change', tabletHandler);
		this.cleanups.push(() => tabletQuery.removeEventListener('change', tabletHandler));
	}

	destroy() {
		this.cleanups.forEach(fn => fn());
		this.cleanups = [];
	}
}

export const mobileState = new MobileState();
