
"use client";

import { useMemo, useState } from "react";

type QuizAttempt = {
  id: string;
  date: string;
  score: number;
  total: number;
};

type ProgressDashboardProps = {
  attempts?: QuizAttempt[];
  currentScore?: number;
  totalQuestions?: number;
  onSaveAttempt?: (attempt: QuizAttempt) => void;
};

export default function ProgressDashboard({
  attempts = [],
  currentScore,
  totalQuestions,
  onSaveAttempt,
}: ProgressDashboardProps) {
  const [localAttempts, setLocalAttempts] = useState<QuizAttempt[]>(attempts);

  const history = useMemo(() => {
    return [...localAttempts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [localAttempts]);

  const latest = history[history.length - 1];

  const bestPercentage = history.length
    ? Math.max(...history.map((attempt) => (attempt.score / attempt.total) * 100))
    : 0;

  const improvement =
    history.length >= 2
      ? (history[history.length - 1].score / history[history.length - 1].total) *
          100 -
        (history[0].score / history[0].total) * 100
      : null;

  function saveCurrentAttempt() {
    if (
      currentScore === undefined ||
      totalQuestions === undefined ||
      totalQuestions <= 0
    ) {
      return;
    }

    const attempt: QuizAttempt = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      score: Math.max(0, Math.min(currentScore, totalQuestions)),
      total: totalQuestions,
    };

    setLocalAttempts((previous) => [...previous, attempt]);
    onSaveAttempt?.(attempt);
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Progress Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your quiz history and monitor your learning progress.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Quiz attempts</p>
          <p className="mt-2 text-3xl font-bold">{history.length}</p>
        </article>

        <article className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Best score</p>
          <p className="mt-2 text-3xl font-bold">
            {history.length ? `${Math.round(bestPercentage)}%` : "—"}
          </p>
        </article>

        <article className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Score improvement</p>
          <p className="mt-2 text-3xl font-bold">
            {improvement === null
              ? "—"
              : `${improvement > 0 ? "+" : ""}${Math.round(improvement)}%`}
          </p>
        </article>
      </div>

      {currentScore !== undefined && totalQuestions !== undefined && (
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Latest quiz result</h3>
          <p className="mt-2 text-sm text-gray-600">
            Score: {currentScore} out of {totalQuestions}
          </p>
          <button
            onClick={saveCurrentAttempt}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Save quiz attempt
          </button>
        </div>
      )}

      <div className="rounded-xl border p-5">
        <h3 className="font-semibold">Score history</h3>

        {history.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No saved attempts yet. Complete a diagnostic quiz and connect its
            results to this dashboard.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {history.map((attempt, index) => {
              const percentage = Math.round(
                (attempt.score / attempt.total) * 100
              );

              return (
                <article key={attempt.id} className="space-y-2">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>
                      Attempt {index + 1} ·{" "}
                      {new Date(attempt.date).toLocaleDateString()}
                    </span>
                    <span className="font-medium">
                      {attempt.score}/{attempt.total} ({percentage}%)
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {latest && (
          <p className="mt-4 text-xs text-gray-500">
            Most recent attempt: {new Date(latest.date).toLocaleString()}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Prototype note: attempts are held in component state and will reset on
        a full page refresh unless the parent saves them persistently.
      </p>
    </section>
  );
}
