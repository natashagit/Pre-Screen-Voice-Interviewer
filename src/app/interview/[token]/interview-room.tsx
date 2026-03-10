"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

type InterviewState = "lobby" | "connecting" | "active" | "ended";

interface TranscriptEntry {
  role: "ai" | "user";
  content: string;
  timestamp: number;
}

export function InterviewRoom({
  token,
  linkId,
  candidateId,
  candidateName,
  campaignTitle,
  questions,
}: {
  token: string;
  linkId: string;
  candidateId: string;
  candidateName: string;
  campaignTitle: string;
  questions: string[];
}) {
  const [state, setState] = useState<InterviewState>("lobby");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAiText, setCurrentAiText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pendingAiTextRef = useRef<string>("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Timer
  useEffect(() => {
    if (state === "active") {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const stopInterview = useCallback(async () => {
    setState("ended");
    if (timerRef.current) clearInterval(timerRef.current);

    if (dcRef.current) dcRef.current.close();
    if (pcRef.current) pcRef.current.close();
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    cancelAnimationFrame(animFrameRef.current);

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

    await supabase
      .from("interview_links")
      .update({ used_at: new Date().toISOString(), is_active: false })
      .eq("id", linkId);

    await supabase
      .from("candidates")
      .update({ status: "interview_completed" })
      .eq("id", candidateId);

    const recordingBlob = await new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        return;
      }
      recorder.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };
      recorder.stop();
    });

    const fileName = `${candidateId}/${Date.now()}.webm`;
    let recordingPath: string | null = null;

    if (recordingBlob.size > 0) {
      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(fileName, recordingBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (!uploadError) {
        recordingPath = fileName;
      } else {
        console.error("Upload error:", uploadError);
      }
    }

    const finalTranscript = [...transcript];
    const remainingAiText = (pendingAiTextRef.current + " " + currentAiText).trim();
    if (remainingAiText) {
      finalTranscript.push({
        role: "ai",
        content: remainingAiText,
        timestamp: Date.now() - startTimeRef.current,
      });
    }

    const interviewData: Record<string, unknown> = {
      candidate_id: candidateId,
      link_id: linkId,
      recording_path: recordingPath,
      transcript: finalTranscript,
      duration_seconds: duration,
      started_at: new Date(startTimeRef.current).toISOString(),
      completed_at: new Date().toISOString(),
    };

    let savedInterviewId = interviewId;

    if (interviewId) {
      await supabase
        .from("interviews")
        .update(interviewData)
        .eq("id", interviewId);
    } else {
      const { data: inserted } = await supabase
        .from("interviews")
        .insert(interviewData)
        .select("id")
        .single();
      if (inserted) savedInterviewId = inserted.id;
    }

    // Trigger AI scorecard generation in background
    if (savedInterviewId && finalTranscript.length > 0) {
      fetch("/api/analyze-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId: savedInterviewId }),
      }).catch(console.error);
    }
  }, [linkId, candidateId, supabase, transcript, currentAiText, interviewId]);

  async function startInterview() {
    setState("connecting");

    try {
      const { data: interview } = await supabase
        .from("interviews")
        .insert({
          candidate_id: candidateId,
          link_id: linkId,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (interview) setInterviewId(interview.id);

      await supabase
        .from("candidates")
        .update({ status: "interview_started" })
        .eq("id", candidateId);

      const sessionRes = await fetch("/api/interview-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, candidateId, questions }),
      });
      const sessionData = await sessionRes.json();

      if (!sessionData.client_secret?.value) {
        throw new Error("Failed to get session token");
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioCtx = new AudioContext();
      const mixedDest = audioCtx.createMediaStreamDestination();

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        const aiSource = audioCtx.createMediaStreamSource(e.streams[0]);
        aiSource.connect(mixedDest);

        // AI audio level analyser
        const aiAnalyser = audioCtx.createAnalyser();
        aiAnalyser.fftSize = 256;
        aiSource.connect(aiAnalyser);
        aiAnalyserRef.current = aiAnalyser;
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const micSource = audioCtx.createMediaStreamSource(stream);
      micSource.connect(mixedDest);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      micSource.connect(analyser);
      analyserRef.current = analyser;

      function updateLevel() {
        if (!analyserRef.current) return;
        const micData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(micData);
        const micAvg = micData.reduce((a, b) => a + b, 0) / micData.length;
        setAudioLevel(micAvg / 255);

        if (aiAnalyserRef.current) {
          const aiData = new Uint8Array(aiAnalyserRef.current.frequencyBinCount);
          aiAnalyserRef.current.getByteFrequencyData(aiData);
          const aiAvg = aiData.reduce((a, b) => a + b, 0) / aiData.length;
          setAiSpeaking(aiAvg / 255 > 0.05);
        }

        animFrameRef.current = requestAnimationFrame(updateLevel);
      }
      updateLevel();

      const recorder = new MediaRecorder(mixedDest.stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data);

        // Streaming delta — show live as subtitle
        if (event.type === "response.audio_transcript.delta") {
          setCurrentAiText((prev) => prev + (event.delta || ""));
        }

        // Single audio item done — accumulate into pending turn text
        if (event.type === "response.audio_transcript.done") {
          const text = event.transcript || "";
          if (text.trim()) {
            pendingAiTextRef.current += (pendingAiTextRef.current ? " " : "") + text.trim();
          }
          setCurrentAiText("");
        }

        // Full response turn done — commit the accumulated text as one transcript entry
        if (event.type === "response.done") {
          if (pendingAiTextRef.current.trim()) {
            const fullText = pendingAiTextRef.current.trim();
            setTranscript((prev) => [
              ...prev,
              {
                role: "ai",
                content: fullText,
                timestamp: Date.now() - startTimeRef.current,
              },
            ]);
          }
          pendingAiTextRef.current = "";
          setCurrentAiText("");
        }

        // Capture user transcript for storage (not displayed to candidate)
        if (
          event.type ===
          "conversation.item.input_audio_transcription.completed"
        ) {
          const text = event.transcript || "";
          if (text.trim()) {
            setTranscript((prev) => [
              ...prev,
              {
                role: "user",
                content: text,
                timestamp: Date.now() - startTimeRef.current,
              },
            ]);
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-realtime",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${sessionData.client_secret.value}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // Wait for data channel to open, then trigger the AI to speak first
      dc.onopen = () => {
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["text", "audio"],
            },
          })
        );
      };

      startTimeRef.current = Date.now();
      setState("active");
    } catch (err) {
      console.error("Failed to start interview:", err);
      setState("lobby");
    }
  }

  function toggleMute() {
    if (audioStreamRef.current) {
      const track = audioStreamRef.current.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }

  // Only AI messages for display
  const aiMessages = transcript.filter((e) => e.role === "ai");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {campaignTitle}
          </p>
        </div>
        {state === "active" && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-slate-400">
              {formatTime(elapsedTime)}
            </span>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {state === "lobby" && (
          <div className="text-center space-y-8 max-w-lg">
            <div className="space-y-2">
              <p className="text-slate-500 text-sm">Welcome, {candidateName}</p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Your AI Interview
              </h1>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 space-y-4 text-left">
              <h3 className="text-sm font-medium text-slate-300">Before you begin</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-xs mt-0.5">1</span>
                  Find a quiet place with minimal background noise
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-xs mt-0.5">2</span>
                  Make sure your microphone is connected and working
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-xs mt-0.5">3</span>
                  The conversation takes about 5-7 minutes
                </li>
              </ul>
            </div>

            <Button
              size="lg"
              onClick={startInterview}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 text-base rounded-xl"
            >
              <Phone className="mr-2 h-5 w-5" />
              Start Interview
            </Button>
          </div>
        )}

        {state === "connecting" && (
          <div className="text-center space-y-6">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center">
                <Phone className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-slate-300 font-medium">Connecting to your interviewer...</p>
              <p className="text-slate-500 text-sm">Setting up a secure connection</p>
            </div>
          </div>
        )}

        {state === "active" && (
          <div className="w-full max-w-xl flex flex-col items-center flex-1 gap-4">
            {/* AI Avatar */}
            <div className="relative py-4">
              {/* Outer glow ring when AI speaks */}
              <div
                className="absolute inset-0 rounded-full transition-all duration-300"
                style={{
                  transform: `scale(${aiSpeaking ? 1.5 : 1.1})`,
                  background: `radial-gradient(circle, rgba(99, 102, 241, ${
                    aiSpeaking ? 0.15 : 0
                  }) 0%, transparent 70%)`,
                }}
              />
              {/* Pulse rings */}
              {aiSpeaking && (
                <>
                  <div className="absolute inset-[-12px] rounded-full border border-indigo-500/20 animate-ping" />
                  <div
                    className="absolute inset-[-6px] rounded-full border border-indigo-500/30"
                    style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite 0.3s" }}
                  />
                </>
              )}
              <div
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                  aiSpeaking
                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25"
                    : "bg-slate-800 border border-white/10"
                }`}
              >
                <span className="text-2xl font-bold text-white/90">A</span>
              </div>
            </div>

            <p className={`text-xs font-medium transition-colors ${
              aiSpeaking ? "text-indigo-400" : "text-slate-500"
            }`}>
              {aiSpeaking ? "Alex is speaking..." : "Listening to you..."}
            </p>

            {/* Current AI speech - live subtitle */}
            <div className="min-h-[80px] flex items-center justify-center w-full px-4">
              {currentAiText ? (
                <p className="text-center text-lg text-slate-200 leading-relaxed max-w-lg animate-in fade-in duration-200">
                  {currentAiText}
                </p>
              ) : aiMessages.length > 0 ? (
                <p className="text-center text-base text-slate-500 max-w-lg">
                  {aiMessages[aiMessages.length - 1].content}
                </p>
              ) : null}
            </div>

            {/* Question history - subtle, scrollable */}
            {aiMessages.length > 1 && (
              <div className="w-full flex-1 overflow-y-auto max-h-[30vh]">
                <div className="space-y-2 px-4">
                  {aiMessages.slice(0, -1).map((entry, i) => (
                    <div
                      key={i}
                      className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-4 py-3"
                    >
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
                <div ref={transcriptEndRef} />
              </div>
            )}

            {/* Mic level indicator + controls */}
            <div className="pt-4 pb-8 flex flex-col items-center gap-4">
              {/* Mic activity bar */}
              <div className="flex items-center gap-1 h-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(4, Math.min(16, audioLevel * 100 * Math.sin((i / 20) * Math.PI) * 2))}px`,
                      backgroundColor:
                        audioLevel > 0.05
                          ? `rgba(52, 211, 153, ${0.4 + audioLevel * 0.6})`
                          : "rgba(100, 116, 139, 0.3)",
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={toggleMute}
                  className={`rounded-full w-12 h-12 ${
                    isMuted
                      ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  size="lg"
                  onClick={stopInterview}
                  className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-500 text-white"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {state === "ended" && (
          <div className="text-center space-y-6 max-w-md">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Interview Complete</h1>
              <p className="text-slate-400 leading-relaxed">
                Great job, {candidateName}! Your interview has been recorded
                and the recruiter will review it soon. You can close this page now.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">{formatTime(elapsedTime)}</p>
                  <p className="text-xs text-slate-500">Duration</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">{aiMessages.length}</p>
                  <p className="text-xs text-slate-500">Questions</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
