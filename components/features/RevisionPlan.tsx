
"use client";

import { useMemo, useState } from "react";

type RevisionPlanProps = {
  topics?: {
    topic: string;
    level: "Weak" | "Medium" | "Strong";
    percentage: number;
  }[];
};

export default function RevisionPlan({ topics = [] }: RevisionPlanProps) {
  const [availableDays, setAvailableDays] = useState(7);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [completed, setCompleted] = useState<string[]>([]);

  const plan = useMemo(() => {
    const priority = { Weak: 1, Medium: 2, Strong: 3 };

    const sorted = [...topics].sort(
      (a, b) =>
        priority[a.level] - priority[b.level] ||
        a.percentage - b.percentage
    );

    const totalMinutes = availableDays * hoursPerDay * 60;
    const topicMinutes = sorted.length
      ? Math.floor(totalMinutes / sorted.length)
      : 0;

    return sorted.map((topic, index) => ({
      ...topic,
      day: Math.min(availableDays, index + 1),
      minutes: topicMinutes,
      activity:
        topic.level === "Weak"
          ? "Review notes, relearn key concepts, then practise questions."
          : topic.level === "Medium"
          ? "Revise important concepts and solve additional practice questions."
          : "Complete a short recall test and review difficult details.",
    }));
  }, [topics, availableDays, hoursPerDay]);

  function toggleCompleted(topic: string) {
    setCompleted((previous) =>
      previous.includes(topic)
        ? previous.filter((item) => item !== topic)
        : [...previous, topic]
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Personalized Revision Plan</h2>
        <p className="mt-1 text-sm text-gray-500">
          Prioritize topics that need the most attention.
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-sm font-medium">
            Days available
          </span>
          <input
            type="number"
            min={1}
            max={90}
            value={availableDays}
            onChange={(event) =>
              setAvailableDays(
                Math.max(1, Math.min(90, Number(event.target.value) || 1))
              )
            }
            className="w-full rounded-lg border p-2"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium">
            Study hours per day
          </span>
          <input
            type="number"
            min={1}
            max={16}
            value={hoursPerDay}
            onChange={(event) =>
              setHoursPerDay(
                Math.max(1, Math.min(16, Number(event.target.value) || 1))
              )
            }
            className="w-full rounded-lg border p-2"
          />
        </label>
      </div>

      <div className="rounded-xl border p-5">
        <p className="text-sm text-gray-500">Total available study time</p>
        <p className="mt-1 text-2xl font-bold">
          {availableDays * hoursPerDay} hours
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {plan.length} topics in the current revision plan
        </p>
      </div>

      {plan.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">Your revision plan is waiting for results.</p>
          <p className="mt-2 text-sm text-gray-500">
            Complete a diagnostic quiz and connect your knowledge-gap report to
            this feature to generate a prioritized schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plan.map((item) => (
            <article key={item.topic} className="rounded-xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Day {item.day} · {item.minutes} minutes
                  </p>
                  <h3 className="mt-1 font-semibold">{item.topic}</h3>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    item.level === "Weak"
                      ? "bg-red-50 text-red-700"
                      : item.level === "Medium"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {item.level} · {item.percentage}%
                </span>
              </div>

              <p className="mt-3 text-sm text-gray-600">{item.activity}</p>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={completed.includes(item.topic)}
                  onChange={() => toggleCompleted(item.topic)}
                />
                Mark revision complete
              </label>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        This prototype divides available time evenly across topics while
        prioritizing weaker topics first. A later integration can allocate time
        according to topic difficulty and track progress across sessions.
      </p>
    </section>
  );
}
