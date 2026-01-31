import { getSetting, setSetting } from '../db/operations';
import { onSyncDataImported } from '$lib/sync/sync';

export type ReviewStep =
	| 'inbox'
	| 'calendar-past'
	| 'calendar-future'
	| 'actions'
	| 'waiting'
	| 'projects'
	| 'someday'
	| 'creative';

export class WeeklyReviewState {
	currentStep = $state<ReviewStep>('inbox');
	completedSteps = $state<Set<ReviewStep>>(new Set());
	isActive = $state(false);
	lastReviewDate = $state<Date | null>(null);

	readonly stepOrder: ReviewStep[] = [
		'inbox', 'calendar-past', 'calendar-future',
		'actions', 'waiting', 'projects', 'someday', 'creative'
	];

	readonly stepLabels: Record<ReviewStep, string> = {
		'inbox': 'Empty Your Inbox',
		'calendar-past': 'Review Past Calendar',
		'calendar-future': 'Review Upcoming Calendar',
		'actions': 'Review Next Actions',
		'waiting': 'Review Waiting For',
		'projects': 'Review Projects',
		'someday': 'Review Someday/Maybe',
		'creative': 'Capture New Ideas'
	};

	readonly stepDescriptions: Record<ReviewStep, string> = {
		'inbox': 'Process every item in your inbox to zero.',
		'calendar-past': 'Review past calendar entries for any follow-up actions.',
		'calendar-future': 'Review upcoming events and prepare any needed actions.',
		'actions': 'Review all next actions. Are they still relevant? Any to add?',
		'waiting': 'Follow up on delegated items. Any responses received?',
		'projects': 'Review each project. Does every active project have a next action?',
		'someday': 'Review someday/maybe items. Anything ready to activate?',
		'creative': 'Capture any new ideas, projects, or actions that came to mind.'
	};

	currentStepIndex = $derived(this.stepOrder.indexOf(this.currentStep));
	progress = $derived((this.completedSteps.size / 8) * 100);
	canGoBack = $derived(this.currentStepIndex > 0);
	canGoNext = $derived(this.currentStepIndex < 7);
	isComplete = $derived(this.completedSteps.size === 8);

	async loadLastReview() {
		const timestamp = await getSetting('lastReviewCompletedAt');
		this.lastReviewDate = timestamp ? new Date(timestamp) : null;
	}

	startReview() {
		this.isActive = true;
		this.currentStep = 'inbox';
		this.completedSteps = new Set();
	}

	completeStep(step: ReviewStep) {
		// Create new Set to trigger reactivity
		const newSet = new Set(this.completedSteps);
		newSet.add(step);
		this.completedSteps = newSet;
	}

	goToStep(step: ReviewStep) {
		this.currentStep = step;
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

	async finishReview() {
		await setSetting('lastReviewCompletedAt', new Date().toISOString());
		await this.loadLastReview();
		this.isActive = false;
		this.completedSteps = new Set();
	}
}

export const weeklyReviewState = new WeeklyReviewState();
onSyncDataImported(() => weeklyReviewState.loadLastReview());
