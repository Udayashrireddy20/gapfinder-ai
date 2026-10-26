"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowRight, BookOpen, BrainCircuit, Check, ChevronDown, ChevronRight,
  CircleHelp, ClipboardList, CloudUpload, FileText, GraduationCap, LayoutDashboard,
  Lightbulb, ListChecks, Menu, Plus, Search, ShieldCheck, Sparkles, Target,
  Trash2, Upload, X, Clock3, BarChart3, RefreshCw, Download, CheckCircle2, AlertCircle, MessageCircle, Send, UserRound, LockKeyhole, LogIn
} from "lucide-react";

type PageName = "Study Materials" | "AI Topic Mapping" | "Diagnostic Quiz" | "Knowledge Gap Analysis" | "Personalized Revision Planner" | "Explain This Topic Assistant" | "Progress Dashboard" | "Secure Authentication and Document Management";
type Material = { id: string; name: string; size: number; type: string; text: string; addedAt: string };
type QuizQuestion = { topic: string; question: string; options: string[]; answer: number; explanation: string; source?: string; evidence?: string };

const NAV: { name: PageName; icon: typeof LayoutDashboard; hint: string }[] = [
  { name: "Study Materials", icon: BookOpen, hint: "Upload and organize your resources" },
  { name: "AI Topic Mapping", icon: BrainCircuit, hint: "Map topics detected in your materials" },
  { name: "Diagnostic Quiz", icon: ClipboardList, hint: "Check what you know" },
  { name: "Knowledge Gap Analysis", icon: Target, hint: "Understand which topics need attention" },
  { name: "Personalized Revision Planner", icon: ListChecks, hint: "Turn weak areas into a study plan" },
  { name: "Explain This Topic Assistant", icon: MessageCircle, hint: "Find explanations in your uploaded materials" },
  { name: "Progress Dashboard", icon: LayoutDashboard, hint: "Track your learning activity and results" },
  { name: "Secure Authentication and Document Management", icon: ShieldCheck, hint: "Manage your demo workspace and account access" }
];

const QUESTIONS: QuizQuestion[] = [
  { topic: "Active recall", question: "Which study method best checks whether you can retrieve information without looking at your notes?", options: ["Re-reading a chapter repeatedly", "Active recall with practice questions", "Highlighting every paragraph", "Copying notes word for word"], answer: 1, explanation: "Active recall makes you retrieve information from memory, helping reveal what you know and what needs more practice." },
  { topic: "Spaced repetition", question: "What is the main idea behind spaced repetition?", options: ["Study everything once the night before", "Review material at increasing intervals", "Avoid reviewing difficult topics", "Read the same page continuously"], answer: 1, explanation: "Spaced repetition schedules reviews over time to strengthen long-term retention." },
  { topic: "Concept mapping", question: "A useful concept map primarily shows…", options: ["Only a list of definitions", "Relationships between concepts", "The number of pages in a book", "A student's typing speed"], answer: 1, explanation: "Concept maps make links and dependencies between ideas visible." },
  { topic: "Metacognition", question: "After a quiz, what is the most useful next step?", options: ["Ignore incorrect answers", "Review mistakes and identify the underlying misconception", "Repeat only questions you got right", "Stop studying the topic permanently"], answer: 1, explanation: "Error analysis helps you understand why an answer was wrong and choose a targeted next step." },
  { topic: "Learning goals", question: "Which is the clearest learning goal?", options: ["Study more", "Understand everything", "Explain three causes of a process from memory", "Read when possible"], answer: 2, explanation: "A specific, observable goal makes progress easier to assess." }
];

const seedGaps = [
  { topic: "Active recall", mastery: 42, priority: "High", action: "Complete 10 retrieval questions" },
  { topic: "Spaced repetition", mastery: 58, priority: "Medium", action: "Schedule two short review sessions" },
  { topic: "Concept mapping", mastery: 73, priority: "Low", action: "Connect the main concepts in a map" }
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function extractTopics(text: string) {
  const words = (text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []);
  const stop = new Set(["that","this","with","from","have","will","your","into","when","then","than","they","them","their","what","which","where","there","about","also","such","more","most","some","each","other","being","were","been","using","used","over","under","between","because","while","does","should","could","would","these","those","very","only","make","made","like","chapter","figure","table","page","example"]);
  const count = new Map<string, number>();
  for (const w of words) if (!stop.has(w)) count.set(w, (count.get(w) || 0) + 1);
  return [...count.entries()].sort((a,b) => b[1]-a[1]).slice(0,8).map(([word]) => word[0].toUpperCase()+word.slice(1));
}

export default function Home() {
  const [activeNav, setActiveNav] = useState<PageName>("Progress Dashboard");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizMessage, setQuizMessage] = useState("");
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);
  const [gapFilter, setGapFilter] = useState("All");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantSource, setAssistantSource] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [aiTopics, setAiTopics] = useState<{name:string;summary:string;source:string;evidence:string}[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsMessage, setTopicsMessage] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [demoSignedIn, setDemoSignedIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gapfinder-materials-v1");
      if (raw) setMaterials(JSON.parse(raw) as Material[]);
      const tasks = localStorage.getItem("gapfinder-tasks-v1");
      if (tasks) setCheckedTasks(JSON.parse(tasks) as string[]);
    } catch { /* Ignore invalid local browser data and keep the app usable. */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("gapfinder-materials-v1", JSON.stringify(materials)); } catch {
      setUploadMessage("Browser storage is full. Remove a large document and try again.");
    }
  }, [materials]);

  useEffect(() => {
    try { localStorage.setItem("gapfinder-tasks-v1", JSON.stringify(checkedTasks)); } catch { /* optional persistence */ }
  }, [checkedTasks]);

  const allText = materials.map(m => m.text).filter(Boolean).join("\n");
  const extractedTopics = useMemo(() => extractTopics(allText), [allText]);
  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const activeQuestions = aiQuestions.length ? aiQuestions : QUESTIONS;
  const quizScore = answers.reduce((sum, answer, i) => sum + (answer === activeQuestions[i]?.answer ? 1 : 0), 0);
  const gaps = useMemo(() => {
    // After a completed quiz, calculate mastery from the student's actual answers by topic.
    if (quizDone && answers.length === activeQuestions.length && activeQuestions.length > 0) {
      const byTopic = new Map<string, { correct: number; total: number }>();
      activeQuestions.forEach((question, index) => {
        const key = question.topic || "Uncategorized topic";
        const current = byTopic.get(key) || { correct: 0, total: 0 };
        current.total += 1;
        if (answers[index] === question.answer) current.correct += 1;
        byTopic.set(key, current);
      });
      return [...byTopic.entries()].map(([topic, result]) => {
        const mastery = Math.round((result.correct / result.total) * 100);
        return {
          topic, mastery,
          priority: mastery < 50 ? "High" : mastery < 80 ? "Medium" : "Low",
          action: mastery < 50 ? "Re-study the cited source and retry practice questions" : mastery < 80 ? "Review mistakes and complete 5 practice questions" : "Use spaced retrieval to maintain mastery"
        };
      }).sort((a, b) => a.mastery - b.mastery);
    }
    // Before assessment, clearly treated as a provisional starting estimate—not measured mastery.
    if (!extractedTopics.length) return seedGaps;
    return extractedTopics.slice(0, 6).map((topic, i) => ({
      topic, mastery: [38, 51, 63, 72, 45, 58][i % 6],
      priority: ([38,51,63,72,45,58][i % 6] < 50 ? "High" : [38,51,63,72,45,58][i % 6] < 65 ? "Medium" : "Low"),
      action: ["Write a short explanation from memory", "Create 5 practice questions", "Review and summarize the key idea"][i % 3]
    }));
  }, [extractedTopics, quizDone, answers, activeQuestions]);

  async function readMaterial(file: File): Promise<Material> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let text = "";
    if (["txt", "md", "csv"].includes(ext)) {
      text = await file.text();
    } else if (ext === "pdf") {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      // Use a same-origin worker shipped by the installed pdfjs-dist package.
      // If the browser cannot load the worker, show a clear message instead of silently pretending extraction worked.
      const workerUrl = "/pdf.worker.min.mjs";
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      const pages: string[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        pages.push(content.items.map((item: unknown) => {
          if (item && typeof item === "object" && "str" in item) return String((item as {str: unknown}).str);
          return "";
        }).join(" "));
      }
      text = pages.join("\n");
    } else if (ext === "docx") {
      const mammoth = await import("mammoth/mammoth.browser");
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      text = result.value;
    } else {
      throw new Error("Supported formats are PDF, DOCX, TXT, MD, and CSV.");
    }
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name, size: file.size, type: ext.toUpperCase(), text: text.trim(),
      addedAt: new Date().toISOString()
    };
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setUploadMessage("");
    const additions: Material[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        errors.push(`${file.name}: larger than 15 MB`);
        continue;
      }
      try {
        additions.push(await readMaterial(file));
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : "could not be read"}`);
      }
    }
    if (additions.length) {
      setMaterials(prev => [...additions, ...prev]);
      setUploadMessage(`${additions.length} file${additions.length === 1 ? "" : "s"} added successfully${errors.length ? `; ${errors.length} could not be added` : ""}.`);
    } else {
      setUploadMessage(errors.join(" • ") || "No supported files were selected.");
    }
    setUploading(false);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void handleFiles(e.target.files);
    e.target.value = "";
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
  }
  function removeMaterial(id: string) {
    setMaterials(prev => prev.filter(m => m.id !== id));
  }
  function navigate(name: PageName) {
    setActiveNav(name); setMobileMenu(false); setSearch(""); setUploadMessage("");
  }
  function nextQuestion() {
    if (selected === null) return;
    const nextAnswers = [...answers.slice(0, quizIndex), selected];
    setAnswers(nextAnswers);
    if (quizIndex === activeQuestions.length - 1) setQuizDone(true);
    else { setQuizIndex(i => i + 1); setSelected(null); }
  }
  function resetQuiz() { setQuizIndex(0); setSelected(null); setAnswers([]); setQuizDone(false); }
  function toggleTask(task: string) {
    setCheckedTasks(prev => prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]);
  }
  function downloadReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      materials: materials.map(({ name, size, type, addedAt }) => ({ name, size, type, addedAt })),
      extractedTopics,
      knowledgeGaps: gaps,
      quiz: { completed: quizDone, score: quizDone ? quizScore : null, total: activeQuestions.length },
      revisionTasks: checkedTasks
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "gapfinder-learning-report.json"; a.click(); URL.revokeObjectURL(url);
  }

  const current = NAV.find(n => n.name === activeNav)!;

  function renderOverview() {
    return <div className="content-stack">
      <section className="welcome-card">
        <div className="welcome-copy">
          <div className="eyebrow light"><Sparkles size={14}/> PERSONALIZED LEARNING WORKSPACE</div>
          <h2>Learn with clarity.<br/><span>Improve with purpose.</span></h2>
          <p>Turn your study materials into a focused learning plan. Upload resources, test your understanding, and find the topics that deserve your attention.</p>
          <button className="btn btn-white" onClick={() => navigate("Study Materials")}>Add study materials <ArrowRight size={16}/></button>
        </div>
        <div className="welcome-art"><div className="orb orb-one"/><div className="orb orb-two"/><div className="art-card"><BrainCircuit size={32}/><span>Learning intelligence</span><strong>{materials.length ? `${materials.length} resource${materials.length === 1 ? "" : "s"} connected` : "Your learning journey"}</strong><div className="art-bars"><i/><i/><i/><i/><i/></div></div><div className="floating-chip"><CheckCircle2 size={15}/> Progress, made visible</div></div>
      </section>
      <div className="section-heading"><div><h3>Your learning overview</h3><p>A quick snapshot of your workspace.</p></div><button className="btn btn-outline" onClick={downloadReport}><Download size={15}/> Export report</button></div>
      <section className="stats-grid">
        <Stat icon={BookOpen} label="Study materials" value={materials.length.toString()} note="Resources in your workspace" tone="violet"/>
        <Stat icon={BrainCircuit} label="Topics detected" value={extractedTopics.length.toString()} note={materials.length ? "From your uploaded text" : "Upload a document to begin"} tone="blue"/>
        <Stat icon={Target} label="Knowledge gaps" value={gaps.filter(g => g.priority === "High").length.toString()} note="High-priority topics" tone="amber"/>
        <Stat icon={Activity} label="Quiz progress" value={quizDone ? `${quizScore}/${activeQuestions.length}` : `${answers.length}/${activeQuestions.length}`} note={quizDone ? "Diagnostic completed" : "Questions answered"} tone="green"/>
      </section>
      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><div><h3>Continue learning</h3><p>Pick up where you want to focus.</p></div><Sparkles size={18} className="muted-icon"/></div>
          <div className="action-list">
            <ActionRow icon={Upload} title="Add study materials" description="Bring your notes and course documents together" onClick={() => navigate("Study Materials")}/>
            <ActionRow icon={ClipboardList} title="Take a diagnostic quiz" description="Check your understanding with a quick assessment" onClick={() => navigate("Diagnostic Quiz")}/>
            <ActionRow icon={Target} title="Review knowledge gaps" description="Focus on topics that need more practice" onClick={() => navigate("Knowledge Gap Analysis")}/>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h3>Priority focus</h3><p>Suggested next steps based on your workspace.</p></div><Target size={18} className="muted-icon"/></div>
          {gaps.slice(0,3).map(g => <div className="focus-item" key={g.topic}><div className="focus-top"><span>{g.topic}</span><Priority priority={g.priority}/></div><div className="progress-track"><span style={{width:`${g.mastery}%`}}/></div><div className="focus-bottom"><span>{g.mastery}% confidence estimate</span><button onClick={() => navigate("Knowledge Gap Analysis")}>Review <ChevronRight size={13}/></button></div></div>)}
        </section>
      </div>
      <section className="panel bottom-note"><div className="note-icon"><ShieldCheck size={20}/></div><div><h3>Your workspace, your progress</h3><p>Files are processed in your browser for this demo. Your resources stay in this browser’s local storage and are not uploaded to a server.</p></div></section>
    </div>;
  }

  function renderMaterials() {
    return <div className="content-stack">
      <section className="page-intro"><div><span className="eyebrow"><BookOpen size={14}/> LEARNING LIBRARY</span><h2>Study materials</h2><p>Bring your notes, handouts, and reading material into one organized workspace.</p></div><div className="intro-badge"><ShieldCheck size={15}/> Processed in your browser</div></section>
      <div className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={e => {e.preventDefault(); setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        <div className="upload-icon"><CloudUpload size={28}/></div><h3>{uploading ? "Processing your files…" : "Drop your study materials here"}</h3><p>or choose files from your computer</p>
        <button className="btn btn-primary" disabled={uploading} onClick={() => inputRef.current?.click()}><Plus size={16}/> {uploading ? "Please wait…" : "Choose files"}</button>
        <input ref={inputRef} className="visually-hidden" type="file" multiple accept=".pdf,.docx,.txt,.md,.csv" onChange={onFileChange}/>
        <span className="file-hint">PDF, DOCX, TXT, MD or CSV · Maximum 15 MB per file</span>
      </div>
      {uploadMessage && <div className={`notice ${uploadMessage.includes("successfully") ? "notice-success" : "notice-warning"}`}><span>{uploadMessage.includes("successfully") ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>}</span>{uploadMessage}</div>}
      <div className="section-heading"><div><h3>Your library <span className="count-pill">{materials.length}</span></h3><p>Manage your uploaded learning resources.</p></div><div className="search-box"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"/></div></div>
      {filteredMaterials.length ? <div className="material-list">{filteredMaterials.map(m => <div className="material-row" key={m.id}><div className={`file-type-icon type-${m.type.toLowerCase()}`}><FileText size={21}/></div><div className="material-main"><strong>{m.name}</strong><span>{m.type} · {formatSize(m.size)} · Added {shortDate(m.addedAt)}</span><small>{m.text ? `${m.text.length.toLocaleString()} characters extracted` : "File added; no text was extracted"}</small></div><button className="icon-btn danger-hover" title={`Remove ${m.name}`} aria-label={`Remove ${m.name}`} onClick={() => removeMaterial(m.id)}><Trash2 size={17}/></button></div>)}</div> : <div className="empty-state"><div className="empty-icon"><FileText size={25}/></div><h3>{search ? "No matching materials" : "Your library is ready"}</h3><p>{search ? "Try another file name." : "Upload a PDF, Word document, or text file to start building your learning workspace."}</p><button className="btn btn-outline" onClick={() => inputRef.current?.click()}><Upload size={15}/> Upload your first file</button></div>}
      <div className="info-strip"><Lightbulb size={18}/><div><strong>How this works</strong><p>Text is extracted from supported files in your browser. Extracted keywords help populate the Topic Map and Knowledge Gaps sections. This demo is not a substitute for a full AI/LLM analysis service.</p></div></div>
    </div>;
  }

  async function generateAiTopics() {
    if (!materials.some((item) => item.text.trim())) {
      setTopicsMessage("Upload a text-based study document first.");
      return;
    }
    setTopicsLoading(true);
    setTopicsMessage("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topics", materials: materials.map(({name,text}) => ({name,text})) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI topic mapping failed.");
      const parsed = JSON.parse(result.answer);
      const nextTopics = Array.isArray(parsed.topics) ? parsed.topics : [];
      setAiTopics(nextTopics);
      setTopicsMessage(nextTopics.length ? `Gemini mapped ${nextTopics.length} topics from your uploaded material.` : "The AI did not return topics. Try another document.");
    } catch (error) {
      setTopicsMessage(error instanceof Error ? error.message : "AI topic mapping failed.");
    } finally { setTopicsLoading(false); }
  }

  function renderTopicMap() {
    const topics = aiTopics.length ? aiTopics.map((topic) => topic.name) : extractedTopics.length ? extractedTopics : ["Foundations", "Key concepts", "Applications", "Examples", "Review questions"];
    return <div className="content-stack">
      <PageIntro icon={BrainCircuit} title="Topic map" subtitle="Explore the main concepts in your materials and see how to organize your learning."/>
      <section className="panel"><div className="panel-head"><div><h3>Concept landscape</h3><p>{materials.length ? `Based on ${materials.length} resource${materials.length===1?"":"s"} in your library` : "Sample structure — upload study materials to personalize this map."}</p></div><button className="btn btn-primary" onClick={generateAiTopics} disabled={topicsLoading || !materials.length}><Sparkles size={15}/>{topicsLoading ? "Analyzing materials…" : "Generate AI topic map"}</button></div>
        {topicsMessage && <div className={`notice ${topicsMessage.includes("mapped") ? "notice-success" : "notice-warning"}`}>{topicsMessage}</div>}
        <div className="topic-canvas"><div className="topic-root"><GraduationCap size={19}/><div><strong>{materials.length ? "Your study collection" : "Learning foundations"}</strong><span>Central learning goal</span></div></div><div className="topic-branches">{topics.map((t,i)=><div className="topic-node" key={t}><div className={`topic-dot dot-${i%5}`}>{i+1}</div><div><strong>{t}</strong><span>{aiTopics[i] ? `${aiTopics[i].summary} · Source: ${aiTopics[i].source}` : materials.length ? "Keyword-based topic · generate AI map for source-backed summaries" : ["Core idea","Supporting concept","Practice area","Application","Reflection"][i%5]}</span>{aiTopics[i]?.evidence && <small className="topic-evidence">“{aiTopics[i].evidence}”</small>}</div><ChevronRight size={16}/></div>)}</div></div>
        <div className="info-strip"><Lightbulb size={18}/><div><strong>Source-grounded mapping</strong><p>{aiTopics.length ? "AI topic summaries include a source filename and evidence excerpt. Verify the extracted map against your original materials." : "The initial map uses local keyword extraction. Select Generate AI topic map to ask Gemini for subject-specific topics grounded in retrieved passages."}</p></div></div>
      </section>
    </div>;
  }

  async function generateAiQuiz() {
    if (!materials.some((item) => item.text.trim())) { setQuizMessage("Upload study materials before generating a source-grounded quiz."); return; }
    setQuizLoading(true); setQuizMessage("");
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quiz", question: "Generate a balanced diagnostic quiz from the uploaded material", materials: materials.map(({name,text}) => ({name,text})) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI quiz generation failed.");
      const parsed = JSON.parse(result.answer);
      const next = Array.isArray(parsed.questions) ? parsed.questions.filter((q: QuizQuestion) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3) : [];
      if (!next.length) throw new Error("The AI did not return valid quiz questions. Try again or upload clearer notes.");
      setAiQuestions(next); setQuizIndex(0); setSelected(null); setAnswers([]); setQuizDone(false); setQuizMessage(`Generated ${next.length} questions from your uploaded material.`);
    } catch (error) { setQuizMessage(error instanceof Error ? error.message : "AI quiz generation failed."); }
    finally { setQuizLoading(false); }
  }

  function renderQuiz() {
    const q = activeQuestions[quizIndex] ?? activeQuestions[0];
    return <div className="content-stack">
      <PageIntro icon={ClipboardList} title="Diagnostic quiz" subtitle="Generate a diagnostic quiz grounded in your uploaded notes, with source evidence for review."/>
      <section className="panel ai-quiz-tools"><div><strong>Quiz source</strong><p>{aiQuestions.length ? "Using AI-generated questions from your uploaded materials." : "Using the built-in sample quiz until you generate a material-specific assessment."}</p></div><button className="btn btn-primary" onClick={generateAiQuiz} disabled={quizLoading || !materials.length}><Sparkles size={15}/>{quizLoading ? "Generating questions…" : "Generate AI quiz from my notes"}</button></section>
      {quizMessage && <div className={`notice ${quizMessage.includes("Generated") ? "notice-success" : "notice-warning"}`}>{quizMessage}</div>}
      {!quizDone ? <section className="quiz-panel"><div className="quiz-top"><span className="eyebrow">{aiQuestions.length ? "MATERIAL-GROUNDED QUIZ" : "SAMPLE KNOWLEDGE CHECK"}</span><span className="quiz-count">Question {quizIndex+1} of {activeQuestions.length}</span></div><div className="quiz-progress"><span style={{width:`${((quizIndex+1)/activeQuestions.length)*100}%`}}/></div><span className="soft-tag">{q.topic}</span><h3 className="question-title">{q.question}</h3><div className="option-list">{q.options.map((option,i)=><button key={option} className={`quiz-option ${selected===i?"selected":""}`} onClick={()=>setSelected(i)}><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{option}</span>{selected===i&&<Check size={17}/>}</button>)}</div><div className="quiz-footer"><span>{quizIndex} answered so far</span><button className="btn btn-primary" disabled={selected===null} onClick={nextQuestion}>{quizIndex===activeQuestions.length-1?"Finish quiz":"Next question"} <ArrowRight size={16}/></button></div></section> : <section className="panel result-panel"><div className="result-icon"><CheckCircle2 size={30}/></div><span className="eyebrow">ASSESSMENT COMPLETE</span><h2>{quizScore} out of {activeQuestions.length}</h2><p>You answered {Math.round(quizScore/activeQuestions.length*100)}% of questions correctly. Use the review notes below to plan your next study session.</p><div className="answer-review">{activeQuestions.map((item,i)=><div className="review-row" key={`${item.topic}-${i}`}><div className={`review-mark ${answers[i]===item.answer?"correct":"incorrect"}`}>{answers[i]===item.answer?<Check size={14}/>:<X size={14}/>}</div><div><strong>{item.topic}</strong><p>{item.explanation}</p>{item.source && <small className="source-evidence">Source: {item.source}{item.evidence ? ` · “${item.evidence}”` : ""}</small>}</div></div>)}</div><div className="quiz-footer"><button className="btn btn-outline" onClick={resetQuiz}><RefreshCw size={15}/> Retake quiz</button><button className="btn btn-primary" onClick={() => navigate("Knowledge Gap Analysis")}>Review knowledge gaps <ArrowRight size={15}/></button></div></section>}
    </div>;
  }

  function renderGaps() {
    const visible = gaps.filter(g => gapFilter === "All" || g.priority === gapFilter);
    return <div className="content-stack"><PageIntro icon={Target} title="Knowledge gaps" subtitle="Use these estimates to choose what to study next. Confirm them with practice and your course requirements."/>
      <section className="stats-grid gap-stats"><Stat icon={Target} label="Topics to review" value={gaps.length.toString()} note="Current topic list" tone="violet"/><Stat icon={Activity} label="High priority" value={gaps.filter(g=>g.priority==="High").length.toString()} note="Start here" tone="amber"/><Stat icon={CheckCircle2} label="Quiz status" value={quizDone?"Complete":"Pending"} note={quizDone?`${quizScore}/${activeQuestions.length} correct`:"Take the diagnostic quiz"} tone="green"/></section>
      <section className="panel"><div className="panel-head"><div><h3>Recommended focus areas</h3><p>Estimates are heuristic until validated by more assessment data.</p></div><select className="filter-select" value={gapFilter} onChange={e=>setGapFilter(e.target.value)}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select></div>
      {visible.map(g=><div className="gap-row" key={g.topic}><div className="gap-main"><div className="gap-heading"><strong>{g.topic}</strong><Priority priority={g.priority}/></div><div className="progress-track"><span style={{width:`${g.mastery}%`}}/></div><div className="gap-meta"><span>Estimated confidence</span><strong>{g.mastery}%</strong></div><div className="gap-action"><Lightbulb size={15}/>{g.action}</div></div><button className="btn btn-outline compact" onClick={()=>navigate("Personalized Revision Planner")}>Plan review <ArrowRight size={14}/></button></div>)}
      </section>
      <div className="info-strip"><AlertCircle size={18}/><div><strong>Important note</strong><p>These are learning-support estimates generated from extracted keywords and sample heuristics, not a validated diagnostic model. Use quiz results and instructor feedback to confirm your priorities.</p></div></div>
    </div>;
  }

  function renderPlanner() {
    const tasks = [
      {day:"TODAY", title:"Review your most challenging topic", detail:gaps.find(g=>g.priority==="High")?.topic || "Active recall", duration:"20 min"},
      {day:"TOMORROW", title:"Practice retrieval without notes", detail:"Answer 5 questions from memory", duration:"15 min"},
      {day:"IN 3 DAYS", title:"Revisit and self-test", detail:"Check what you still remember", duration:"15 min"},
      {day:"IN 1 WEEK", title:"Consolidate your understanding", detail:"Summarize key ideas and open questions", duration:"25 min"}
    ];
    const ids = tasks.map(t=>`${t.day}-${t.title}`);
    const doneCount = ids.filter(id=>checkedTasks.includes(id)).length;
    return <div className="content-stack"><PageIntro icon={ListChecks} title="Revision planner" subtitle="A manageable revision routine based on retrieval practice and spaced review."/>
      <section className="planner-summary"><div><span className="eyebrow light">YOUR STUDY ROUTINE</span><h2>Small steps. Lasting progress.</h2><p>Mark each session complete as you work through your plan.</p></div><div className="planner-ring"><strong>{doneCount}/{tasks.length}</strong><span>completed</span></div></section>
      <section className="panel"><div className="panel-head"><div><h3>Upcoming sessions</h3><p>Suggested schedule — adjust it to your own deadlines.</p></div><Clock3 size={18} className="muted-icon"/></div><div className="task-list">{tasks.map((task,i)=>{const id=ids[i], done=checkedTasks.includes(id);return <label className={`task-row ${done?"task-done":""}`} key={id}><input type="checkbox" checked={done} onChange={()=>toggleTask(id)}/><span className="task-check">{done&&<Check size={14}/>}</span><span className="task-day">{task.day}</span><span className="task-copy"><strong>{task.title}</strong><small>{task.detail}</small></span><span className="task-duration">{task.duration}</span></label>})}</div></section>
      <section className="panel"><div className="panel-head"><div><h3>Build a better routine</h3><p>Simple strategies that support long-term retention.</p></div><Lightbulb size={18} className="muted-icon"/></div><div className="strategy-grid"><div><strong>Retrieve</strong><p>Close your notes and explain the idea in your own words.</p></div><div><strong>Space</strong><p>Return to important topics after a delay rather than cramming.</p></div><div><strong>Reflect</strong><p>Track mistakes and turn them into specific follow-up questions.</p></div></div></section>
    </div>;
  }

  function renderAssistant() {
    async function askFromMaterials() {
      const question = assistantQuestion.trim();
      if (!question) { setAssistantAnswer("Enter a topic or question first."); setAssistantSource(""); return; }
      if (!materials.length || !allText.trim()) { setAssistantAnswer("Upload a text-based PDF, DOCX, TXT, MD, or CSV study resource first."); setAssistantSource(""); return; }
      setAssistantLoading(true); setAssistantAnswer(""); setAssistantSource("");
      try {
        const response = await fetch("/api/ai", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "explain", question, materials: materials.map(({name,text}) => ({name,text})) })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "AI explanation failed.");
        setAssistantAnswer(result.answer);
        const sources = Array.isArray(result.retrievedSources) ? result.retrievedSources : [];
        setAssistantSource(sources.map((source: {label:string;name:string;excerpt:string}) => `[${source.label}] ${source.name}: ${source.excerpt}`).join("\n\n"));
      } catch (error) {
        setAssistantAnswer(error instanceof Error ? error.message : "AI explanation failed.");
      } finally { setAssistantLoading(false); }
    }
    return <div className="content-stack">
      <PageIntro icon={MessageCircle} title="Explain this topic assistant" subtitle="Ask questions answered by Gemini using retrieved passages from your uploaded study materials."/>
      <section className="panel">
        <div className="panel-head"><div><h3>Ask from your materials</h3><p>Answers are grounded in retrieved source passages and should include source labels.</p></div><Sparkles size={18} className="muted-icon"/></div>
        <label className="field-label" htmlFor="assistant-question">Your question or topic</label>
        <textarea id="assistant-question" className="assistant-input" value={assistantQuestion} onChange={e => setAssistantQuestion(e.target.value)} placeholder="For example: Explain the main causes of photosynthesis from my notes…" rows={4}/>
        <button className="btn btn-primary" onClick={askFromMaterials} disabled={assistantLoading}><Send size={15}/>{assistantLoading ? "Searching sources and asking Gemini…" : "Generate grounded explanation"}</button>
        {assistantAnswer && <div className="assistant-response"><strong><BookOpen size={16}/> AI explanation</strong><p>{assistantAnswer}</p>{assistantSource && <small>Retrieved source passages:
{assistantSource}</small>}</div>}
      </section>
      <div className="info-strip"><ShieldCheck size={18}/><div><strong>Grounding and privacy</strong><p>The Gemini key stays on the server. The app retrieves text passages and asks Gemini to answer only from that context. This is a lightweight retrieval pipeline, not a vector database; verify citations against your original files.</p></div></div>
    </div>;
  }

  function renderAccount() {
    function submitDemoAccount(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (!accountEmail.trim() || !accountPassword.trim()) return;
      setDemoSignedIn(true);
    }
    return <div className="content-stack">
      <PageIntro icon={LockKeyhole} title="Secure authentication and document management" subtitle="Demo account controls and a view of the documents stored in this browser."/>
      <section className="panel account-panel">
        <div className="account-icon"><UserRound size={24}/></div>
        <h3>{demoSignedIn ? "Demo workspace active" : "Access your learning workspace"}</h3>
        <p>{demoSignedIn ? `Signed in for this demo as ${accountEmail}.` : "Use the demo form to preview account access controls."}</p>
        {!demoSignedIn ? <form className="account-form" onSubmit={submitDemoAccount}>
          <label htmlFor="account-email">Email address</label>
          <input id="account-email" type="email" required value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="student@example.com"/>
          <label htmlFor="account-password">Password</label>
          <input id="account-password" type="password" required value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="Enter any demo password"/>
          <button className="btn btn-primary" type="submit"><LogIn size={15}/> Enter demo workspace</button>
        </form> : <button className="btn btn-outline" onClick={() => {setDemoSignedIn(false); setAccountPassword("");}}>Sign out of demo</button>}
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3>Document management</h3><p>Documents currently saved in this browser profile.</p></div><span className="soft-tag">{materials.length} files</span></div>
        {materials.length ? <div className="material-list">{materials.map(m => <div className="material-row" key={m.id}><div className="file-type-icon"><FileText size={20}/></div><div className="material-main"><strong>{m.name}</strong><span>{m.type} · {formatSize(m.size)}</span><small>{m.text.length.toLocaleString()} characters extracted</small></div><button className="icon-btn danger-hover" aria-label={`Remove ${m.name}`} onClick={() => removeMaterial(m.id)}><Trash2 size={16}/></button></div>)}</div> : <p className="account-note">No documents yet. Open Study Materials to upload your files.</p>}
      </section>
      <div className="notice notice-warning"><AlertCircle size={17}/> Important: this is a front-end demo sign-in, not real secure authentication. Documents are stored in local browser storage, not private per-user cloud storage. Connect Supabase Auth and Storage before claiming production security or deploying with real student data.</div>
    </div>;
  }

  function renderContent() {
    switch(activeNav) {
      case "Study Materials": return renderMaterials();
      case "AI Topic Mapping": return renderTopicMap();
      case "Diagnostic Quiz": return renderQuiz();
      case "Knowledge Gap Analysis": return renderGaps();
      case "Personalized Revision Planner": return renderPlanner();
      case "Explain This Topic Assistant": return renderAssistant();
      case "Progress Dashboard": return renderOverview();
      case "Secure Authentication and Document Management": return renderAccount();
      default: return renderOverview();
    }
  }

  return <div className="app-shell">
    {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMobileMenu(false)}/>}
    <aside className={`sidebar ${mobileMenu?"sidebar-open":""}`}>
      <div className="brand"><div className="brand-mark"><BrainCircuit size={23}/></div><div><strong>GapFinder <span>AI</span></strong><small>LEARNING INTELLIGENCE</small></div><button className="mobile-close" aria-label="Close menu" onClick={()=>setMobileMenu(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">{NAV.map(item=>{const Icon=item.icon;return <button key={item.name} className={`nav-item ${activeNav===item.name?"nav-active":""}`} onClick={()=>navigate(item.name)} aria-current={activeNav===item.name?"page":undefined}><Icon size={18}/><span>{item.name}</span>{activeNav===item.name&&<span className="active-indicator"/>}</button>})}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Lightbulb size={17}/></div><strong>Learning tip</strong><p>Short, spaced practice sessions often work better than one long cram session.</p><button onClick={()=>navigate("Personalized Revision Planner")}>Open revision plan <ArrowRight size={13}/></button></div><div className="profile-row"><div className="avatar">GF</div><div><strong>My workspace</strong><small>Personal learning space</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="Open navigation" onClick={()=>setMobileMenu(true)}><Menu size={21}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <strong>{activeNav}</strong></div></div><div className="topbar-right"><span className="status-pill"><span/> Workspace ready</span><button className="top-icon" title="Export learning report" onClick={downloadReport}><Download size={17}/></button><div className="top-avatar">GF</div></div></header>
      
<div className="page-wrap"><div className="page-title-row"><div><h1>{activeNav}</h1><p>{current.hint}</p></div><div className="today-label"><Clock3 size={15}/>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"}).replace(",", "")}</div></div>{renderContent()}<footer className="footer"><span>© {new Date().getFullYear()} GapFinder AI</span><span>Personalized learning workspace <span className="footer-dot">·</span> Hackathon demo</span></footer></div>

   </main>
  </div>;
}

function Stat({icon:Icon,label,value,note,tone}:{icon:typeof BookOpen;label:string;value:string;note:string;tone:string}) {
  return <div className="stat-card"><div className={`stat-icon tone-${tone}`}><Icon size={19}/></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div>;
}
function ActionRow({icon:Icon,title,description,onClick}:{icon:typeof BookOpen;title:string;description:string;onClick:()=>void}) {
  return <button className="action-row" onClick={onClick}><div className="action-icon"><Icon size={18}/></div><div><strong>{title}</strong><span>{description}</span></div><ArrowRight size={16}/></button>;
}
function Priority({priority}:{priority:string}) {
  return <span className={`priority priority-${priority.toLowerCase()}`}><span/>{priority} priority</span>;
}
function PageIntro({icon:Icon,title,subtitle}:{icon:typeof BookOpen;title:string;subtitle:string}) {
  return <section className="page-intro"><div><span className="eyebrow"><Icon size={14}/> GAPFINDER AI</span><h2>{title}</h2><p>{subtitle}</p></div></section>;
}
