# Submission checklist: Space Apps 2026, team Firebreak

Written 2026-11-15 18:00 Qatar (AST, UTC+3) by a Claude session that read, in Karim's logged-in Chrome:
- the official guide: https://www.spaceappschallenge.org/resources/project-submission-guide/ (dated November 13, 2026)
- the team's live project form (opened in Edit, read, closed **without saving**)
- the Boston local event page: https://www.spaceappschallenge.org/2026/local-events/boston/

**Any Claude account continuing:** read this file top to bottom, then tick boxes and add a line to the log at the bottom. The form text itself (summary, details, data links) is being drafted separately in `docs/SUBMISSION.md` on branch `lane/docs/submission`; this file is the *process*: deadlines, blockers, where to click.

---

## 0. DEADLINES (read first)

| What | Official time | In Qatar (AST) | Source |
|---|---|---|---|
| **Boston local submission deadline** | Sun Nov 15, **12:00 pm US/Eastern** | **20:00 today** if EST (correct for Nov 15). **19:00** if they really mean EDT, as their footnote writes "EDT" | Boston event page, "Schedule (all times US/Eastern)" |
| Boston presentation & judging (online, **must attend**) | 1:00 pm to 4:30 pm US/Eastern | 21:00 to 00:30 (or 20:00 to 23:30 if EDT) | same page: "You must attend ... online local presentation & judging event on 11/15 1:00 PM EDT" |
| Winner announcement | 4:30 pm US/Eastern | 00:30 (or 23:30) | same page |
| **Global hard close** (Submit for Judging button stops counting) | Sun Nov 15, 11:59 pm, Local Event time zone (Boston) | Mon Nov 16 **07:59** (EST) | official guide + form tip 6: "No edit requests or exceptions past this deadline" |

**Plan to press "Submit for Judging" by 19:00 AST.** You can re-submit as many times as you like before the close; only the last submission is judged. So: submit an early complete version, then improve and re-submit.

Ask in the Boston Discord (or email Local Lead Misaki Tatsumi, listed on the event page) whether noon means EST or EDT, *if* there is time. Don't wait on the answer.

---

## 1. Facts about our team (checked live, 18:00)

- Team page: https://www.spaceappschallenge.org/2026/find-a-team/firebreak1/
- Team name: **Firebreak**. Team owner and **only member**: Karim Amer (@xkarimam), Qatar.
- Local event: **Boston, MA, United States** (virtual). The event page shows "Your Local Event" and a "Cancel Local Event Registration" button, so Karim is registered. Confirmed-vs-waitlisted is **not shown** on that page: UNVERIFIED. Rule: every member must be a *confirmed* participant at the same local event or the project is not eligible for awards.
- Challenge: *Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data*.
- Project tab state: "Project Requires Submission for Judging". All sections show **Incomplete**. Nothing saved yet.

---

## 2. BLOCKERS (fix these or the form cannot be submitted)

### B1. No public link to the project — required field "Project *"  ⏳ (18:30: almost done)
**Status 18:30 (Karim chose option 1 at 18:21):** history scanned clean (no key patterns; the real `META_API_KEY` value is in no commit). Repo is now **PUBLIC**. Pages enabled (build type: Actions). Workflow `.github/workflows/pages.yml` is in **PR #22** (CI green). **Karim merges PR #22** → the deploy runs on `main` → site at **https://xkarimam.github.io/flame-in-freefall/** (not live until that deploy finishes). Then open it in incognito. Code link for the form: https://github.com/xKarimAm/flame-in-freefall

- The repo `xKarimAm/flame-in-freefall` is **PRIVATE** (`gh repo view`, today). Karim decided at 01:17 to keep it private, host "later" (`E:\spaceapps-2026-plan\docs\HOSTING.md`).
- The form says the link "should not require a password, permission, or registration" and "To be eligible for a Global Award, your project must be accessible via a public link."
- The site is static: `web/dist` is 1.1 MB (`index.html`, `assets/`, `data/`).
- **Karim must choose one** (each needs his go-ahead; account creation is his to do):
  1. **Make the repo public + GitHub Pages.** First scan git history for secrets (`.env` is git-ignored, but check history). Then add a Pages deploy workflow. Gives a code link and a live site link. Needs `vite.config.ts` `base` set to `/flame-in-freefall/`. UNVERIFIED how long Pages takes on first deploy.
  2. **Keep repo private, upload only the built `web/dist`** to a static host (Netlify, Vercel or Cloudflare Pages: drag-and-drop or CLI). Needs Karim to sign in/create the account himself.
  3. **Fallback if hosting fails:** a public Google Drive folder or public GitHub repo containing `web/dist` + README. Judges would have to run it locally: weak, but it fills the field.
- After deploy: open the link in a **private/incognito window** (guide: "Test the link in a private browser").
- Optional (guide, not required): request a FortiGuard web-filter classification for a new site, Company Name "N/A".

### B2. Demo link — required field "Project Demonstration *"  ❌
- Must be **either** a slide deck of **≤ 7 slides including title and intro**, **or** a video **≤ 30 seconds**. Exceeding either: "not eligible for Global Judging".
- Must be hosted publicly (YouTube, Google Drive, GitHub, OneDrive, Dropbox), no login. Cannot be uploaded to the Space Apps site.
- English only (a video may be in another language **with English subtitles**).
- We have: `docs/presentation/DECK.md` (5 slides + close, written for the 5-min Boston pitch), `docs/presentation/Firebreak-deck.pptx` (slide count **not checked**: python-pptx not installed), `VIDEO-30S.md` (6-shot plan, 30 s total; **not recorded**).
- **Guide says the deck must show:** team name, names of team members, the challenge chosen. Check the title slide has all three. Also: an image of the project, the user experience, how NASA/open data makes it possible.
- Fastest path: export the deck to PDF → upload to Google Drive → Share → "Anyone with the link: Viewer" → test in incognito → paste the full `https://` URL.

### B3. SI disclosure rules — affects what's *in* the project  ⚠️
- Generated images/videos need a **visible watermark** saying they're SI-generated. Generated code/data/text: acknowledge in descriptive text **and metadata**.
- Generated content may **not** use/contain/modify NASA logos, flags, mission identifiers.
- Already OK: the UI labels AI-written text "AI summary" and tags it with model + date (AGENTS.md rule 4). The NASA photo in `web/public/data/pictures.json` has its insignia cropped out (and it's a real NASA photo, not generated).
- **To decide (Karim):** were the Firebreak logo / brand SVGs (`docs/brand/`) or the team photo made with an SI tool? If yes, they need a visible "SI-generated" mark wherever judges see them (team page image, deck, site). The README should state that code was written with Claude and text with Muse Spark/Claude.

### B4. People under 18  ⚠️
- Demo and project "may not include any images, video, audio, or other likeness to persons under 18". Check `docs/brand/team-photo/` and the deck before uploading.

---

## 3. The form, field by field (exact labels, read from the live form)

Open: profile icon (top right) → **My Team** → **Project** tab → blue **Edit**. Turn **Lock** ON while editing. Press **Save Progress** often (the guide says saved changes become visible to anyone on the page, but are not submitted).

| # | Field (as on form) | Req | Limits / format | Our source |
|---|---|---|---|---|
| 1 | **Project Name** | — | free text, currently placeholder "Project Firebreak" | Firebreak (decide final name) |
| 2 | **Summary** | * | 0/1500 chars; they suggest 50 to 200 words. "What did you develop? How does it address the challenge? Why is it important?" | `docs/SUBMISSION.md` (lane/docs/submission) |
| 3 | **Project Demonstration** | * | full URL incl. `https://`; ≤7 slides or ≤30 s video; public | B2 |
| 4 | **Project** | * | full URL incl. `https://`; public | B1 |
| 5 | **Project Details** | * | rich text editor. Cover: what it does / how it works, benefits, intended impact, tools/languages (HTML, CSS, TypeScript, three.js, Vite; Python pipeline), creativity, factors considered | `docs/SUBMISSION.md`, `README.md` |
| 6 | **Use of Super Intelligence (SI)** | * | multi-select; **not shown to judges**. Options: Ideation or Brainstorming · Research or Information Gathering · Data Analysis and Interpretation · Building SI/ML into the Project · Coding, Debugging, or Troubleshooting · Writing, Editing, or Translation · Visual Design or Image Creation · Presentation, Video, or Audio · Other Project-Related SI Use · None / Did not use SI or SI tools | Honest picks for us at least: Coding; Writing/Translation; Building SI into the project (AI summaries); Data Analysis; Research. Visual Design / Presentation if B3 says so. Note the guide: SI should **not** be used to come up with the idea itself |
| 7 | **NASA Data** | * | repeatable rows: **Link Text** (resource name) + **Link Url** (full URL). At least one NASA resource is required for a Global Award | PSI (Physical Sciences Informatics) entries used; `data/psi-snapshot/`, `data/curated/*` source URLs, images.nasa.gov photos in `pictures.json` |
| 8 | **Space Agency Partner & Other Data** | — | same row format. List **all** other data, code, text, images, tools, even open source. All links public | three.js, Vite, fonts, any non-NASA sources in `data/curated/`, Claude/Muse Spark |
| 9 | **Agree to Terms and Conditions** | * | checkbox | Karim ticks |
| 10 | **Confirm All Work is Original** | * | checkbox; confirms every external resource is listed in fields 7 and 8 | Karim ticks only after 7 + 8 are complete |

Then **Submit for Judging**. Success = a banner at the top + confirmation message. If any required section is incomplete, the button will not submit. The "Edit Details" box on the Project tab shows the last save/submit times: check it.

The Project page **can** take images (JPG/PNG/GIF up to 10 MB, upload or paste). It **cannot** take videos or documents: link those.

---

## 4. Order of work (to never get stuck)

1. [ ] **Karim:** pick hosting option for B1 (1, 2 or 3). ← blocks everything else on the public link
2. [ ] Deploy `main` build; test URL in incognito
3. [ ] Deck: confirm ≤7 slides, title slide has team name + "Karim Amer" + challenge name; export PDF; upload to Drive, public link; test in incognito
4. [ ] Settle B3 (SI watermark on logo/images?) and B4 (no under-18 likeness)
5. [ ] Get the form text from `docs/SUBMISSION.md` (lane/docs/submission) — check every number against its repo file before pasting
6. [ ] Fill fields 1 to 8, **Save Progress** after each section
7. [ ] Tick fields 9 and 10 → **Submit for Judging** → see the banner. **Target: before 19:00 AST**
8. [ ] Record the submit time in the log below
9. [ ] Optional improvements (30 s video, better deck) → edit → **re-submit** before 07:59 AST Mon (global close). Keep the Boston judging (from 21:00 AST, or 20:00) free: attendance is required
10. [ ] After submission: profile icon → **Profile** → "Participant Information" → "2026 NASA Space Apps Challenge" → yellow **Download Participant Certificate** (PDF, paper size Letter; use a laptop). Name comes from Profile → Account Information → Full Name. Problems: web@spaceappschallenge.org with username + team name

---

## 5. Log

| Time (AST) | Who | What |
|---|---|---|
| 18:00 | Claude (this file) | Read the guide, the live form (no save), the Boston page. Found: repo private (B1), Boston deadline 12:00 ET = 20:00/19:00 AST, form fields listed above. Nothing submitted. |
| 18:46 | Claude (build session 3) | PR #22 merged on Karim's word; site live and checked at https://xkarimam.github.io/flame-in-freefall/ . B1 done. |
