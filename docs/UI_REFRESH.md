# Modern responsive workspace

This release refreshes presentation and shared navigation without changing HR data models, API permissions, leave rules, employee workflows or official ID card artwork. Existing Vercel/Railway hosting is preserved. Paused local leave-adjustment changes are not part of this release.

## Design system

- Shared tokens in `frontend/src/app/globals.css`: indigo primary actions, teal/violet accents, a subtle tinted canvas, dark navy navigation, consistent rounded cards, soft elevation, restrained motion and visible keyboard focus.
- Shared buttons, inputs, file controls, tables and status badges apply throughout existing modules. Component styles use CSS layers so page-specific Tailwind utilities (including icon padding, widths and breakpoint visibility) still work.
- Login has a new responsive split layout and password visibility control. Existing validation, login request and default credential behavior are unchanged.
- Dashboard panels and KPI cards share the new visual system; data, formulas and drill-downs are unchanged.
- Common page headers, breadcrumbs and the workspace footer provide consistent hierarchy across modules.

## Responsive and accessible behavior

- Below 1024px, sidebar navigation becomes a drawer, leaving tablets a full-width workspace. Desktop collapse does not hide mobile navigation labels.
- Drawer and module-search dialog lock background scrolling, trap focus, close with Escape and restore focus. Navigation links close the drawer; its state also clears when resizing to desktop.
- Ctrl/Cmd+K opens module search; mobile users have an explicit search button. Results remain limited to the authenticated user's allowed navigation items.
- Touch controls have 40–46px targets; mobile form controls use 16px text to avoid automatic input zoom. A skip-to-content link and reduced-motion support are included.
- Dense tables remain horizontally scrollable inside their own containers, not the page. Existing multi-column forms collapse using their established responsive grids. No table columns or employee fields were removed.
- ID card print content remains separately styled and isolated from the application shell; original rounded output, photo behavior and artwork remain intact.

## Verification

`node tools/workspace-ui-qa.cjs` runs against a local frontend on port 3100, or `HRMS_QA_URL` if supplied. It intercepts all APIs with synthetic responses; it does not mutate real HR records. Seventeen representative routes at 1440/1280/1024/768/640/390/320px cover login, dashboard, employee list/create/edit/profile, self profile, attendance, leave, leave balances, approvals, organization, users/audit, locations and HR/leave policy pages. It asserts no document overflow and tests navigation, search, desktop collapse/mobile label recovery, role visibility and login error/password visibility behavior. Screenshots/results are ignored under `artifacts/dashboard/modern-ui/`.

Existing `tools/dashboard-visual-qa.cjs` and `tools/id-card-qa.cjs` also pass. Backend suite: 87 tests passed. Typecheck, frontend production build, and repository lint passed. Browser checks are representative fixture-based regressions, not evidence of every possible employee data length/device or live storage provider operation.
