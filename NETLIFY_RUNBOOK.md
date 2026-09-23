# Netlify operations

## Build

Use Node.js 22+, `npm ci`, then `npm run build`. Publish **dist/** with functions from **netlify/functions/**. Both settings are committed in `netlify.toml`. Never publish the repository root or deploy files from `archive/`.

The account UI was already disabled; the archived authentication and database maintenance functions are intentionally no longer deployed. No database migration is required for this redesign.

## Contact form

The browser posts JSON to `/.netlify/functions/contact`. The only required secret is `RESEND_API_KEY`. The sender domain must be verified in Resend.

Optional environment variables:

- `RESEND_FROM`: defaults to `Band of Men <send@bandofmen.uk>`.
- `CONTACT_TO`: defaults to `info@bandofmen.co.uk`.

The handler sends a single plain-text email to the salon and sets the visitor’s address as Reply-To. It does not send an automatic confirmation email to an unverified address. There are no runtime npm dependencies.

The endpoint validates input, bounds the request size, and uses Netlify’s per-IP/domain limit of five requests per minute. Check the deploy’s post-processing log to confirm the rate-limit rule was accepted. Reference: [Netlify function rate limits](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).

Missing configuration returns a generic 503. Provider problems return 502. The browser preserves all entered text and offers an explicit email-app fallback for unavailable hosting, server errors and timeouts. It reports successful sending only after a provider receipt. This confirms acceptance by the provider, not arrival in the recipient’s inbox.

## Verify a deployment

1. Confirm the build command and publish directory, and that only `contact` is listed as a function.
2. Open the site on desktop and mobile. Check the service tabs, gallery, mobile menu and booking links.
3. Check a returning browser session: `sw.js` removes old `bom-static-*` caches and unregisters itself. New scripts have content-versioned URLs.
4. Verify the configured sender and recipient. A real email delivery check needs an authorized test message and the salon’s inbox confirmation; the automated suite mocks email delivery.
5. Confirm the code-based rate limit in the deployment log. It is enforced by Netlify, not the local development server.
6. Confirm legacy `/account` URLs redirect and unknown pages return the custom 404.

GitHub Pages cannot run the contact function. An explicit email fallback is expected on a Pages preview. Deploy previews do not verify production secrets, DNS or inbox delivery.

## Rollback

Revert the overhaul commit or restore a known deployment through Netlify. Do not enable the archived account functions as part of a rollback without reviewing their authorization first.
