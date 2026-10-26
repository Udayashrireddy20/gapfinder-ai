import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type InputMaterial = { name?: string; text?: string };
type SourceChunk = { label: string; name: string; excerpt: string; score: number };

const MAX_MATERIALS = 12;
const MAX_CHARS_PER_MATERIAL = 60_000;
const MAX_CONTEXT_CHARS = 24_000;
const STOP_WORDS = new Set([
  "the", "and", "for", "that", "with", "from", "this", "what", "when", "where", "which", "into", "your", "have", "will", "their", "there", "about", "then", "than", "they", "them", "also", "only", "such", "some", "more", "most", "each", "other", "being", "were", "been", "using", "used", "over", "under", "between", "because", "while", "does", "should", "could", "would", "these", "those", "into", "through", "explain", "describe", "please", "from", "material", "materials"
]);

function chunkText(name: string, text: string): SourceChunk[] {
  const normalized = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/).map((p) => p.trim()).filter((p) => p.length >= 35);
  const sourceParts = paragraphs.length ? paragraphs : [normalized];
  const chunks: SourceChunk[] = [];
  let current = "";
  let section = 1;
  for (const paragraph of sourceParts) {
    if ((current + "\n" + paragraph).length > 1_200 && current) {
      chunks.push({ label: `S${chunks.length + 1}`, name, excerpt: current.slice(0, 1_200), score: 0 });
      current = "";
    }
    current += `${current ? "\n" : ""}${paragraph}`;
    if (current.length >= 1_000) {
      chunks.push({ label: `S${chunks.length + 1}`, name, excerpt: current.slice(0, 1_200), score: 0 });
      current = "";
      section++;
    }
  }
  if (current) chunks.push({ label: `S${chunks.length + 1}`, name, excerpt: current.slice(0, 1_200), score: 0 });
  return chunks;
}

function retrieve(materials: InputMaterial[], query: string): SourceChunk[] {
  const chunks = materials.flatMap((material) => chunkText(
    (material.name || "Uploaded material").slice(0, 180),
    (material.text || "").slice(0, MAX_CHARS_PER_MATERIAL)
  ));
  const terms = (query.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((term) => !STOP_WORDS.has(term));
  const uniquelyLabeled = chunks.map((chunk, index) => ({ ...chunk, label: `S${index + 1}` }));
  const scored = uniquelyLabeled.map((chunk) => {
    const haystack = chunk.excerpt.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 + (haystack.split(term).length - 1 > 1 ? 0.5 : 0) : 0), 0);
    return { ...chunk, score };
  }).sort((a, b) => b.score - a.score);
  const relevant = scored.filter((chunk) => chunk.score > 0);
  // Topic mapping needs broad coverage, so if no query-specific terms match, return a few real source chunks.
  const chosen = (relevant.length ? relevant : scored).slice(0, 12);
  let used = 0;
  return chosen.filter((chunk) => {
    if (used + chunk.excerpt.length > MAX_CONTEXT_CHARS) return false;
    used += chunk.excerpt.length;
    return true;
  });
}

function parseJsonFromModel(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The AI returned an invalid response. Please try again.");
  }
}

async function callGemini(prompt: string, json = false): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "replace_with_your_gemini_api_key") {
    throw new Error("Gemini is not configured yet. Add your API key to .env.local, then restart npm run dev.");
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: "application/json" } : {}) }
    }),
    signal: AbortSignal.timeout(50_000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini request failed (${response.status}).`;
    throw new Error(message.slice(0, 500));
  }
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned no text. Try a smaller or clearer document.");
  return text;
}

function sourceContext(chunks: SourceChunk[]): string {
  return chunks.map((chunk) => `[${chunk.label}] File: ${chunk.name}\nEvidence: ${chunk.excerpt}`).join("\n\n---\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body?.action || "");
    const materials = (Array.isArray(body?.materials) ? body.materials : [])
      .slice(0, MAX_MATERIALS)
      .map((item: InputMaterial) => ({ name: String(item?.name || "Uploaded material"), text: String(item?.text || "").slice(0, MAX_CHARS_PER_MATERIAL) }))
      .filter((item: InputMaterial) => item.text?.trim());
    if (!materials.length) return NextResponse.json({ error: "Upload at least one text-based study material first." }, { status: 400 });
    const totalChars = materials.reduce((sum: number, item: InputMaterial) => sum + (item.text?.length || 0), 0);
    if (totalChars > 180_000) return NextResponse.json({ error: "Your selected materials are too large for one AI request. Use fewer files or smaller chapters." }, { status: 413 });

    if (action === "topics") {
      const chunks = retrieve(materials, "main topics concepts definitions principles chapter headings learning objectives");
      if (!chunks.length) return NextResponse.json({ error: "No readable text was found in the uploaded materials." }, { status: 400 });
      const prompt = `You are GapFinder AI, an evidence-grounded study-material analyst. Use ONLY the source excerpts below. Do not add topics from general knowledge. Return valid JSON exactly as {"topics":[{"name":"...","summary":"...","source":"filename [S1]","evidence":"short exact quote from the source"}]}. Identify 4-10 distinct topics if evidence supports them, avoid duplicate topics, and keep summaries concise. Each topic MUST cite one source label and quote evidence that appears verbatim in that excerpt. If there is insufficient evidence, return fewer topics.\n\nSOURCE EXCERPTS:\n${sourceContext(chunks)}`;
      const answer = await callGemini(prompt, true);
      const parsed = parseJsonFromModel(answer) as { topics?: unknown[] };
      const topics = Array.isArray(parsed.topics) ? parsed.topics.slice(0, 10).map((item: any) => {
        const sourceLabel = String(item?.source || "");
        const cited = chunks.find((chunk) => sourceLabel.includes(chunk.label));
        return {
          name: String(item?.name || "Topic").slice(0, 120),
          summary: String(item?.summary || "").slice(0, 500),
          source: cited ? `${cited.name} [${cited.label}]` : "Source needs verification",
          evidence: String(item?.evidence || "").slice(0, 350)
        };
      }) : [];
      return NextResponse.json({ answer: JSON.stringify({ topics }), retrievedSources: chunks.map(({ label, name, excerpt }) => ({ label, name, excerpt })) });
    }

    if (action === "quiz") {
      const question = String(body?.question || "diagnostic quiz");
      const chunks = retrieve(materials, question + " definitions mechanisms examples causes effects applications");
      if (!chunks.length) return NextResponse.json({ error: "No readable source passages were found for quiz generation." }, { status: 400 });
      const prompt = `You are GapFinder AI, an assessment writer. Generate 5-8 multiple-choice diagnostic questions using ONLY the source excerpts below. Do not use outside facts. Return valid JSON exactly as {"questions":[{"topic":"...","question":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","source":"filename [S1]","evidence":"short exact quote"}]}. Each question must have exactly four plausible options and exactly one correct answer. answer is zero-based. Explain why the correct answer is supported by the excerpt. Cite a source label and include a short exact evidence quote for every question. Avoid questions whose answer is not directly supported by the source.\n\nSOURCE EXCERPTS:\n${sourceContext(chunks)}`;
      const answer = await callGemini(prompt, true);
      const parsed = parseJsonFromModel(answer) as { questions?: any[] };
      const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 8).filter((item) => item && typeof item.question === "string" && Array.isArray(item.options) && item.options.length === 4 && Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3).map((item) => {
        const sourceLabel = String(item.source || "");
        const cited = chunks.find((chunk) => sourceLabel.includes(chunk.label));
        return {
          topic: String(item.topic || "Uploaded material").slice(0, 120),
          question: String(item.question).slice(0, 700),
          options: item.options.map((option: unknown) => String(option).slice(0, 350)),
          answer: item.answer,
          explanation: String(item.explanation || "Review the cited passage to verify the answer.").slice(0, 700),
          source: cited ? `${cited.name} [${cited.label}]` : "Source needs verification",
          evidence: String(item.evidence || "").slice(0, 350)
        };
      }) : [];
      if (!questions.length) return NextResponse.json({ error: "The AI response did not contain valid source-grounded questions. Try another document." }, { status: 502 });
      return NextResponse.json({ answer: JSON.stringify({ questions }), retrievedSources: chunks.map(({ label, name, excerpt }) => ({ label, name, excerpt })) });
    }

    if (action === "explain") {
      const question = String(body?.question || "").trim().slice(0, 1_000);
      if (!question) return NextResponse.json({ error: "Enter a question first." }, { status: 400 });
      const chunks = retrieve(materials, question);
      if (!chunks.length || chunks.every((chunk) => chunk.score === 0)) {
        return NextResponse.json({ answer: "I could not find a relevant passage in your uploaded materials, so I cannot give a source-grounded answer. Try the wording from your notes or upload the relevant chapter.", retrievedSources: [] });
      }
      const prompt = `You are GapFinder AI's study assistant. Answer the student's question using ONLY the supplied source excerpts. Do not use general knowledge or invent missing facts. If the excerpts do not support the answer, clearly say what is missing. Cite claims with the exact source labels such as [S1]. Do not claim a source says something unless the excerpt supports it.\n\nSTUDENT QUESTION:\n${question}\n\nSOURCE EXCERPTS:\n${sourceContext(chunks)}`;
      const answer = await callGemini(prompt, false);
      return NextResponse.json({ answer, retrievedSources: chunks.map(({ label, name, excerpt }) => ({ label, name, excerpt })) });
    }

    return NextResponse.json({ error: "Unknown AI action. Supported actions are topics, quiz, and explain." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected AI server error.";
    return NextResponse.json({ error: message.slice(0, 700) }, { status: 500 });
  }
}
