# Website review and overhaul — 23 September 2026

## Design

Rebuilt the site around the actual one-chair salon: forest green and brass drawn from the interior, a prominent serif wordmark, a parchment service menu and real salon photography. Each section has its own layout, with deliberate typography and spacing at phone, tablet and desktop sizes. Booking remains accessible on mobile.

The refinement removes the duplicate exterior photo, repeated service strip, extra booking banner and overlapping FAQ content. Sam’s introduction and the existing customer reviews share one section. Visiting details appear together, with a native expandable enquiry panel below them. Prices appear once in the service menu, and all original service details remain available.

The existing 37 services, their prices and durations, all 42 gallery photographs, business address and booking destination are preserved. The online Booksy comparison returned **37/37 services with no differences**. Static review totals were removed because they had become outdated; the existing individual testimonials and their Booksy attribution remain.

[Desktop preview](desktop.png) · [Mobile preview](mobile.png)

## Findings and fixes

| Finding | Resolution |
| --- | --- |
| Loading overlay hides the entire site and depends on JavaScript | Removed it; HTML renders immediately and remains usable with JavaScript disabled |
| Generic copy, layered effects and inconsistent visual hierarchy | Rebuilt layout, typography, colours, service menu, gallery, reviews, contact area and footer |
| Desktop service panels reserve unnecessary height; keyboard tab behavior is incomplete | Natural-height service groups and accessible tabs with arrow, Home and End controls |
| Mobile menu state and focus need clearer handling | Inline disclosure with Escape, focus restoration, resize cleanup and native anchor navigation |
| Custom gallery modal and pagination need keyboard improvements | Native modal dialog with contained keyboard focus, arrows, Escape, touch swipes and focus return; six-photo pagination |
| Failed form submissions can open an email application automatically and discard clarity about delivery | Explicit fallback link; preserve input; validated success receipt; timeout, busy state and useful errors |
| Contact fields and payloads lack upper limits | Validate types, field lengths, email and phone; limit streamed request size; apply Netlify rate limiting |
| Confirmation emails send submitted content to an unverified visitor address | Send one plain-text email to the configured salon address with visitor Reply-To |
| Disabled account UI leaves old authentication and database maintenance functions deployable | Archive them outside the function and public directories; preserve legacy account redirects |
| Publishing the repository root can expose files that are not site assets | Shared allowlist build to dist/ for Netlify and GitHub Pages |
| Offline cache can mix new HTML with old JavaScript | Content-versioned asset URLs, cleanup worker, and a tested migration from the old cache |
| Four dependency audit findings | Remove unused runtime packages and use the email provider’s HTTPS API; audit now reports zero findings |
| No useful custom 404 and outdated operational documentation | Add a 404 page, corrected metadata/manifest, current development instructions and deployment checks |

## Verification

- Build and seven backend/build tests pass.
- Seven browser scenarios pass, including responsive layout at 320, 375, 390, 600, 768, 1024 and 1440 pixels; no horizontal overflow or uncaught page errors in those checks.
- Service tabs, mobile navigation, gallery paging, focus handling, enquiry disclosure, invalid forms, unavailable hosting, rate limits, retry and success states checked.
- axe WCAG A/AA checks found zero violations at desktop and phone widths. Automated checks are not a complete accessibility certification.
- JavaScript-disabled page exposes all 37 services, 42 photo links and working booking links.
- A real browser test seeded the legacy worker and cache, then verified updated scripts loaded, the old salon cache was removed, and unrelated cache data remained intact.
- Every visible local image loaded, local asset paths and anchor targets resolve, and external booking links point to the existing Booksy listing.
- npm audit: zero reported vulnerabilities.
- No production database operations or test emails were performed.

## Hosting checks

Netlify has the RESEND_API_KEY, RESEND_FROM and CONTACT_TO environment variables configured, and the contact endpoint responds on production. Tests mock email delivery and do not establish inbox receipt or sender-domain verification. GitHub Pages is static hosting and intentionally uses the email fallback when its function endpoint is unavailable.

Opening hours were preserved from the existing site, including Europe/London daylight-saving handling. Holidays and exceptional hours are not fetched; the site directs visitors to Booksy for appointment availability.

## Maintenance

Edit the HTML, css/site.css and small scripts in js/. Keep public assets in the build allowlist. The archived account implementation is reference material only and must not be restored to a deployment without a separate authorization review.
