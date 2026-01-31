// Sidebar collapse state management
class SidebarState {
	isCollapsed = $state(false);

	constructor() {
		// Will be initialized from localStorage in init()
	}

	init() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('sidebar-collapsed');
			if (stored !== null) {
				this.isCollapsed = stored === 'true';
			}
		}
	}

	toggle() {
		this.isCollapsed = !this.isCollapsed;
		if (typeof window !== 'undefined') {
			localStorage.setItem('sidebar-collapsed', String(this.isCollapsed));
		}
	}

	collapse() {
		this.isCollapsed = true;
		if (typeof window !== 'undefined') {
			localStorage.setItem('sidebar-collapsed', 'true');
		}
	}

	expand() {
		this.isCollapsed = false;
		if (typeof window !== 'undefined') {
			localStorage.setItem('sidebar-collapsed', 'false');
		}
	}
}

export const sidebarState = new SidebarState();
