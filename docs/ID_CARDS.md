# Official Runway ID cards

Employee Profile → **Generate ID Card** uses the shared template in `frontend/src/features/id-card/id-card-template.ts` for every employee. Current Employee Master records remain the only source of photo, name, employee ID, designation, department, blood group and joining date. No separate card-employee collection or migration is used.

## Artwork and placement

The supplied `Asset 2@4x.png` is the front and `Asset 1@4x.png` is the back, copied byte-for-byte to `frontend/public/id-card/runway/`. Logo, signature, colors, border, QR and contact text are untouched. The supplied QR stays static; it is not an employee verification code. The PDF contains two card outlines on an A4 sheet, not A4-sized cards. Their 153.39 × 244.139 point outlines provide the configured card dimensions (about 54.11 × 86.13 mm).

Photo coordinates follow the front's circular opening. Dynamic text is confined to the unused white area above the supplied signature; its positions, colors, sizes and minimum font sizes are configurable in the shared template. The artwork contains no font/text-position specification for employee fields, so Arial is used for the dynamic overlay only. All existing lettering remains baked into the original artwork. Text wraps and shrinks only within its assigned box; excessive text blocks export with a review message rather than silently printing clipped data. Photos use a centered `object-fit: cover` circular crop, never stretching. Missing/broken photos must be corrected before export.

## PDF and print

**Save as PDF** uses the browser print dialog (not a server PDF download). Choose Save as PDF, disable headers/footers and use Actual size / 100%. The print-only layout creates one card-size page per side, excludes the app shell, and waits for image decoding/fonts before printing. Browser/printer rounding may slightly quantize physical dimensions; use a physical proof before a print run. Front/back duplex alignment and any additional bleed/crop marks must be agreed with the printer; the supplied artwork itself is not altered or padded with invented bleed.

Only SUPER_ADMIN, HR_ADMIN and HR can view/generate card data, enforced by the existing backend `employee:id-card:generate` permission and UI checks. Generation/data access continues to be audited. Every page open loads the employee again; edited profile information is used on regeneration. There is no batch interface yet, but the shared data/renderer/template remain reusable.

## Verification

`node tools/id-card-qa.cjs` with the local frontend on port 3100 uses synthetic API fixtures and the existing ignored Playwright installation. It tests 1440/768/390/320px layouts, both sides, circular photo cropping, text fit, oversize text refusal, updated records, missing/broken photos, PDF/print isolation and non-HR denial. Test PDF/screenshots are written only under `tools/.dashboard-qa/`. PDF inspection confirms two pages, front-only dynamic text, no app UI and card-sized media boxes. Backend API authorization/source-data behavior is tested in `backend/tests/id-card.test.ts`.
