# GapFinder AI — Advanced 8-Feature Hackathon Demo

A Next.js learning workspace with **exactly eight main features**:

1. **Study Material Upload** — upload text-based PDF, DOCX, TXT, Markdown, and CSV files.
2. **AI Topic Mapping** — ask Gemini to identify subject-specific topics from retrieved material passages, with filename and evidence excerpts.
3. **Diagnostic Quiz** — generate multiple-choice questions from uploaded notes, including a supporting source/evidence field; review scores and explanations.
4. **Knowledge Gap Analysis** — after a completed quiz, calculate topic-level mastery from the student’s actual answers, prioritize lower-scoring topics, and recommend next actions. Before the first quiz, the app displays clearly provisional starter estimates.
5. **Personalized Revision Planner** — prioritize the lowest-scoring topics and track suggested revision sessions and completion.
6. **Explain This Topic Assistant** — retrieve relevant passages and ask Gemini to answer only from those passages, with source labels.
7. **Progress Dashboard** — review uploaded resources, quiz activity, topic information, and export a JSON report.
8. **Secure Authentication and Document Management** — demo account screen and browser-local document management. The sign-in remains a demo, not real authentication.

## Requirements
- Node.js 20.9 or newer (recommended)
- npm
- A Gemini API key from Google AI Studio for the AI topic mapping, generated quiz, and grounded explanation features

## Setup on Windows / VS Code

1. Extract this ZIP and open the extracted project folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Install dependencies:

   ```powershell
   npm install
   ```

4. Create the PDF worker file used for text extraction:

   ```powershell
   New-Item -ItemType Directory -Force .\public | Out-Null
   Copy-Item .\node_modules\pdfjs-dist\legacy\build\pdf.worker.min.mjs .\public\pdf.worker.min.mjs -Force
   ```

5. Create the environment file:

   ```powershell
   Copy-Item .env.example .env.local
   notepad .env.local
   ```

6. Replace `replace_with_your_gemini_api_key` with your own Gemini API key. Save the file. **Never paste the key into chat, commit it to GitHub, or put it in a `NEXT_PUBLIC_` variable.** The AI route reads it on the server.
7. Start (or restart) the development server:

   ```powershell
   npm run dev
   ```

8. Open the localhost URL printed in the terminal, usually `http://localhost:3000`.
9. Upload text-based notes. Open **AI Topic Mapping** and choose **Generate AI topic map**. Open **Diagnostic Quiz** and choose **Generate AI quiz from my notes**. Open **Explain This Topic Assistant** and ask a question supported by your notes.

## How the AI pipeline works

- The browser extracts text from supported uploads.
- For each AI request, selected material text is sent to the Next.js server route `/api/ai`.
- The server retrieves keyword-matching source passages, constructs a grounded prompt, and calls Gemini 2.5 Flash.
- The assistant is instructed to say when the retrieved passages do not support an answer and to cite source labels. Topic mapping and quiz generation request structured JSON and include source metadata.
- The Gemini key remains server-side in `.env.local`. The API route validates action types, limits material/context size, and returns source labels and excerpts for citation display.

This is a **lightweight keyword-retrieval RAG prototype**, not a vector database/embedding-based production RAG system. Citations are source-label based; verify them against the original uploaded files. Uploaded material is sent to Gemini when an AI feature is used, so only use documents you are allowed to process with the service.

## Important limitations before submission

- AI topic mapping, AI quiz generation, and grounded explanation require a valid Gemini API key and internet access.
- Topic-level mastery is calculated from the most recently completed quiz, but it is a simple score-based estimate rather than a validated psychometric model. The schedule is a lightweight rule-based plan, not an optimized adaptive scheduler.
- The sign-in form is still a demo. Documents and task progress are saved in this browser's local storage, not secure per-user cloud storage. Connect Supabase Auth, database policies, and Storage before claiming real secure authentication.
- PDFs must contain selectable text. Scanned PDFs require OCR.
- Local storage has browser limits. Large libraries may exceed those limits.

## Build check

```powershell
npm run build
```

Fix any build errors before deployment. Keep `.env.local` private and do not commit it.
