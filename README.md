# Band of Men Barber Salon

The website for Sam’s one-chair barber salon at **200 Leadwell Lane, Robin Hood, Wakefield, WF3 3AE**. A responsive static site with real salon photography, a 37-service price list, a 42-photo gallery, Booksy booking links, opening hours and a contact form.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. The development server serves only the generated `dist/` directory and handles the contact endpoint locally. Run `npm run build` after editing while the server is running, then refresh. No email is sent unless the Resend configuration is present.

## Checks

```sh
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run booksy:compare
```

Browser tests cover responsive layouts, images, keyboard navigation, service tabs, gallery focus and pagination, contact validation and recovery, JavaScript-disabled content, and axe accessibility checks. Email requests are mocked in tests; tests never send mail. Browser screenshots are written to `test-results/`.

## Publishing

- **Netlify:** `npm run build` publishes `dist/`; `netlify/functions/contact.js` is the only deployed function. See [NETLIFY_RUNBOOK.md](NETLIFY_RUNBOOK.md).
- **GitHub Pages:** the workflow builds and tests `dist/` and publishes that directory to `gh-pages`. This is static hosting; the contact form offers an email-app fallback because Netlify Functions do not run on Pages.
- Account functionality was already disabled. Its source is retained in `archive/` and excluded from publishing. Do not deploy those functions without a separate review.
- The legacy service worker is retired. Content-versioned script URLs and a cleanup worker prevent an old cached script from breaking an updated page.

## Editing

- `index.html`: content, prices, business metadata, photographs and links.
- `css/site.css`: the complete responsive design.
- `js/`: progressive enhancements. Content and booking links work without JavaScript.
- `Photos/`: original photos and existing WebP variants.
- `scripts/build.mjs`: an explicit list of public files; no server source or environment files are published.
- `tests/`: backend/build and browser regression checks.

Update visible opening hours and the structured data in `index.html` together with `js/open-status.js`. Always check prices against Booksy before changing them. The site does not hardcode changing review totals.

See [the review report](docs/review/REVIEW.md) for the overhaul’s scope, evidence and remaining hosting checks.
