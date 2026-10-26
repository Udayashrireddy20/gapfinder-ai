
"use client";

import type { StudyMaterial } from "./StudyMaterial";

type KnowledgeGapProps = {
  materials: StudyMaterial[];
  answers?: Record<number, number>;
  questions?: {
    topic: string;
    answer: number;
  }[];
};

type Level = "Weak" | "Medium" | "Strong";

export default function KnowledgeGap({
  materials,
  answers = {},
  questions = [],
}: KnowledgeGapProps) {
  const topics = Array.from(
    new Set(
      questions.map((question) => question.topic).filter(Boolean)
    )
  );

  const reports = topics.map((topic) => {
    const topicQuestions = questions
      .map((question, index) => ({ ...question, index }))
      .filter((question) => question.topic === topic);

    const attempted = topicQuestions.filter(
      (question) => answers[question.index] !== undefined
    );

    const correct = attempted.filter(
      (question) => answers[question.index] === question.answer
    ).length;

    const percentage =
      attempted.length === 0 ? 0 : (correct / attempted.length) * 100;

    let level: Level;
    let reason: string;

    if (attempted.length === 0) {
      level = "Weak";
      reason = "No quiz answers recorded for this topic yet.";
    } else if (percentage < 50) {
      level = "Weak";
      reason = `Correct answers: ${correct} of ${attempted.length}. Review this topic first.`;
    } else if (percentage < 80) {
      level = "Medium";
      reason = `Correct answers: ${correct} of ${attempted.length}. More practice is recommended.`;
    } else {
      level = "Strong";
      reason = `Correct answers: ${correct} of ${attempted.length}. Continue with occasional revision.`;
    }

    return { topic, level, reason, percentage };
  });

  const styles: Record<Level, string> = {
    Weak: "border-red-200 bg-red-50 text-red-700",
    Medium: "border-amber-200 bg-amber-50 text-amber-700",
    Strong: "border-green-200 bg-green-50 text-green-700",
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Knowledge Gap Report</h2>
        <p className="mt-1 text-sm text-gray-500">
          Understand which topics need attention based on your quiz performance.
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          Upload study materials to begin your knowledge assessment.
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p className="font-medium">Your topic report is not ready yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Complete a diagnostic quiz and connect its questions and answers to
            this report to identify your knowledge gaps.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article
              key={report.topic}
              className="rounded-xl border p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">{report.topic}</h3>
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-medium ${styles[report.level]}`}
                >
                  {report.level}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${
                    report.level === "Weak"
                      ? "bg-red-500"
                      : report.level === "Medium"
                      ? "bg-amber-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${report.percentage}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-gray-600">{report.reason}</p>
              <p className="mt-1 text-xs text-gray-500">
                Performance: {Math.round(report.percentage)}%
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Classification uses quiz accuracy: below 50% is Weak, 50–79% is Medium,
        and 80% or above is Strong. These thresholds are prototype defaults.
      </p>
    </section>
  );
}
