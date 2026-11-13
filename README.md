# Олимпикс — веб-приложение

## Запуск

```bash
cd app
npm install        # postinstall copies pdf.js fonts/cmaps into public/pdfjs
npm run dev        # http://localhost:5173
```

Other commands:

- `npm run typecheck` — TypeScript check.
- `npm run build` — production build into `dist/`.
- `npm run check:content` — validate lessons, questions and flashcards.
- `npm run konspekt` — regenerate `src/content/konspekt.json` from `../TGP_Morozova_vyzhimka.docx`.

If `npm install` fails with `EACCES` on `~/.npm`, your npm cache has root-owned files. Fix it with `sudo chown -R $(id -u):$(id -g) ~/.npm`.

## Structure

```
src/
  domain/      subject-agnostic logic
               types.ts — data model
               srs.ts — spaced repetition
               grading.ts — answer checking
               diagnosis.ts — error analysis and adaptive practice
               progress.ts — lesson and module status
  content/     law-specific content
               course.ts — modules and lessons
               lessons.ts — theory, questions, concepts
               flashcards.ts, library.ts, olympiads.ts, konspekt.json
  store/       zustand store (localStorage, phase 1)
  components/  Layout, QuestionView (all exercise types and error feedback), PdfViewer, KonspektReader
  pages/       one file per section
```

Adding a lesson:
1. Create `src/content/m1/lessonNN.ts`, copying `lesson03.ts`. It exports `concepts`, `questions` and `lesson` with the id `m1-lN`.
2. Register the file in `src/content/lessons.ts`.
3. Add its flashcards to `src/content/flashcards.ts`, with the textbook `page`.
4. Run `npm run check:content`.
5. In `npm run dev`, open the lesson and run `await __solve()` in the browser console.
