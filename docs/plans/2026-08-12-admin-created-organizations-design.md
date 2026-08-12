# Admin-Created Organizations in Invitations

**Date:** 2026-08-12
**Status:** Approved by implementation request

The backend document of the same name is the authoritative security and data
contract. The Admin Users invitation dialog adds an explicit choice between an
existing approved organization and a new onboarding-approved organization.

Existing mode retains the current role-filtered organization selector. New
mode captures organization name, a role-compatible organization type, country,
and optional tax ID. Changing role or mode clears incompatible organization
state. The submit command remains disabled until the selected mode is complete.

Both modes produce the existing success state and single-use acceptance link;
the recipient acceptance page is unchanged. All new labels and errors are
available in English and Simplified Chinese. New organizations retain unknown
market provenance until the separate trusted market-approval process promotes
them for real trading.
