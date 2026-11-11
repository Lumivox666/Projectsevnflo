# EvnFlo Projects v1.4.0 — Searchable Report Archive & Processes

**Same original EvnFlo lettering, recoloured orange. Separate project planner with the full calendar.** This package updates the **separate orange Projects edition only**, not the original personal EvnFlo app.

## Included production plan

- 16 editable projects, 54 main tasks and 188 separately schedulable subtasks drafted from `TCG_Production_Transition_With_Visual_References(1).pdf`.
- Hypothetical project start date: **Monday, November 16, 2026** for all 13 projects.
- Editable project owners, estimated coordination hours, start dates and target completion dates, plus editable task/subtask priority, duration, due date, dependency, notes and status.
- Each project shows its **estimated total coordination hours**, **target date**, and **start date**. Estimates are draft assumptions, not approved commitments, and do **not** include the total staff-hours of production employees.
- See `TRANSITION_PLAN_SUMMARY.md` for a concise list of project estimates and targets.
- Automatic task scheduling respects a project's start date and available planning hours; subtasks appear on the day/week/month calendar and contribute to project progress.
- All of the existing project Board, List, Timeline, automatic scheduling and recurring event capabilities remain.

## New deployment vs updating your existing Railway service

**New independent installation:** On first start without an existing data file, the app automatically creates the full editable TCG plan, November production updates and the customs follow-up project. Sign in with the existing built-in code **566218**. The initial project-planning hours are Monday–Friday, **8 AM–4 PM**, with a noon–12:30 break. Update those in Settings at any time. The Projects page has a **View kickoff week** button. The plan also includes an editable recurring **Friday 3:00-3:15 PM** compressor-maintenance placeholder (confirm the actual time with the site team).

**Existing EvnFlo Projects installation:** Deploy to the same service with the existing Railway volume untouched. Because the app will not overwrite an existing `state.json`, the Projects page and Settings show **Add TCG plan** and **Add November updates** and **Add customs follow-up** as appropriate. Select **Add November updates** (if needed) and **Add customs follow-up** to add new work into your existing plan without replacing current records. If the original transition plan is missing, that action also installs it. It will not replace your existing projects, tasks or calendar events; importing a second time is prevented. First **export a backup** in Settings.

**Do not put this package in your full personal EvnFlo repository.** The two apps must use different Railway services and data volumes.

## Railway

1. Extract the ZIP into the **root** of your **private GitHub repository** for EvnFlo Projects.
2. Railway builds with **Railpack**, using `npm start` (Node 20+). Do not add an old Nixpacks builder configuration.
3. Mount a persistent volume at `/data` and set `DATA_DIR=/data`. On updates, keep the **same volume**.
4. Generate an HTTPS service domain. Sign in with the fixed PIN **566218**. No `APP_PASSWORD` variable is needed or used.
5. To validate before deploying: `npm run check` then `npm test` (Node 20+; no npm dependencies required).

The six-digit code is convenience protection, **not strong security** for sensitive production information on the public Internet. Keep the repo private and restrict access as appropriate. Export backups regularly.

## Estimate and completion assumptions

All projects share the November 16 start. Tentative finish dates in the seed are planning targets selected from the transition priorities and known sequencing; the document did not promise actual implementation dates. The Odoo go-live and Version 2 release remain contingent on implementation-team and R&D confirmation. The floor move is tentative pending approval, safety review and staffing. The scheduler allocates all subtasks to the **single EvnFlo workspace planning calendar**; if a colleague owns a task, you can adjust its time estimate or mark it complete when ownership is handed off. This is not a multi-user resource allocator.

Project hour totals may be edited in **Edit project**. Task/subtask estimates can be edited separately; the detail view shows both values to help reconcile them. If the project estimate differs from the subtask sum, reconcile as part of planning.

## Branding-only changes (v1.1.1)

- Replaced the previous EvnFlw Projects logo with the **same stylized EvnFlo wordmark** used in the original app, recoloured orange without changing its lettering.
- Updated sidebar, mobile header, sign-in screen, browser/PWA name and install icons.
- Preserved the original 13 TCG workstreams, 39 main tasks and 134 subtasks; new messages are added separately without rewriting the original tasks. Existing storage volume, login cookie and project data stay compatible.

## November 10 message updates (v1.2.0)

Two new projects are preloaded on fresh installations: **Refurbishment cost analysis** (one PR1-PR4 and one PR5-PR6 unit; actual labour and materials; leadership comparison requested by November 30) and **Compressed-air upgrade** (Wise Worth secondary tank / air dryer / filter, coordination, acceptance, Friday condensate maintenance). The contractor's *exact* Monday installation date remains **unconfirmed** because the quoted message did not specify a date.

The existing **Workstation scheduling & skills coverage** project now includes the **Company Availability Calendar SOP** and November absence checks; **Weekly KPI review** includes effective available hours and machines produced; **Production capacity** includes the post-backlog refurb/new-build decision work. The October availability calendar entry is the only new task marked completed, based solely on the sender's report.

**Important availability SOP rule:** Use the actual company-owned **Company Availability** calendar, *not* EvnFlo, to record real staff absence and modified-hours entries. Title format: `Name — Type` (em dash). Use all-day for full-day absences, times for partial-day absences; keep private details out and backfill late entries. Refer questions to Ramin.

**For an existing Railway volume:** Export a backup first, deploy this package to the Projects service, sign in, then select **Add November updates** on the Projects page or Settings. This is idempotent: it imports only once, preserves edited task/project/event records and does not write to the separate full EvnFlo application. An existing project's already-edited total-hour estimate is *not* replaced; review the three existing project totals after adding new tasks. Fresh installs receive aligned estimates automatically.

**Earlier shareable reports:** The initial manually prepared 15 one-page PDFs and portfolio overview were distributed separately; they were not generated by the app. **Starting in v1.4, the app itself can save searchable reports and generate downloadable text-searchable PDFs**, including full tasks and subtasks. The archived reports are snapshots, not confirmations of actual completion.

### Verification

Run `npm run check && npm test` to validate JavaScript, auth, seed merging, no duplicate imports, event recurrence and previous calendar/project functionality. The provided PIN is fixed at `566218` by request; it is not a substitute for organizational authentication when storing production or employee-related data.

## November 10 conveyor-cover customs follow-up (v1.3.0)

One additional editable project: **Conveyor Cover Customs Follow-Up**. Its dedicated project-level status is **Completed — follow-up required** (this label is editable in **Edit project**). The workstream and its underlying tasks record what the November 10 follow-up report says was completed and keep the remaining broker/shipping follow-up open.

- **Craig:** investigation lead; Emily was informed of the procedure. Craig clarified Jori's request with Antoine and Dan after meeting with Ram; the team located the MRPeasy alloy code and aluminium cover weight, researched metal composition, and estimated constituent-metal costs in CAD.
- **Antoine:** obtained metal certificates from ZTL and window certificates from Toby. **Dan C:** compiled and sent the documentation to Jori and followed up by phone. Craig reconfirmed at shift end that the requested package had been sent.
- **Backup option:** Dan K suggested returning the cover and shipping directly through Jori. Craig communicated this to Dan C; **this option has not been shown to be executed**.
- **Still open:** confirm broker response, customs release and shipment outcome; provide further information **only if requested by November 20, 2026**, and close follow-up when the shipment is resolved.
- **Time estimates:** 6 hours of editable coordination effort across 14 subtasks (10 marked done, 4 open). This is a planning estimate, **not recorded actual labour**.

The seven-page earlier action guide proposed broader documentation work (including some BOM, fastener and Ramin-review checks). The later follow-up does not establish that every suggested step was completed. Unverified proposed steps were not marked done.

**Existing Railway data:** Back up the current Projects app first, keep the existing storage volume, deploy v1.3.0 to the *same Projects service*, then choose **Add customs follow-up** on Projects or Settings. The action is idempotent and does not overwrite existing project, task or event edits. The November updates need not be reimported. Fresh installs include all 16 projects automatically.

The orange EvnFlo name/logo, built-in PIN `566218`, full calendar, scheduling, recurring events, boards, timeline and other projects are unchanged. **Do not deploy this update into the separate personal EvnFlo app.**


## Searchable reports and process history (v1.4.0)

**What's new:** Use **Reports & Processes** on the left sidebar (or **Reports** on mobile) to search all existing projects and saved reports by project title, description, owner, task/subtask title, detailed process notes, summary, and keywords. Use **Closed / follow-up** to focus on finished projects and those still awaiting final verification.

**Saving reports:** From any project choose **Save report**. Enter an editable title, process summary/lessons learned, and optional search keywords, then save. The app stores an **immutable versioned snapshot** of the project, including every task/subtask and its original status and notes. Choose **PDF** beside the saved report to generate and download a searchable report (with as many pages as needed). The PDF is generated on-demand from the saved snapshot; the structured report and its content persist in the Railway `state.json` on your existing volume.

**First-time archive:** New installations start with 16 baseline saved reports (all marked planning snapshots, not proof of task completion), which are searchable immediately. For an **existing EvnFlo Projects Railway service**, go to Reports & Processes and click **Save baseline for all projects** once to archive your current project state. This will not alter task records or rewrite existing saved reports. You can also save individual report versions when a project milestone is completed.

**Important limitations:** This archive searches reports generated **within EvnFlo**, plus the live project notes. It does **not** automatically ingest previously shared PDF files, external Teams files, or Odoo records. Users need to sign in to this instance to search the archive; it is not a multi-user, permission-controlled company document-management platform. The six-digit built-in PIN `566218` is not strong security; do not publish sensitive personnel or confidential customs files to the open Internet. A public link to a downloaded PDF outside EvnFlo is managed separately by wherever you share it.

**Migrating existing data:** Back up the current workspace first. Replace files in the **orange Projects-only** GitHub repository and redeploy using the **same Railway service and volume** (`DATA_DIR=/data`). Existing tasks and edited projects are preserved. Old backups without `reports` still import; new backups include the archive snapshots. Do not deploy this release into your personal purple EvnFlo app.

**Validation:** `npm run check && npm test` (40 automated checks in v1.4). Also tested the report search, archive, saved-report preview, editable report summary, and mobile layout in Chromium using simulated API responses. The live Railway deployment is not accessible from this environment.
