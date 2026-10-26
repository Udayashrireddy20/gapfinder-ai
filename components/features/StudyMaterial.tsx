
"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const supportedExtensions = [".pdf", ".docx", ".doc", ".txt", ".md", ".csv"];

export type StudyMaterial = {
  id: string;
  name: string;
  type: string;
  text: string;
};

type StudyMaterialProps = {
  materials: StudyMaterial[];
  onMaterialsChange: (materials: StudyMaterial[]) => void;
};

function getExtension(file: File): string {
  const index = file.name.lastIndexOf(".");
  return index >= 0 ? file.name.slice(index).toLowerCase() : "";
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: "",
  });

  try {
    const pdf = await loadingTask.promise;
    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      text +=
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ") + "\n";
    }

    return text;
  } catch (error: unknown) {
    const details =
      error instanceof Error ? error.message : String(error);

    if (
      details.toLowerCase().includes("password") ||
      details.toLowerCase().includes("encrypted")
    ) {
      throw new Error(
        `${file.name}: this PDF may be password-protected. Upload an authorized, unlocked copy to continue.`
      );
    }

    throw new Error(`${file.name}: ${details}`);
  }
}

async function extractFileText(file: File): Promise<string> {
  const extension = getExtension(file);

  if (!supportedExtensions.includes(extension)) {
    throw new Error(`${file.name}: unsupported file type.`);
  }

  if ([".txt", ".md", ".csv"].includes(extension)) {
    return file.text();
  }

  if (extension === ".pdf") {
    return extractPdfText(file);
  }

  if (extension === ".docx" || extension === ".doc") {
    throw new Error(
      `${file.name}: Word document text extraction is not configured yet. Please upload a PDF, TXT, MD, or CSV file.`
    );
  }

  throw new Error(`${file.name}: unsupported file type.`);
}

export default function StudyMaterial({
  materials,
  onMaterialsChange,
}: StudyMaterialProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    setLoading(true);
    setMessage("");

    try {
      const added: StudyMaterial[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        try {
          const text = await extractFileText(file);

          if (!text.trim()) {
            errors.push(`${file.name}: no readable text found.`);
            continue;
          }

          added.push({
            id: crypto.randomUUID(),
            name: file.name,
            type: getExtension(file).slice(1),
            text,
          });
        } catch (error: unknown) {
          errors.push(
            error instanceof Error ? error.message : `${file.name}: upload failed.`
          );
        }
      }

      if (added.length > 0) {
        onMaterialsChange([...materials, ...added]);
      }

      const summary = [
        added.length > 0
          ? `Successfully added ${added.length} material(s).`
          : "",
        ...errors,
      ].filter(Boolean);

      setMessage(summary.join(" "));
    } catch (error: unknown) {
      console.error("Material upload failed:", error);
      setMessage(
        error instanceof Error ? error.message : "Upload failed unexpectedly."
      );
    } finally {
      setLoading(false);
    }
  }

  function removeMaterial(id: string) {
    onMaterialsChange(materials.filter((material) => material.id !== id));
  }

  return (
    <section className="feature-panel">
      <h2>Study Materials</h2>
      <p>Upload your notes, syllabus and question papers.</p>

      <label>
        <span>
          {loading ? "Processing files..." : "Choose PDF or text files"}
        </span>
        <input
          type="file"
          accept=".pdf,.txt,.md,.csv"
          multiple
          disabled={loading}
          onChange={(event) => {
            const files = event.currentTarget.files;
            void handleFiles(files);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}

      <h3>Your Library ({materials.length})</h3>

      {materials.length === 0 ? (
        <p>No materials uploaded yet.</p>
      ) : (
        <ul>
          {materials.map((material) => (
            <li key={material.id} style={{ marginBottom: 12 }}>
              <strong>{material.name}</strong>
              <p>{material.text.length.toLocaleString()} characters extracted</p>
              <button type="button" onClick={() => removeMaterial(material.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
