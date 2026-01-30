import { getSetting, setSetting } from '../db/operations';
import { db } from '../db/schema';

export type OnboardingStep = 'welcome' | 'capture' | 'process' | 'organize' | 'review-intro';

export class OnboardingState {
	currentStep = $state<OnboardingStep>('welcome');
	completedSteps = $state<Set<OnboardingStep>>(new Set());
	isActive = $state(false);
	hasSkipped = $state(false);
	hasCompleted = $state(false);

	readonly stepOrder: OnboardingStep[] = [
		'welcome',
		'capture',
		'process',
		'organize',
		'review-intro'
	];

	readonly stepLabels: Record<OnboardingStep, string> = {
		'welcome': 'Welcome to GTD',
		'capture': 'Capture',
		'process': 'Process',
		'organize': 'Organize',
		'review-intro': 'Review'
	};

	readonly stepDescriptions: Record<OnboardingStep, string> = {
		'welcome': 'Get started with Getting Things Done',
		'capture': 'Capture everything that has your attention',
		'process': 'Clarify what each item means and what to do about it',
		'organize': 'Put it where it belongs',
		'review-intro': 'Review your system regularly to stay on top of everything'
	};

	currentStepIndex = $derived(this.stepOrder.indexOf(this.currentStep));
	progress = $derived((this.completedSteps.size / 5) * 100);
	canGoBack = $derived(this.currentStepIndex > 0);
	canGoNext = $derived(this.currentStepIndex < 4);
	isComplete = $derived(this.completedSteps.size === 5);

	async loadState() {
		const [completed, skipped, step] = await Promise.all([
			getSetting('onboardingCompleted'),
			getSetting('onboardingSkipped'),
			getSetting('onboardingStep')
		]);

		this.hasCompleted = !!completed;
		this.hasSkipped = !!skipped;

		if (step && this.stepOrder.includes(step as OnboardingStep)) {
			this.currentStep = step as OnboardingStep;
		}

		// Safari eviction fallback: if no flags but db has items, treat as completed
		if (!completed && !skipped) {
			const itemCount = await db.items.count();
			if (itemCount > 0) {
				this.hasCompleted = true;
			}
		}
	}

	startOnboarding() {
		this.isActive = true;
		this.currentStep = 'welcome';
		this.completedSteps = new Set();
	}

	async completeStep(step: OnboardingStep) {
		// Create new Set to trigger reactivity
		const newSet = new Set(this.completedSteps);
		newSet.add(step);
		this.completedSteps = newSet;

		// Persist current step
		await setSetting('onboardingStep', this.currentStep);
	}

	next() {
		if (this.canGoNext) {
			this.currentStep = this.stepOrder[this.currentStepIndex + 1];
		}
	}

	back() {
		if (this.canGoBack) {
			this.currentStep = this.stepOrder[this.currentStepIndex - 1];
		}
	}

	async skipOnboarding() {
		await setSetting('onboardingSkipped', true);
		this.hasSkipped = true;
		this.isActive = false;
	}

	async finishOnboarding() {
		await setSetting('onboardingCompleted', new Date().toISOString());
		this.hasCompleted = true;
		this.isActive = false;
	}

	async shouldShowOnboarding(): Promise<boolean> {
		await this.loadState();

		if (this.hasCompleted || this.hasSkipped) {
			return false;
		}

		// Safari fallback: if db has items, don't show onboarding
		const itemCount = await db.items.count();
		return itemCount === 0;
	}

	async resetOnboarding() {
		// Clear all onboarding settings
		await Promise.all([
			setSetting('onboardingCompleted', null),
			setSetting('onboardingSkipped', null),
			setSetting('onboardingStep', null)
		]);

		// Clear all feature visited flags
		const allSettings = await db.settings.toArray();
		const featureKeys = allSettings.filter(s => s.key.startsWith('feature_visited_'));
		await Promise.all(
			featureKeys.map(setting => db.settings.delete(setting.id))
		);

		// Reset local state
		this.hasCompleted = false;
		this.hasSkipped = false;
		this.currentStep = 'welcome';
		this.completedSteps = new Set();
		this.isActive = false;
	}
}

export const onboardingState = new OnboardingState();
