# Public content and mobile speed implementation plan

**Goal:** Correct existing public statements, document the public calculator and producer index, and reduce measured mobile delays.

**Architecture:** Retain React/Vite static public rendering and existing route/metadata contracts. Use small typed source lists, the existing EN/ZH namespaces, a shared-energy calculator model, and narrow performance changes justified by before/after evidence.

**Stack:** React 19, TypeScript, Vite, i18next, existing Vitest and isolated Chromium tools.

## Workflow

1. Trace education claims to current supplier-declaration and trading implementations. Check six articles against primary references. Correct EN/ZH content in `src/locales/*/education.json`, add source data in `src/data/educationArticles.ts`, and show maintainer/source-check details in `EducationArticlePage.tsx`. Do not invent individual reviewer credentials or publication dates.
2. Replace unsupported FuelEU compliance, penalties, and CII proxy in `calculatorDefaults.ts` and `EnergyCalculatorPage.tsx`. Give both fuels the same energy demand; retain fuel mass, fuel cost, direct CO2 estimates, energy-unit prices, and a clearly limited ETS scenario. Show units, assumptions, excluded inputs and official references. Adapt the existing calculator tests to actual model behavior.
3. Document `producerProjects.ts` as a compiled index with unknown record observation dates and approximate city coordinates. Use neutral categories for non-renewable pathways. In `ProducerMapPage.tsx`, distinguish announced project data from executable supply, and show known import history and verification limits.
4. Review remaining current-capability claims in existing public copy. Apply narrow EN/ZH corrections after the tool-copy changes, preserving unrelated copy and privacy controls.
5. Reuse the accepted production landing artifact for a bounded cold-mobile baseline. Use the same browser, viewport, throttling and sample aggregation for comparison. Capture public field-data availability separately. Change only demonstrated causes; avoid a new measurement service or test framework.
6. Freeze the combined source for independent accuracy and simplicity review. Run the existing relevant tests, typecheck, translation checks, release/artifact guards and both target builds. Use representative browser checks with and without JavaScript.
7. Submit through protected current-base CI and publish one immutable production artifact through the existing canary/promotion workflow, without release messages. Check exact live content, metadata, tool interactions, login and backend readiness, then record source and runtime identities.

## Boundaries and completion

No Search Console setup, unknown-route change, new company page, backend/database work, consent changes, staging publication or external outreach. Stop after the reviewed release and exact live acceptance. Synthetic observations are not field Core Web Vitals, and this work does not establish a ranking or traffic gain.
