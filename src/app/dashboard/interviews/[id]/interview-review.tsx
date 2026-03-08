"use client";

import { useRef } from "react";
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
import { ArrowLeft, Clock, Calendar, Mic, User } from "lucide-react";

interface TranscriptEntry {
  role: "ai" | "user";
  content: string;
  timestamp: number;
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

      {/* AI Summary */}
      {interview.ai_summary && (
        <Card className="border-border/60 border-primary/15">
          <CardHeader>
            <CardTitle className="text-lg font-serif tracking-tight flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Mic className="h-3 w-3 text-primary" />
              </div>
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {interview.ai_summary}
            </p>
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
