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
import { ArrowLeft, Play, Pause, Clock, Calendar } from "lucide-react";

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/campaigns/${campaignId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      {/* Candidate Info */}
      <div>
        <h1 className="text-3xl font-bold">{candidateName}</h1>
        <p className="text-muted-foreground">{candidateEmail}</p>
        <p className="text-sm text-muted-foreground mt-1">{campaignTitle}</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        {interview.duration_seconds && (
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(interview.duration_seconds)}
          </Badge>
        )}
        {interview.started_at && (
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(interview.started_at).toLocaleDateString()}
          </Badge>
        )}
        <Badge variant="default" className="text-sm py-1 px-3">
          Completed
        </Badge>
      </div>

      {/* Audio Player */}
      {recordingUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recording</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {interview.ai_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transcript</CardTitle>
          <CardDescription>
            Full conversation between the AI interviewer and the candidate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!interview.transcript || interview.transcript.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transcript available.
            </p>
          ) : (
            <div className="space-y-4">
              {interview.transcript.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        entry.role === "ai"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {entry.role === "ai" ? "AI" : candidateName.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {entry.role === "ai" ? "Interviewer" : candidateName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
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
