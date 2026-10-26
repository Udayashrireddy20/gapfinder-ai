
"use client";

import { useMemo, useState } from "react";
import type { StudyMaterial } from "./StudyMaterial";

type DiagnosticQuizProps = {
  materials: StudyMaterial[];
};

type Question = {
  topic: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

function createQuestions(materials: StudyMaterial[]): Question[] {
  const questions: Question[] = [];

  for (const material of materials) {
    const sections = material.text
      .split(/\n(?=#{1,6}\s)|\n{2,}/)
      .map((section) => section.trim())
      .filter((section) => section.length > 60);

    for (const section of sections) {
      const topic =
        section.match(/^#{1,6}\s*(.+)$/m)?.[1]?.trim() ||
        section.match(/^(?:chapter|unit|topic)\s*[\d.:-]*\s*(.+)$/im)?.[1]?.trim() ||
        material.name;

      const sentences = section
        .replace(/^#{1,6}\s*.+$/gm, "")
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 35 && sentence.length <= 240);

      for (const sentence of sentences) {
        const answer = sentence.replace(/\s+/g, " ").trim();

        if (answer.length < 20) continue;

        const distractors = [
          "This topic is not discussed in the selected material.",
          "The material does not provide this information.",
          "This statement is not supported by the selected section.",
        ];

        questions.push({
          topic,
          question: `Which statement matches the uploaded material?`,
          options: [answer, ...distractors].sort(() => 0.5 - Math.random()),
          answer: -1,
          explanation: `Source: ${material.name}\nSection: ${topic}\nSupporting text: ${answer}`,
        });

        const created = questions[questions.length - 1];
        created.answer = created.options.indexOf(answer);

        if (questions.length >= 10) return questions;
      }
    }
  }

  return questions;
}

export default function DiagnosticQuiz({
  materials,
}: DiagnosticQuizProps) {
  const questions = useMemo(() => createQuestions(materials), [materials]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [index, setIndex] = useState(0);

  const score = questions.reduce(
    (total, question, questionIndex) =>
      total + (answers[questionIndex] === question.answer ? 1 : 0),
    0
  );

  const weakTopics = Array.from(
    new Set(
      questions
        .filter(
          (question, questionIndex) =>
            submitted && answers[questionIndex] !== question.answer
        )
        .map((question) => question.topic)
    )
  );

  function restartQuiz() {
    setAnswers({});
    setSubmitted(false);
    setIndex(0);
  }

  if (materials.length === 0) {
    return (
      <section className="rounded-xl border border-dashed p-8 text-center">
        <h2 className="text-xl font-semibold">Diagnostic Quiz</h2>
        <p className="mt-2 text-gray-500">
          Upload your study materials before starting the quiz.
        </p>
      </section>
    );
  }

  if (questions.length === 0) {
    return (
      <section className="rounded-xl border p-6">
        <h2 className="text-xl font-semibold">Diagnostic Quiz</h2>
        <p className="mt-2 text-gray-600">
          There is not enough readable text to create questions. Upload a text
          file or a PDF containing selectable text and explanatory sentences.
        </p>
      </section>
    );
  }

  const current = questions[index];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Diagnostic Quiz</h2>
        <p className="mt-1 text-sm text-gray-500">
          Questions are created from text in your uploaded materials.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4 rounded-xl border p-6">
          <h3 className="text-lg font-semibold">Your Results</h3>
          <p className="text-3xl font-bold">
            {score} / {questions.length}
          </p>
          <p className="text-gray-600">
            Score: {Math.round((score / questions.length) * 100)}%
          </p>

          <div>
            <h4 className="font-semibold">Topics to review</h4>
            {weakTopics.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {weakTopics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-green-700">
                You answered every question correctly.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {questions.map((question, questionIndex) => (
              <article key={questionIndex} className="rounded-lg bg-gray-50 p-4">
                <p className="font-medium">
                  {questionIndex + 1}. {question.question}
                </p>
                <p className="mt-2 text-sm">
                  Your answer:{" "}
                  {answers[questionIndex] === undefined
                    ? "Not answered"
                    : question.options[answers[questionIndex]]}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Correct answer: {question.options[question.answer]}
                </p>
                <p className="mt-2 whitespace-pre-line text-xs text-gray-500">
                  {question.explanation}
                </p>
              </article>
            ))}
          </div>

          <button
            onClick={restartQuiz}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="rounded-xl border p-6">
          <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            <span>{current.topic}</span>
          </div>

          <h3 className="text-lg font-semibold">{current.question}</h3>
          <p className="mt-2 text-sm text-gray-500">
            Select the statement that is supported by your study material.
          </p>

          <div className="mt-5 space-y-3">
            {current.options.map((option, optionIndex) => (
              <label
                key={optionIndex}
                className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${
                  answers[index] === optionIndex
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  checked={answers[index] === optionIndex}
                  onChange={() =>
                    setAnswers((previous) => ({
                      ...previous,
                      [index]: optionIndex,
                    }))
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <button
              onClick={() => setIndex((previous) => Math.max(0, previous - 1))}
              disabled={index === 0}
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
              Previous
            </button>

            {index < questions.length - 1 ? (
              <button
                onClick={() =>
                  setIndex((previous) =>
                    Math.min(questions.length - 1, previous + 1)
                  )
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-white"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(answers).length === 0}
                className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-40"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
