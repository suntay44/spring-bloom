"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { ScopingQuestion } from "@/lib/mock/messages";

interface ScopingQuestionsCardProps {
  /** Intro sentence shown above the questions (e.g. "To make sure I build exactly what you need…") */
  content: string;
  questions: ScopingQuestion[];
  /** Called when user submits all answers */
  onSubmit: (answers: Record<string, string>) => void;
  /** Called when user clicks "Skip" — build immediately without answers */
  onSkip?: () => void;
}

export function ScopingQuestionsCard({
  content,
  questions,
  onSubmit,
  onSkip,
}: ScopingQuestionsCardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const current = questions[step]!;
  const total = questions.length;
  const isLast = step === total - 1;
  const currentAnswer = answers[current.id] ?? "";
  const canNext = currentAnswer.trim().length > 0;

  function handleChoice(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function handleOtherText(text: string) {
    setOtherText((prev) => ({ ...prev, [current.id]: text }));
    setAnswers((prev) => ({ ...prev, [current.id]: text }));
  }

  function handleTextAnswer(text: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: text }));
  }

  function handleNext() {
    if (isLast) {
      setSubmitted(true);
      onSubmit(answers);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  // ── Submitted state — show compact summary ───────────────────────────────────
  if (submitted) {
    return (
      <div className="scoping-card scoping-card--answered">
        <div className="scoping-card-header">
          <span className="scoping-card-icon"><Sparkles size={14} /></span>
          <span className="scoping-card-title">Questions answered</span>
          <span className="scoping-card-status scoping-card-status--done">✓ Done</span>
        </div>
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

  const isChoice = current.type === "choice" && (current.options?.length ?? 0) > 0;

  return (
    <div className="scoping-card">
      {/* Header */}
      <div className="scoping-card-header">
        <span className="scoping-card-icon"><Sparkles size={14} /></span>
        <span className="scoping-card-title">Questions</span>
      </div>

      {/* Intro sentence — only on first question */}
      {step === 0 && content && (
        <p className="scoping-card-preamble">{content}</p>
      )}

      {/* Question */}
      <div className="scoping-question-body">
        <p className="scoping-question-text">{current.text}</p>

        {isChoice ? (
          /* ── Radio-button choices (Lovable style) ── */
          <div className="scoping-options">
            {current.options!.map((opt) => {
              const selected = currentAnswer === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`scoping-option ${selected ? "scoping-option--selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={current.id}
                    value={opt.value}
                    checked={selected}
                    onChange={() => handleChoice(opt.value)}
                    className="scoping-option-radio"
                  />
                  <span className="scoping-option-radio-custom" />
                  <span className="scoping-option-body">
                    <span className="scoping-option-label">{opt.label}</span>
                    {opt.description && (
                      <span className="scoping-option-desc">{opt.description}</span>
                    )}
                  </span>
                </label>
              );
            })}

            {/* "Other" free-text option — always available for choice questions */}
            <label className={`scoping-option ${currentAnswer === "__other__" || (currentAnswer && !current.options!.some(o => o.value === currentAnswer) && !["__other__"].includes(currentAnswer)) ? "scoping-option--selected" : ""}`}>
              <input
                type="radio"
                name={current.id}
                value="__other__"
                checked={currentAnswer === "__other__" || (!!currentAnswer && !current.options!.some(o => o.value === currentAnswer))}
                onChange={() => {
                  handleChoice("__other__");
                  setAnswers((prev) => ({ ...prev, [current.id]: otherText[current.id] ?? "" }));
                }}
                className="scoping-option-radio"
              />
              <span className="scoping-option-radio-custom" />
              <span className="scoping-option-body">
                <span className="scoping-option-label">Other</span>
                <input
                  type="text"
                  placeholder="Type your answer…"
                  className="scoping-other-input"
                  value={otherText[current.id] ?? ""}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoice("__other__");
                  }}
                  onChange={(e) => handleOtherText(e.target.value)}
                />
              </span>
            </label>
          </div>
        ) : (
          /* ── Free-text answer ── */
          <textarea
            className="scoping-textarea"
            placeholder="Type your answer…"
            rows={3}
            value={currentAnswer}
            onChange={(e) => handleTextAnswer(e.target.value)}
          />
        )}
      </div>

      {/* Footer — Back · dots · Next */}
      <div className="scoping-card-footer">
        <button
          className="scoping-nav-btn-labeled"
          disabled={step === 0}
          onClick={handleBack}
          type="button"
        >
          Back
        </button>

        {/* Dot pagination */}
        <div className="scoping-dots">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`scoping-dot ${i === step ? "scoping-dot--active" : ""} ${answers[questions[i]!.id] ? "scoping-dot--done" : ""}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onSkip && step === 0 && (
            <button
              className="scoping-btn-skip"
              onClick={onSkip}
              type="button"
            >
              Skip
            </button>
          )}
          <button
            className="scoping-btn-next"
            disabled={!canNext}
            onClick={handleNext}
            type="button"
          >
            {isLast ? "Build it →" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
