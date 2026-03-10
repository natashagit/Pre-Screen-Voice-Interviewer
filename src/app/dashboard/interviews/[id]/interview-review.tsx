"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Mic,
  User,
  Star,
  ThumbsUp,
  AlertTriangle,
  Quote,
  RefreshCw,
  ArrowUpRight,
  Minus,
  CheckCircle2,
} from "lucide-react";

interface TranscriptEntry {
  role: "ai" | "user";
  content: string;
  timestamp: number;
}

interface Scorecard {
  overall_score: number;
  communication_score: number;
  clarity_score: number;
  articulation_score: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: "Advance" | "Maybe" | "Pass";
  recommendation_reason: string;
  notable_quotes: string[];
}

export function InterviewReview({
  interview,
  candidateName,
  candidateEmail,
  campaignTitle,
  campaignId,
  recordingUrl,
}: {
  interview: {
    id: string;
    duration_seconds: number | null;
    transcript: TranscriptEntry[] | null;
    ai_summary: string | null;
    scorecard: Scorecard | null;
    started_at: string | null;
    completed_at: string | null;
  };
  candidateName: string;
  candidateEmail: string;
  campaignTitle: string;
  campaignId: string;
  recordingUrl: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(
    interview.scorecard
  );
  const [generating, setGenerating] = useState(false);

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function formatTimestamp(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function generateScorecard() {
    setGenerating(true);
    try {
      const res = await fetch("/api/analyze-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId: interview.id }),
      });
      const data = await res.json();
      if (data.scorecard) {
        setScorecard(data.scorecard);
      }
    } catch (err) {
      console.error("Failed to generate scorecard:", err);
    }
    setGenerating(false);
  }

  const recommendationConfig = {
    Advance: {
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: ArrowUpRight,
    },
    Maybe: {
      color: "text-amber-700 bg-amber-50 border-amber-200",
      icon: Minus,
    },
    Pass: {
      color: "text-red-700 bg-red-50 border-red-200",
      icon: AlertTriangle,
    },
  };

  function ScoreBar({ score, label }: { score: number; label: string }) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium">{score}/5</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(score / 5) * 100}%`,
              background:
                score >= 4
                  ? "#16a34a"
                  : score >= 3
                  ? "#8B6E4E"
                  : score >= 2
                  ? "#d97706"
                  : "#dc2626",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href={`/dashboard/campaigns/${campaignId}`}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to campaign
      </Link>

      {/* Candidate Info */}
      <div>
        <h1 className="text-3xl font-serif tracking-tight">
          {candidateName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{candidateEmail}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{campaignTitle}</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {interview.duration_seconds && (
          <Badge variant="outline" className="text-sm py-1.5 px-3 gap-1.5">
            <Clock className="h-3 w-3" />
            {formatDuration(interview.duration_seconds)}
          </Badge>
        )}
        {interview.started_at && (
          <Badge variant="outline" className="text-sm py-1.5 px-3 gap-1.5">
            <Calendar className="h-3 w-3" />
            {new Date(interview.started_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Badge>
        )}
        <Badge variant="default" className="text-sm py-1.5 px-3">
          Completed
        </Badge>
      </div>

      {/* Scorecard */}
      {scorecard ? (
        <div className="space-y-4">
          {/* Recommendation Banner */}
          <Card
            className={`border ${
              recommendationConfig[scorecard.recommendation]?.color ??
              "border-border/60"
            }`}
          >
            <CardContent className="py-5 px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {(() => {
                    const config =
                      recommendationConfig[scorecard.recommendation];
                    const Icon = config?.icon ?? Minus;
                    return (
                      <div className="mt-0.5">
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {scorecard.recommendation}
                      </span>
                      <span className="text-sm opacity-70">
                        &middot; {scorecard.overall_score}/5 overall
                      </span>
                    </div>
                    <p className="text-sm mt-0.5 opacity-80">
                      {scorecard.recommendation_reason}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateScorecard}
                  disabled={generating}
                  className="shrink-0 gap-1.5"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`}
                  />
                  {generating ? "Analyzing..." : "Regenerate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scores + Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scores */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif tracking-tight flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScoreBar
                  score={scorecard.overall_score}
                  label="Overall English Proficiency"
                />
                <ScoreBar
                  score={scorecard.communication_score}
                  label="Fluency & Flow"
                />
                <ScoreBar
                  score={scorecard.clarity_score}
                  label="Pronunciation & Clarity"
                />
                <ScoreBar
                  score={scorecard.articulation_score}
                  label="Vocabulary & Grammar"
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif tracking-tight">
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {scorecard.summary}
                </p>

                {/* Notable Quotes */}
                {scorecard.notable_quotes &&
                  scorecard.notable_quotes.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-border/40">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-2.5 flex items-center gap-1.5">
                        <Quote className="h-3 w-3" />
                        Notable quotes
                      </p>
                      <div className="space-y-2">
                        {scorecard.notable_quotes.map((q, i) => (
                          <p
                            key={i}
                            className="text-sm italic text-muted-foreground pl-3 border-l-2 border-primary/30"
                          >
                            &ldquo;{q}&rdquo;
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Strengths & Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif tracking-tight flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-emerald-600" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {scorecard.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif tracking-tight flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scorecard.concerns.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">
                    No concerns noted.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {scorecard.concerns.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Minus className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border-border/60 border-dashed">
          <CardContent className="py-8 text-center">
            <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {interview.transcript && interview.transcript.length > 0
                ? "No scorecard generated yet for this interview."
                : "No transcript available to analyze."}
            </p>
            {interview.transcript && interview.transcript.length > 0 && (
              <Button
                onClick={generateScorecard}
                disabled={generating}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
                />
                {generating ? "Analyzing..." : "Generate Scorecard"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audio Player */}
      {recordingUrl && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg font-serif tracking-tight">
              Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <audio
              ref={audioRef}
              controls
              className="w-full"
              src={recordingUrl}
            />
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-serif tracking-tight">
            Transcript
          </CardTitle>
          <CardDescription>
            Full conversation between the AI interviewer and the candidate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!interview.transcript || interview.transcript.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No transcript available.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {interview.transcript.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.role === "ai"
                          ? "bg-primary/15 text-primary"
                          : "bg-accent text-foreground"
                      }`}
                    >
                      {entry.role === "ai" ? (
                        <Mic className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {entry.role === "ai" ? "Interviewer" : candidateName}
                      </span>
                      <span className="text-xs text-muted-foreground/50 font-mono">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {entry.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
