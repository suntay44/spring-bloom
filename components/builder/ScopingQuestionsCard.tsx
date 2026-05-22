"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { ScopingQuestion } from "@/lib/mock/messages";

interface ScopingQuestionsCardProps {
  content: string;
  questions: ScopingQuestion[];
  /** Called when user submits all answers */
  onSubmit?: (answers: Record<string, string>) => void;
}

export function ScopingQuestionsCard({ content, questions, onSubmit }: ScopingQuestionsCardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const current = questions[step]!;
  const total = questions.length;
  const isLast = step === total - 1;
  const canNext = (answers[current.id] ?? "").trim().length > 0;

  function handleChange(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function handleNext() {
    if (isLast) {
      setSubmitted(true);
      onSubmit?.(answers);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleAutoAnswer() {
    // Prefill a contextual placeholder answer so the user can just hit Submit
    const placeholders: Record<string, string> = {
      q1: "Yes, proceed.",
      q2: "The current filters are sufficient.",
      q3: "None for now, go ahead.",
    };
    const fallback = "Yes, that works.";
    handleChange(placeholders[current.id] ?? fallback);
  }

  // After submission: show answers summary inline
  if (submitted) {
    return (
      <div className="scoping-card scoping-card--answered">
        <div className="scoping-card-header">
          <span className="scoping-card-icon"><Sparkles size={14} /></span>
          <span className="scoping-card-title">Agent has questions for you</span>
          <span className="scoping-card-status scoping-card-status--done">Answered</span>
        </div>
        <p className="scoping-card-preamble">{content}</p>
        <ol className="scoping-answers-list">
          {questions.map((q) => (
            <li key={q.id} className="scoping-answer-item">
              <p className="scoping-answer-q">{q.text}</p>
              <p className="scoping-answer-a">{answers[q.id] ?? "—"}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="scoping-card">
      {/* Header */}
      <div className="scoping-card-header">
        <span className="scoping-card-icon"><Sparkles size={14} /></span>
        <span className="scoping-card-title">Agent has questions for you</span>
        <span className="scoping-card-status">Waiting for answers</span>
      </div>

      <p className="scoping-card-preamble">{content}</p>

      {/* Question body */}
      <div className="scoping-question-body">
        <p className="scoping-question-text">{current.text}</p>
        <textarea
          className="scoping-textarea"
          placeholder="Type your answer…"
          rows={3}
          value={answers[current.id] ?? ""}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="scoping-card-footer">
        <div className="scoping-nav">
          <button
            className="scoping-nav-btn"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            type="button"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="scoping-nav-label">Question {step + 1} of {total}</span>
          <button
            className="scoping-nav-btn"
            disabled={!canNext || isLast}
            onClick={() => setStep((s) => s + 1)}
            type="button"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="scoping-actions">
          <button className="scoping-btn-auto" onClick={handleAutoAnswer} type="button">
            Auto-answer
          </button>
          <button
            className="scoping-btn-submit"
            disabled={!canNext}
            onClick={handleNext}
            type="button"
          >
            {isLast ? "Submit" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
