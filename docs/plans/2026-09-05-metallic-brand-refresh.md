# Metallic Brand Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the approved metallic Verdaxis symbol and mission statement to the public site, platform, and webdeck.

**Architecture:** Reuse the existing shared image paths so all current consumers update without component edits. Generate transparent symbol-only and wordmark variants from the approved source, then verify assets and copy before staged deployment.

**Tech Stack:** PNG assets, React 19, Vite 6, Next.js, Vitest, shell image metadata checks

---

### Task 1: Create the canonical metallic assets

**Files:**
- Modify: `public/verdaxis-logo-no-words.png`
- Modify: `public/verdaxis-logo-words-right.png`
- Modify: `public/verdaxis-logo-words-bottom.png`

1. Create a transparent extraction of the uploaded metallic symbol.
2. Combine it with the existing wordmark for horizontal and stacked variants.
3. Verify that all three files are RGBA PNG files with useful transparent margins.
4. Check each asset on light and dark backgrounds.

### Task 2: Update and test the landing statement

**Files:**
- Modify: `src/locales/en/public.json:1192`
- Test: `src/pages/public/__tests__/PilotPage.test.tsx` or the closest landing-page copy test

1. Add an assertion for the approved mission statement.
2. Run the focused test and confirm that it fails.
3. Replace the old subtitle with the approved text.
4. Run the focused test and translation parity check.

### Task 3: Verify and deploy staging

1. Run the frontend tests, typecheck, translation check, and staging build.
2. Deploy the built output to staging with the project deploy script.
3. Dogfood the public landing page and authenticated platform at desktop and mobile widths.
4. Confirm the logo has no grey rectangle, the wordmark is legible, and the approved copy is present.
5. Commit and push the staging frontend changes.

### Task 4: Update and verify the webdeck

**Files:**
- Modify: `/home/jons-openclaw/verdaxis-webdeck/public/images/logos/verdaxis-icon.png`
- Modify: `/home/jons-openclaw/verdaxis-webdeck/public/images/logos/verdaxis-logo-words-right.png`
- Modify: `/home/jons-openclaw/verdaxis-webdeck/public/images/logos/verdaxis-logo-words-bottom.png`
- Modify: `/home/jons-openclaw/verdaxis-webdeck/app/icon.png`

1. Reuse the verified frontend exports.
2. Run the webdeck tests, lint, and production build.
3. Inspect cover, persistent logo, mobile gate, and browser icon.
4. Commit and push the webdeck changes.

### Task 5: Promote the frontend to production

1. Apply the verified frontend commit to the production worktree.
2. Run the production checks and build.
3. Deploy with the documented production deploy process.
4. Run live smoke checks and inspect the public and authenticated logo surfaces.
5. Confirm both worktrees are clean and record deployed commit identifiers.
