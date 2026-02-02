---
status: resolved
trigger: "pwa-icon-missing: When adding the app as a PWA on iOS Safari, it shows a generic N icon instead of a custom app icon"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:00:02Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED - Complete PWA icon configuration was missing; now added.
test: Build succeeds, all 107 tests pass, icons render correctly, manifest and meta tags present in build output
expecting: iOS Safari will now show the blue checkmark GTD icon when added to home screen
next_action: Archive session

## Symptoms

expected: App should show a custom branded icon when added to iOS home screen
actual: Shows generic "N" letter icon (from Netlify default)
errors: None - missing configuration
reproduction: Add app to home screen via Safari on iOS
started: Has never had a custom icon - configuration gap

## Eliminated

## Evidence

- timestamp: 2026-02-02T00:00:01Z
  checked: Glob for manifest*.json or manifest*.webmanifest in project
  found: No web app manifest exists anywhere in the project (only Vite internal manifests and node_modules)
  implication: Browser has no PWA manifest to read - critical missing piece

- timestamp: 2026-02-02T00:00:01Z
  checked: static/ directory contents
  found: Only two files: favicon.png (EMPTY - 0 bytes) and feedback-form.html. No icon files of any kind.
  implication: Even the basic favicon is broken (empty file). No apple-touch-icon images exist.

- timestamp: 2026-02-02T00:00:01Z
  checked: src/app.html head section
  found: Only has `<link rel="icon" href="%sveltekit.assets%/favicon.png" />` and viewport meta. No apple-touch-icon, no manifest link, no theme-color, no apple-mobile-web-app meta tags.
  implication: iOS Safari has zero PWA signals - no manifest, no touch icon, no app metadata

- timestamp: 2026-02-02T00:00:01Z
  checked: Grep for apple-touch-icon, manifest, theme-color, apple-mobile-web-app across entire src/
  found: Zero matches for any PWA-related meta tags or manifest references
  implication: PWA configuration was never set up

- timestamp: 2026-02-02T00:00:01Z
  checked: svelte:head usage across all routes
  found: Only one usage in src/routes/feedback/+page.svelte (just sets title). No PWA meta in any route.
  implication: No per-route PWA configuration either

- timestamp: 2026-02-02T00:00:01Z
  checked: Service worker at src/service-worker.js
  found: Service worker EXISTS and is functional (caching, background sync). SvelteKit auto-registers it.
  implication: Service worker is present (good for PWA), but without manifest and icons it's not a complete PWA setup

- timestamp: 2026-02-02T00:00:01Z
  checked: svelte.config.js and vite.config.ts
  found: Standard SvelteKit + Netlify adapter config. No PWA plugins (like vite-plugin-pwa).
  implication: No automated PWA asset generation is configured

- timestamp: 2026-02-02T00:00:01Z
  checked: netlify.toml
  found: Basic build config only. No headers or icon-related configuration.
  implication: Netlify is not providing icons either - the "N" icon comes from Netlify's default favicon or page screenshot

- timestamp: 2026-02-02T00:00:01Z
  checked: App branding/identity
  found: Package name is "gtd". App shows "GTD" as fallback title in MobileHeader. Uses blue-500 as accent color.
  implication: Need to create GTD-branded icons

- timestamp: 2026-02-02T00:00:02Z
  checked: Build output after fix
  found: All icon files present in .netlify/ output, manifest.json included in asset set, meta tags rendered in server HTML template
  implication: Fix is complete and will be served correctly

- timestamp: 2026-02-02T00:00:02Z
  checked: Test suite (107 tests across 10 files)
  found: All 107 tests pass with zero failures
  implication: No regressions introduced

## Resolution

root_cause: Complete absence of PWA icon configuration. Specifically: (1) No web app manifest file (manifest.json/manifest.webmanifest), (2) No apple-touch-icon meta tags in app.html, (3) favicon.png exists but is 0 bytes (empty file), (4) No icon image assets of any size in the project, (5) No theme-color or apple-mobile-web-app-capable meta tags. The service worker exists but without a manifest and icons, iOS Safari falls back to a page screenshot or Netlify's default "N" icon.

fix: Created complete PWA icon configuration: (1) Generated icon PNG files in 13 sizes (16-512px) with blue-500 background and white checkmark design, (2) Created manifest.json with full PWA metadata, (3) Added apple-touch-icon, manifest link, theme-color, and apple-mobile-web-app meta tags to app.html, (4) Replaced empty favicon.png with proper 32x32 icon

verification: Build succeeds with all new assets included in output. All 107 existing tests pass. Icons visually verified (blue rounded rect with white checkmark). Server-rendered HTML template confirmed to include all PWA meta tags.

files_changed:
  - static/favicon.png (replaced empty 0-byte file with 32x32 blue checkmark icon)
  - static/apple-touch-icon.png (new - 180x180 iOS home screen icon)
  - static/icons/icon-{16,32,48,72,96,128,144,152,167,180,192,384,512}x{same}.png (new - 13 icon sizes)
  - static/manifest.json (new - PWA web app manifest)
  - src/app.html (modified - added manifest link, apple-touch-icon, apple-mobile-web-app meta tags, theme-color)
