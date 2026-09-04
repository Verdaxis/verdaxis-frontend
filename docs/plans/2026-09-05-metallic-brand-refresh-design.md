# Metallic Brand Refresh Design

## Goal

Update Verdaxis with the approved metallic symbol and a more accurate public mission statement across the live product, public site, and webdeck.

## Copy

Use this landing-page statement:

> Verdaxis is the neutral exchange where verified low-carbon fuel meets real demand. Trade anonymously until confirmation, with transparent pricing and compliance documentation built into every transaction.

“Until confirmation” matches the platform behavior more closely than “until match.”

## Brand assets

Extract the supplied metallic symbol from its grey background and place it on transparency. Preserve the existing VERDAXIS wordmark. Produce the current symbol-only, horizontal-wordmark, and stacked-wordmark variants at their existing paths and aspect ratios.

Replacing the shared files updates all current consumers without component-specific brand logic. Covered surfaces include the public navigation and footer, platform sidebar, invitation page, mobile notice, browser icon, fallback page, webdeck covers, webdeck persistent marks, and webdeck icon.

## Delivery and verification

Keep the source and generated assets in their existing repositories. Add a small automated check for required image properties and approved copy. Build and test both applications. Deploy the frontend to staging, inspect the public landing page and authenticated platform, and check the webdeck locally. After staging passes, promote the same frontend changes to production and run live smoke checks.
