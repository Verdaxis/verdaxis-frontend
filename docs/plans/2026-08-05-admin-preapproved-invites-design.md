# Admin Pre-Approved Invitations

**Date:** 2026-08-05
**Status:** Approved by implementation request

The authoritative security and API contract lives in the backend document of
the same name. This frontend implements two surfaces only:

1. The Admin Dashboard Users tab exposes an `Invite user` dialog for name,
   email, buyer/supplier role, and an existing eligible organization. It shows
   the generated single-use link for copying; it does not send email itself,
   so the administrator must deliver it securely to the intended recipient.
2. `/accept-invite` resolves the token from the URL fragment, shows the prepared
   account details, requires a compliant password and explicit agreement to the
   Terms and Privacy Policy, then signs the recipient in and routes to `/app`.

Expired, already-used, or otherwise invalid links use one recovery state with
Sign In and Forgot Password actions. The page remains usable at compact desktop
heights and does not add a separate onboarding wizard.
