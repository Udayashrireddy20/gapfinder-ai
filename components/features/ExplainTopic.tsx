
"use client";

import { useMemo, useState } from "react";
import type { StudyMaterial } from "./StudyMaterial";

type ExplainTopicProps = {
  materials: StudyMaterial[];
};

export default function ExplainTopic({ materials }: ExplainTopicProps) {
  const [topic, setTopic] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("all");

  const availableTopics = useMemo(() => {
    const headings: string[] = [];

    for (const material of materials) {
      const matches = material.text.match(
        /^(?:#{1,6}\s+.+|(?:chapter|unit|module|topic)\s*[\d.:-]*\s*.+)$/gim
      );

      if (matches) {
        for (const heading of matches) {
          headings.push(
            heading
              .replace(/^#{1,6}\s*/, "")
              .replace(/^(chapter|unit|module|topic)\s*[\d.:-]*\s*/i, "")
              .trim()
          );
        }
      }
    }

    return Array.from(new Set(headings.filter(Boolean)));
  }, [materials]);

  const results = useMemo(() => {
    const query = (topic || search).trim().toLowerCase();

    if (!query) return [];

    return materials
      .filter(
        (material) =>
          selectedMaterial === "all" || material.id === selectedMaterial
      )
      .flatMap((material) => {
        const paragraphs = material.text
          .split(/\n{2,}/)
          .map((text) => text.trim())
          .filter(Boolean);

        return paragraphs
          .filter((paragraph) => paragraph.toLowerCase().includes(query))
          .slice(0, 5)
          .map((paragraph) => ({
            document: material.name,
            text: paragraph,
          }));
      })
      .slice(0, 10);
  }, [materials, topic, search, selectedMaterial]);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Explain This Topic</h2>
        <p className="mt-1 text-sm text-gray-500">
          Find relevant passages in your uploaded study materials.
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No study materials available</p>
          <p className="mt-2 text-sm text-gray-500">
            Upload notes or a textbook extract to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 rounded-xl border p-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Choose a detected topic</span>
              <select
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setSearch("");
                }}
                className="w-full rounded-lg border p-3"
              >
                <option value="">Choose a topic (optional)</option>
                {availableTopics.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Or search your material</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setTopic("");
                }}
                placeholder="Enter a topic or keyword..."
                className="w-full rounded-lg border p-3"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Search within</span>
              <select
                value={selectedMaterial}
                onChange={(event) => setSelectedMaterial(event.target.value)}
                className="w-full rounded-lg border p-3"
              >
                <option value="all">All uploaded documents</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Relevant material</h3>

            {!topic.trim() && !search.trim() ? (
              <p className="rounded-xl border p-5 text-sm text-gray-500">
                Choose a topic or enter a keyword to find relevant passages.
              </p>
            ) : results.length === 0 ? (
              <p className="rounded-xl border p-5 text-sm text-gray-500">
                No matching passages were found. Try a shorter keyword or
                another topic. This assistant does not invent an explanation
                when your uploaded material contains no matching passage.
              </p>
            ) : (
              results.map((result, index) => (
                <article key={`${result.document}-${index}`} className="rounded-xl border p-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-700">
                    Source: {result.document}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {result.text}
                  </p>
                </article>
              ))
            )}
          </div>

          <p className="text-xs text-gray-500">
            This initial version retrieves matching text passages. It is not
            yet a generative AI assistant and does not paraphrase or explain
            concepts beyond what the source passages say.
          </p>
        </>
      )}
    </section>
  );
}
