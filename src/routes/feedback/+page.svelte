<svelte:head>
	<title>Feedback - GTD Planner</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-6">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Feedback</h1>

	<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
		This page enables Netlify Forms detection. Most users access feedback via the in-app modal.
	</p>

	<form
		method="POST"
		name="feedback"
		data-netlify="true"
		netlify-honeypot="bot-field"
		class="space-y-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6"
	>
		<!-- Hidden field for Netlify -->
		<input type="hidden" name="form-name" value="feedback" />

		<!-- Honeypot field (hidden with CSS class, not display:none) -->
		<div class="absolute left-[-9999px] w-[1px] h-[1px] overflow-hidden">
			<label for="bot-field">
				Don't fill this out if you're human:
				<input name="bot-field" id="bot-field" type="text" tabindex="-1" />
			</label>
		</div>

		<!-- Type selector -->
		<div>
			<label for="type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				What type of feedback?
			</label>
			<select
				name="type"
				id="type"
				required
				class="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 transition-all duration-150"
			>
				<option value="bug">Bug Report</option>
				<option value="feature">Feature Request</option>
			</select>
		</div>

		<!-- Description -->
		<div>
			<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				Description
			</label>
			<textarea
				name="description"
				id="description"
				required
				minlength="10"
				rows="5"
				placeholder="Tell us what happened or what you'd like to see..."
				class="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 transition-all duration-150 resize-none"
			></textarea>
		</div>

		<!-- Email (optional) -->
		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				Email <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">(optional - only if you'd like us to follow up)</span>
			</label>
			<input
				type="email"
				name="email"
				id="email"
				class="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 transition-all duration-150"
			/>
		</div>

		<!-- Hidden screenshot field -->
		<input type="hidden" name="screenshot" id="screenshot" />

		<!-- Submit button -->
		<button
			type="submit"
			class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
		>
			Send Feedback
		</button>
	</form>
</div>
