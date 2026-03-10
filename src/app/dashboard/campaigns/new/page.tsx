"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  GripVertical,
  Rocket,
} from "lucide-react";

const DEFAULT_QUESTIONS = [
  "Tell me about yourself and what you're currently working on.",
  "What caught your eye about this role?",
  "What's your availability and timeline?",
];

const STEPS = [
  { label: "Details", icon: Sparkles },
  { label: "Questions", icon: MessageSquare },
  { label: "Review", icon: CheckCircle2 },
];

export default function NewCampaignPage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<string[]>(DEFAULT_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function nextStep() {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, 2));
  }

  function prevStep() {
    setDirection("backward");
    setStep((s) => Math.max(s - 1, 0));
  }

  function addQuestion() {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion("");
    }
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null) return;
    const updated = [...questions];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setQuestions(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  async function handleCreate() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          recruiter_id: user.id,
          title,
          description: description || null,
          questions,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.push(`/dashboard/campaigns/${data.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create campaign"
      );
      setLoading(false);
    }
  }

  const canProceedFromStep0 = title.trim().length > 0;
  const canProceedFromStep1 = questions.length > 0;

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Top bar with step indicator */}
      <div className="mb-10">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to campaigns
        </button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-serif tracking-tight">
            Create Campaign
          </h1>
          <span className="text-xs text-muted-foreground font-mono tracking-wider uppercase">
            Step {step + 1} of 3
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mt-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;

            return (
              <button
                key={i}
                onClick={() => {
                  if (i < step) {
                    setDirection("backward");
                    setStep(i);
                  }
                }}
                className={`flex items-center gap-2 flex-1 py-2.5 px-3 rounded-lg text-left transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                    ? "bg-primary/15 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive
                      ? "text-primary-foreground"
                      : isComplete
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="text-xs font-medium tracking-wide">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content with animation */}
      <div ref={containerRef} className="flex-1 relative">
        <div
          key={step}
          className={`${
            direction === "forward"
              ? "animate-in fade-in slide-in-from-right-4"
              : "animate-in fade-in slide-in-from-left-4"
          } duration-300`}
        >
          {/* Step 1: Campaign Details */}
          {step === 0 && (
            <div className="max-w-lg">
              <div className="mb-8">
                <h2 className="text-lg font-serif tracking-tight mb-1">
                  Campaign Details
                </h2>
                <p className="text-sm text-muted-foreground">
                  Give your campaign a name so you can identify it later.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Campaign Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. Frontend Developer — March 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 text-base bg-transparent border-border/60 focus-visible:border-primary/40 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Description{" "}
                    <span className="normal-case tracking-normal text-muted-foreground/60">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this hiring campaign..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="text-base bg-transparent border-border/60 focus-visible:border-primary/40 resize-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Questions */}
          {step === 1 && (
            <div className="max-w-xl">
              <div className="mb-8">
                <h2 className="text-lg font-serif tracking-tight mb-1">
                  Interview Questions
                </h2>
                <p className="text-sm text-muted-foreground">
                  The AI interviewer will ask these conversationally. Drag to
                  reorder.
                </p>
              </div>

              <div className="space-y-1.5 mb-6">
                {questions.map((q, i) => (
                  <div
                    key={`${i}-${q.slice(0, 20)}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={handleDragEnd}
                    className={`group flex items-start gap-2 rounded-lg border px-3 py-3 transition-all duration-200 ${
                      dragIndex === i
                        ? "opacity-40 scale-[0.98]"
                        : dragOverIndex === i
                        ? "border-primary/30 bg-primary/[0.03]"
                        : "border-transparent hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="pt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground/50 pt-0.5 w-5 shrink-0 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm flex-1 leading-relaxed pt-px">
                      {q}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all mt-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new question */}
              <div className="flex gap-2 items-start">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a new question and press Enter..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addQuestion();
                      }
                    }}
                    className="h-11 pr-10 bg-transparent border-dashed border-border/60 focus-visible:border-solid focus-visible:border-primary/40 transition-all"
                  />
                  {newQuestion.trim() && (
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground/50 mt-3">
                {questions.length} question{questions.length !== 1 && "s"} — the
                interview will take roughly{" "}
                {Math.max(3, questions.length * 1.5).toFixed(0)}–
                {Math.max(5, questions.length * 2).toFixed(0)} minutes
              </p>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 2 && (
            <div className="max-w-xl">
              <div className="mb-8">
                <h2 className="text-lg font-serif tracking-tight mb-1">
                  Review & Launch
                </h2>
                <p className="text-sm text-muted-foreground">
                  Everything look good? You can edit these after creation too.
                </p>
              </div>

              <div className="space-y-6">
                {/* Campaign summary */}
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <div className="px-5 py-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Campaign
                      </span>
                      <button
                        onClick={() => {
                          setDirection("backward");
                          setStep(0);
                        }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <h3 className="text-base font-serif tracking-tight mt-1">
                      {title}
                    </h3>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-border/60" />

                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {questions.length} Interview Question
                        {questions.length !== 1 && "s"}
                      </span>
                      <button
                        onClick={() => {
                          setDirection("backward");
                          setStep(1);
                        }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {questions.map((q, i) => (
                        <div key={i} className="flex gap-2.5 items-start">
                          <span className="text-xs font-mono text-muted-foreground/50 pt-0.5 w-5 shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <p className="text-sm leading-relaxed">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Estimated details */}
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Est. Duration
                    </p>
                    <p className="text-sm font-medium mt-0.5">
                      {Math.max(3, questions.length * 1.5).toFixed(0)}–
                      {Math.max(5, questions.length * 2).toFixed(0)} min
                    </p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">AI Voice</p>
                    <p className="text-sm font-medium mt-0.5">Alex (Alloy)</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Link Expiry</p>
                    <p className="text-sm font-medium mt-0.5">48 hours</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      {/* Footer navigation */}
      <div className="flex items-center justify-between pt-8 mt-8 border-t border-border/40">
        <div>
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={prevStep}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="text-muted-foreground"
          >
            Cancel
          </Button>

          {step < 2 ? (
            <Button
              onClick={nextStep}
              disabled={
                (step === 0 && !canProceedFromStep0) ||
                (step === 1 && !canProceedFromStep1)
              }
              className="min-w-[120px] gap-1.5"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="min-w-[160px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Rocket className="h-3.5 w-3.5" />
                  Launch Campaign
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
