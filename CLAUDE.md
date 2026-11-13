# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

The app lives in `app/`. It is phase 1 of `PLAN.md`: a React 18 + TypeScript + Vite single-page app with no backend. All state is kept in localStorage through zustand. Phase 2 will add Supabase (auth, database, admin panel) and phase 3 will add AI through a server-side function.

Commands (run inside `app/`):
- `npm run dev` — dev server on http://localhost:5173.
- `npm run typecheck` — TypeScript check.
- `npm run build` — production build.
- `npm run build:share` — build `dist-share/` for a reviewer link (published as a claude.ai artifact): `VITE_SHARE` switches to `MemoryRouter`, relative asset paths, all lessons open,.
- Publishing: `build:share` wipes `dist-share/`, including `olimpiks.html`, the body-only page that gets published. Recreate it with the new asset names, publish it with `root: dist-share`, send the new assets and set the old ones to null.
- `npm run konspekt` — regenerate `src/content/konspekt.json` from the root `.docx`.

- `npm run check:content` — validates content: references, answer keys, and that no task uses a concept from a later lesson. Run it after every content change.

There is no test suite or linter; `tsc` in strict mode plus `check:content` are the checks. For a UI walkthrough, run `npm run dev` and call `await __solve()` in the browser console on a lesson page (`src/dev/autoplay.ts`, dev only). Pass question ids to answer them wrongly, e.g. `__solve(['l4-q2'])`. The output flags `UNEXPECTED WRONG <id>` when an answer key and the UI disagree. If `npm install` hits `EACCES` on `~/.npm`, pass `--cache <dir>`.

Architecture (in `app/src`):
- **`domain/`** is subject-agnostic logic:
  - `types.ts` — the data model;
  - `srs.ts` — spaced repetition;
  - `grading.ts` — answer checking;
  - `diagnosis.ts` — error causes, weak concepts, adaptive practice;
  - `progress.ts` — lesson and module unlocking.
- **`content/`** is the law course. Lessons 1–2 are in `lessons.ts`; lesson N ≥ 3 is in `content/m1/lessonNN.ts`, which exports `concepts`, `questions` and `lesson` and is registered in `lessons.ts`. Module 2+ has one file per chapter (`content/m2/ch3.ts`, exporting `concepts`, `questions`, `lessons`) and a programme in `course.ts`; question ids look like `m2l3-q1`. Modules 4–10 use the most compact format: `CompactLesson[]` rows in `content/mN/` passed to `compactModule()` (`build.ts`), which derives question ids (`m4l3-2`), follow-ups and flashcards; `index.ts` exports `concepts`, `questions`, `lessons`, `cards`. `scripts/add-module.py` registers a new module in `course.ts`, `lessons.ts` and `flashcards.ts`. Lessons 16+ use the compact helpers in `content/m1/build.ts` (the correct option goes first; `QuestionView` shuffles the display order per question, so explanations must not refer to option letters). Review lessons (5, 10, …) add no concepts or flashcards; `LessonPlayer` appends a personal block from the student's weak concepts in earlier lessons. Every textbook claim cites `§` and printed page (pages = PDF page numbers). A lesson is a `Lesson` with steps (`intro` / `theory` / `practice` / `summary`) that references question ids. Each question carries:
  - `concepts` and `skill`;
  - an `origin` (textbook, authored, AI-authored, or a verified olympiad). Until a human editor reviews them, every non-olympiad task shows «Авторское задание, созданное ИИ»; `textbook` only adds which passage it is based on;
  - `simpler`, the «Объясни проще» text;
  - `followUpId`, the reinforcement task;
  - an error `cause` on each wrong option.
- **`components/exercises/QuestionView.tsx`** renders every exercise type and the full error-feedback flow. It records each attempt in the store.
- **Olympiads:** `content/olympiadCatalog.ts` is the checked table of law olympiads for the season (status from the official Перечень, dates with their source). Re-check it each season; never carry old benefits over.
- **Library PDFs** are in `app/public/books`. The owner removed the full textbook from the site: the Library has only the конспект and the guides, and the book stays in the project root as the source for content. Do not put it back in `public/`, the site is public. Keep the book id `morozova-tgp`: saved marks and pages use it as a key. Chapters and page numbers are read at runtime from the PDF (`PdfViewer`); never hard-code page numbers. The site's конспект is the PDF «Сокращенный конспект по учебнику Морозова» (`public/books/morozova-konspekt-short.pdf`); it has no outline, so `PdfViewer` reads its «Глава N.» headings at runtime and the textbook-to-конспект link matches those. That PDF is generated: edit `app/scripts/konspekt/` (`short-lines.json`, `additions.json`), run `python3 scripts/konspekt/build.py`, then print `short.html` to the PDF with headless Chrome. A textbook can also have `guides` (extra manuals with their own tab and table of contents); the first is the «Теоретический учебник ВсОШ» (`public/books/olimpx-teoriya-vsosh.pdf`). `KonspektReader` and `konspekt.json` (the detailed выжимка) are no longer shown on the site.
- **Answer options:** `content/distractors/mN.json` rewrites wrong options on top of the lesson files so the correct answer does not stand out by length (`applyDistractors` in `lessons.ts`; keyed by question id, in the order of the wrong options, `=` replaces and anything else is appended). New tasks should have wrong options of about the same length as the correct one. `content/guideExtras.ts` adds tasks from the ВсОШ manual (ids like `m1l24-g1`).
- **Keeping the student's place:** tabs reopen at their last screen (`tabPaths`; pressing the open tab goes to its first screen), each screen keeps its scroll (`useScrollMemory` in `Layout.tsx`), and the share build reopens at `lastLocation`. A lesson in progress lives in `lessonRuns`, an unfinished answer in `drafts`, card browsing in `deck`, training in `practice`.
- **Personal plan (`buildPlan`, `buildPractice` in `diagnosis.ts`):** the owner's rule is that training holds only what the student got wrong. A topic is in the plan while it has tasks whose latest answer is wrong; a task leaves when solved, a topic when no tasks remain. Correct tasks, new similar tasks and mixed review never enter a session. Cards with errors are those last rated Не знаю or Трудно (`isMistake` in `srs.ts`, `mode=errors`).
- **Flashcards (`Review.tsx`):** tap flips; dragging right rates «Знаю», left «Не знаю» (pointer events, so a mouse works too). «Вернуть прошлую» goes back and cancels that card's rating through `deck.before`. Трудно and Легко stay as extra buttons on the flipped card. Only one face is rendered at a time: 3D backface hiding shows the back mirrored in Safari.
- **PDF as a book (`PdfViewer`):** finger swipe, trackpad swipe, ←/→ keys, page edges and the slider all turn pages. The turn copies the old canvases into `.turn-layer` and rotates them at most 90°. Two-page view (`docSpread`) is the default from 1000 px of pane width, the cover stands alone, and a toggle shows from 700 px. Swipe is off while «Выделять» is on, so long-press selection keeps working.
- **PDF marks:** `highlights` in the store, rects as fractions of the page. A highlight with no rects is the student's own text block («+ Свой текст»), shown under the page. The text layer stays off on narrow screens unless the student turns on «Выделять»: leaving it on caused the text overlap on phones. Marks live in the browser only until phase 2 brings accounts.
- **Lesson material (`StudyDrawer`):** «Повторить материал» opens the lesson's theory and the конспект at its chapter, in lessons and in training. It stays mounted after the first open and is portaled to `<body>`, because inside the page it sits under the phone tab bar.
- **Lesson enrichment (`content/enrich/`):** `mN.ts` holds, per lesson number, the closing «Как это работает в жизни» block (`h`, `r`, all 300 lessons) and an olympiad-style case (`p`, `o`, `e`, the 240 new lessons). `enrich()` also builds «Выбери все верные суждения» from true/false statements already in the course. Both go into an «Олимпиадный формат» step before the summary; `check:content` fails if a lesson lacks them. Real-life examples are AI-written, labelled as such, and need an editor's fact check; use only well-known facts.
- **Sign-in (`server/index.mjs`, `src/auth/`):** the owner wants login only through Russian services or a phone number, never Google. The server has no dependencies (Node 22.13+, `node:sqlite`) and serves `dist/` plus `/api`. It supports a phone code by SMS (sms.ru), Яндекс ID and VK ID (OAuth 2.1 with PKCE); each method shows only when its keys are set in `server/.env` (see `server/.env.example`). Codes and session tokens are stored hashed, sessions are HttpOnly cookies, code requests and attempts are rate-limited, and POSTs require JSON (CSRF). `AuthGate` loads the account's progress into the store and saves it back; sign-out and account deletion stop saving first, then wipe the browser copy. `npm run build:server` builds with `VITE_AUTH=1`, and `npm run server` runs it. `DEV_SMS=1` prints codes to the log for local tests and is refused in production. The shareable link has no server, so it has no login. Яндекс and VK were tested only against local stand-ins, not the real services.
- **Mail and password (`server/index.mjs`, `EmailForm` in `AuthGate`):** the owner wants registration with a Russian mailbox (mail.ru and others, list in `MAIL_DOMAINS`) and a password. Registration and password reset confirm the address with a 6-digit code sent through the owner's own mailbox over SMTP (built-in client, mail.ru needs an app password). Passwords are hashed with scrypt; the answer to registering a taken address is the same as for a new one, and that address's owner gets a warning letter instead; login attempts are limited per address and per IP; a new password signs out all devices. A static site on another domain (GitHub Pages) talks to the server with a bearer token, allowed by `ALLOWED_ORIGINS` (CORS); build it with `VITE_API_URL`. Tested end to end against a local fake SMTP server; not deployed yet. Do not ship a site build with `VITE_API_URL` before the server is up: the form would look working without working.
- **Sign-in without a server (`src/auth/yandex.ts`), the owner's choice:** Яндекс ID with the token flow, and the progress saved as `app:/progress.json` in the app folder of the student's own Яндекс Диск. Nothing is stored by us. It is on when the build has `VITE_YANDEX_CLIENT_ID`; `npm run build:pages` makes a static build (`VITE_STATIC`: memory router, relative paths, lessons locked as for students) for any free static host such as GitHub Pages. The Яндекс app needs the rights to the Disk app folder and to login info, and its redirect URI must be the exact site address. Returning to the tab reloads the file if another device saved later. The claude.ai link cannot use it: Яндекс has no fixed address to return to. Live at https://shmoall.github.io/olimpiks/ (repo `shmoall/olimpiks`, uploaded by the owner through the GitHub web page); the owner confirmed sign-in and saving work. The Яндекс app must have the Disk app-folder right: without it the Disk answers 403.
- **The store** (`store/useStore.ts`) is the only persistence layer. Phase 2 replaces it with repositories that keep the same shapes.

All spec and content files are in Russian, and the UI must be in Russian.

| File | What it is |
|---|---|
| `prompt for the app.pdf` | **Master product spec** (23 pp.). It is the source of truth for features, MVP scope and acceptance scenarios (§18–19). |
| `prompt.pdf` | Curriculum design for the first course (ТГП by Morozova): the module breakdown, Module 1's 30-lesson plan, and Lesson 1 written in full as the reference lesson format. |
| `Морозова — ТГП.pdf` | The full textbook (the source for all course content). |
| `Сокращённый_конспект_по_учебнику_ТГП_Морозова.pdf`, `TGP_Morozova_vyzhimka.docx` | Summaries (конспекты) of that textbook for the Library. |
| `IMG_5183.PNG` | Brand logo: **«Олимпикс» — платформа для самостоятельной подготовки к олимпиадам**. |
| `photo_2026-11-04 02.09.33.jpeg` | Hand-drawn concept sketch of the platform flow. |

## Product: Олимпикс

Олимпикс is an olympiad-prep platform for school students. It starts with law (Право), and its architecture must accept other subjects without a rewrite. The **infrastructure is subject-agnostic** (users, modules, lessons, questions, flashcards, progress, error analysis, PDF library, AI tutor, spaced repetition). **Content is subject-specific**: for law, that means legal concepts, norms, normative sources, branches of law and jurisdiction. An admin must be able to add a new subject through the CMS.

There are two independent but linked learning paths. They share **one** progress, error-diagnosis and review system, not two separate ones:
1. **Обучение (Duolingo-style roadmap):** Subject → Modules → exactly **30 lessons per module**.
   - Lessons 5, 10, 15, 20 and 25 are review lessons covering the previous 4 lessons. Lesson 30 reviews the whole module.
   - Each lesson takes ≤10 min and follows ТЕОРИЯ → ПРАКТИКА → РЕЗУЛЬТАТ, with many exercise types (the list is in spec §5.2).
   - Locked lessons stay locked until the student reaches them. Completed lessons stay open for review.
   - The sketch adds a "пробник по всему модулю" (a practice test covering the whole module).
2. **Библиотека:** a textbook PDF catalog. Each textbook is linked to its конспект.
   - The PDF viewer needs zoom, search, go-to-page, bookmarks and a saved last page.
   - A split view shows the PDF and the конспект side by side.
   - AI actions: "Создать карточки по этой главе" (with a preview before adding), "Проверь меня по этой главе", and an AI Tutor that is grounded in the open document.

Other sections:
- **Повторение:** Quizlet-style decks, one per module. Students rate each card Не знаю / Трудно / Знаю / Легко, and spaced repetition schedules the next review. The sketch gives intervals of roughly day → 3 days → 5 days → week. The section also offers daily tasks on topics already studied.
- **Мой прогресс**
- **Зоны роста** (weakness map)
- **Профиль**
- **Admin/editor panel**
- **User accounts**

Requested extras:
- An olympiad calendar with deadlines and a short description of each olympiad (for example, whether it gives БВИ). It doubles as a smart checklist where students mark where they have registered or which stages they have passed.
- A "до дедлайна" mode that builds a prep plan toward a chosen olympiad.

**Core differentiator: AI error analysis.**
- Every wrong answer is linked to the concept and skill it tested.
- The system infers a probable cause: forgotten definition, confused similar concepts, misread classification, causal-link error, application failure, misread condition, or logic error. A single mistake only gives a *tentative* cause, which needs confirming with follow-up tasks.
- Flow: ошибка → проблемное понятие → повторное объяснение → похожее задание → harder task → mastery check.
- The sketch adds a step: the AI first asks the student *why* they answered that way.
- Feedback shows the correct answer, why it is correct, what the error was, which theory to revisit, an example, and a follow-up task. It also offers an «Объясни проще» button.

Mastery levels: Начинающий → Базовый → Уверенный → Продвинутый → Олимпиадный.

The suggested data model is in spec §15. Its entities include Users, Subjects, Courses, Modules, Lessons, TheoryBlocks, Concepts, Questions, QuestionSources, UserAttempts, ErrorCategories, UserWeaknesses, UserMastery, Flashcards, Decks, ReviewSchedules, Textbooks, Chapters, PageReferences, LegalSources and ContentReviewHistory.

## Content-integrity rules (non-negotiable, from the spec)

- **Never fabricate** olympiad sources, years, stages, links, legal norms, textbook page numbers, or links between textbook and конспект.
- Real past-olympiad tasks must show their source: olympiad, year, stage, task number and link. Show a source only when it has been verified.
- AI-generated tasks carry the label **«Авторское задание, созданное ИИ»** and must never be passed off as real past tasks.
- Keep these categories distinct: textbook content, current law, historical versions of a law, author explanation, and AI commentary.
- The admin sets the jurisdiction. Mark outdated norms as outdated.
- AI-generated content goes through a review workflow before it is published: Черновик → Создано ИИ → На проверке → Проверено редактором → Опубликовано → Архивировано.
- If no AI API is connected yet, build a separate AI-service layer with clearly labeled demo scenarios. Never present demo output as real model output.
- Demo data must be visibly marked as demo.
- No section may look finished while it does not work.
- Users are minors:
  - no mandatory public leaderboard; pseudonyms are allowed;
  - no manipulative notifications, and no penalty for a missed day;
  - role-based access, with a protected admin panel;
  - account and data deletion must be available.
- Legal explanations are educational, not legal advice.

## Curriculum (from `prompt.pdf`)

- **Structure:** `prompt.pdf` plans 10 modules × 30 lessons = 300 lessons (240 new, 60 review). The owner confirmed the course must cover everything in the files, so all 10 modules get written. The UI counts only modules with a written programme, so its total grows as modules are added. The modules follow the textbook's chapter order, and the module → chapters/subsections map is in `prompt.pdf` §2.1–2.2.
- **Lesson format:** Lesson 1 of Module 1 is the template. It runs:
  1. intro task
  2. theory chunk
  3. practice
  4. a second theory chunk
  5. practice, including an authored olympiad task with a reference answer
  6. final check
  7. results, including XP and a mastery criterion

  Each part is timed.
- **Textbook content the конспект lacks but the course must include:** listed in `prompt.pdf` §1.1. For example: the 8 functions of ТГП, the потестарная (кризисная) concept, the Ch. 9 natural-law schools, and the Ch. 18 фактические составы.
- **Known textbook error:** on p. 28, the age of life on Earth (3.5–5 bn years) contradicts the age of the Earth (≈4.7 bn years). Don't present that dating as a learning fact.

## Design

- **Look:** minimalist, modern EdTech, not childish. Avoid copying the reference products' UI or branding (Duolingo, Quizlet, Gizmo.ai, GoArno).
- **Responsive:** desktop, tablet and mobile.
- **Typeface:** the site font is TAN Nimbus (paid, by TanType). The font file goes in `app/public/fonts/` (`tan-nimbus.woff2` or `.otf`); until then the stacks fall back to Inter, Unbounded and JetBrains Mono. The конспект keeps those fallback fonts on purpose (`.konspekt` in `styles.css`), and brand watermarks use `--brand`. Small labels (dates, «Путь 1», badges) use the soft rounded Nunito via `--mono`, not TAN Nimbus.
- **Palette:** the owner's palette is `photo_2026-11-07 13.17.37.jpeg`: rose mist `#F9D0D6`, wine passion `#6A0B23`, pearl embrace `#F5F0ED`, classic valentine `#DA9EA6`. All colours go through the tokens at the top of `styles.css`. Wine is the sidebar and primary buttons, pearl the page background. Green and red stay for right and wrong answers. White text is not readable on valentine: use wine.
- **Brand:** the ОХ logo mark is a tiled watermark behind the pages (`WatermarkField`, `--wm-tile` in `styles.css`). The owner's rule: clearly visible on the page background on every screen, but it never enters a card or a field, which stay solid. PDF pages keep only a very faint overlay. The logo image itself (`IMG_5183.PNG`) keeps its dusty rose.

  The wordmark is a wide grotesque, and the tagline is in a monospace font.
