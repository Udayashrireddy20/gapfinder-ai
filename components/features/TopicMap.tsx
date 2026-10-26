
"use client";

import { useMemo } from "react";
import type { StudyMaterial } from "./StudyMaterial";

type TopicMapProps = {
  materials: StudyMaterial[];
};

export default function TopicMap({ materials }: TopicMapProps) {
  const topics = useMemo(() => {
    const found = new Map<string, string>();

    for (const material of materials) {
      const headings = material.text.match(
        /^(?:#{1,6}\s+.+|(?:chapter|unit|module|topic)\s*[\d.:-]*\s*.+)$/gim
      );

      if (headings) {
        for (const heading of headings) {
          const topic = heading
            .replace(/^#{1,6}\s*/, "")
            .replace(/^(chapter|unit|module|topic)\s*[\d.:-]*\s*/i, "")
            .trim();

          if (topic.length > 2) {
            found.set(topic.toLowerCase(), topic);
          }
        }
      }
    }

    return Array.from(found.values());
  }, [materials]);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Topic Map</h2>
        <p className="mt-1 text-sm text-gray-500">
          Topics detected from your uploaded study materials.
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No study materials uploaded yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Upload your notes or syllabus in Study Materials first.
          </p>
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p className="font-medium">No clear topic headings detected</p>
          <p className="mt-2 text-sm text-gray-500">
            Add headings such as “Chapter 1: Introduction” or Markdown headings
            beginning with # to your materials.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic, index) => (
            <article
              key={topic}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 font-semibold text-blue-700">
                {index + 1}
              </div>
              <h3 className="font-medium">{topic}</h3>
              <p className="mt-1 text-xs text-gray-500">
                Detected from uploaded content
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        This initial version detects explicit headings; it does not yet use AI
        to infer topics from ordinary paragraphs.
      </p>
    </section>
  );
}
