# TIKLADOY + BURGERMY Store Release Readiness

Updated: 2026-08-12

## Implemented in repository

- TIKLADOY privacy policy, terms and public account deletion resource.
- TIKLADOY in-app legal links and authenticated account deletion hook.
- Supabase `delete-account` Edge Function source.
- BURGERMY privacy policy, terms and account deletion page.
- BURGERMY authenticated account deletion API route.
- BURGERMY production app metadata cleanup.
- TIKLADOY Capacitor mobile scaffold with bundle ID `tr.tikladoy.app`.
- Payment architecture prepared for PayTR without storing card data in app database.

## Required before submission

### Shared
- Deploy Supabase `delete-account` Edge Function and apply any pending database migrations.
- Configure production PayTR secrets and complete live payment test.
- Complete SMS OTP provider activation and production OTP test.
- Confirm support email/domain mailbox works.
- Complete end-to-end tests: register/login, address, cart, options, payment success/failure, order creation, logout, account deletion.
- Create final app icons, splash screens, store screenshots and feature graphics.
- Prepare privacy/data declarations based on actual SDKs and collected fields.

### Google Play
- Android App Bundle (.aab) signed with Play App Signing.
- Target Android 16 / API 36 for submissions on or after 2026-08-31.
- Complete Data safety form and account deletion URL.
- Complete content rating, ads declaration, target audience and app access/reviewer credentials.

### Apple App Store
- Apple Developer organization membership and App Store Connect app records.
- iOS signed archive and distribution profile.
- App Privacy answers and privacy policy URL.
- Review Notes with working test account when login is required.
- Ensure native shell delivers app-like utility beyond a repackaged website (native notifications/deep links/location/share as applicable).

## External credentials / approvals still required

- Apple Developer / App Store Connect signing access.
- Google Play Console signing and release access.
- PayTR Merchant ID / Key / Salt after approval.
- Supabase deployment access for Edge Functions/secrets.
- Approved SMS provider credentials/sender title.

These secrets must never be committed to GitHub.
