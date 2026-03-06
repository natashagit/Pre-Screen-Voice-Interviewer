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
}: {
  token: string;
  linkId: string;
  candidateId: string;
  candidateName: string;
  campaignTitle: string;
}) {
  const [state, setState] = useState<InterviewState>("lobby");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAiText, setCurrentAiText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const supabase = createClient();

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentAiText]);

  const stopInterview = useCallback(async () => {
    setState("ended");

    // Close WebRTC
    if (dcRef.current) dcRef.current.close();
    if (pcRef.current) pcRef.current.close();
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    cancelAnimationFrame(animFrameRef.current);

    // Stop recording
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Mark link as used
    await supabase
      .from("interview_links")
      .update({ used_at: new Date().toISOString(), is_active: false })
      .eq("id", linkId);

    // Update candidate status
    await supabase
      .from("candidates")
      .update({ status: "interview_completed" })
      .eq("id", candidateId);

    // Wait for recording to finalize, then upload
    setTimeout(async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      const fileName = `${candidateId}/${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(fileName, audioBlob);

      // Save interview record
      const finalTranscript = [...transcript];
      if (currentAiText) {
        finalTranscript.push({
          role: "ai",
          content: currentAiText,
          timestamp: Date.now() - startTimeRef.current,
        });
      }

      const interviewData: Record<string, unknown> = {
        candidate_id: candidateId,
        link_id: linkId,
        recording_path: uploadError ? null : fileName,
        transcript: finalTranscript,
        duration_seconds: duration,
        started_at: new Date(startTimeRef.current).toISOString(),
        completed_at: new Date().toISOString(),
      };

      if (interviewId) {
        await supabase
          .from("interviews")
          .update(interviewData)
          .eq("id", interviewId);
      } else {
        await supabase.from("interviews").insert(interviewData);
      }
    }, 1000);
  }, [linkId, candidateId, supabase, transcript, currentAiText, interviewId]);

  async function startInterview() {
    setState("connecting");

    try {
      // Create interview record
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

      // Update candidate status
      await supabase
        .from("candidates")
        .update({ status: "interview_started" })
        .eq("id", candidateId);

      // Get ephemeral token
      const sessionRes = await fetch("/api/interview-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, candidateId }),
      });
      const sessionData = await sessionRes.json();

      if (!sessionData.client_secret?.value) {
        throw new Error("Failed to get session token");
      }

      // Set up WebRTC
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up audio output
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Audio level visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      function updateLevel() {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      }
      updateLevel();

      // Start recording
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000);

      // Data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data);

        if (event.type === "response.audio_transcript.delta") {
          setCurrentAiText((prev) => prev + (event.delta || ""));
        }

        if (event.type === "response.audio_transcript.done") {
          const text = event.transcript || "";
          if (text.trim()) {
            setTranscript((prev) => [
              ...prev,
              {
                role: "ai",
                content: text,
                timestamp: Date.now() - startTimeRef.current,
              },
            ]);
          }
          setCurrentAiText("");
        }

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

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 text-center border-b border-slate-700">
        <p className="text-sm text-slate-400">{campaignTitle}</p>
        <p className="text-sm text-slate-500">
          Welcome, {candidateName}
        </p>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {state === "lobby" && (
          <div className="text-center space-y-6 max-w-md">
            <div className="w-24 h-24 mx-auto rounded-full bg-slate-700 flex items-center justify-center">
              <Mic className="w-10 h-10 text-slate-300" />
            </div>
            <h1 className="text-2xl font-bold">Ready for your interview?</h1>
            <p className="text-slate-400">
              You&apos;ll be speaking with an AI interviewer. The conversation will
              take about 5-7 minutes. Make sure your microphone is working.
            </p>
            <Button
              size="lg"
              onClick={startInterview}
              className="bg-green-600 hover:bg-green-700"
            >
              <Phone className="mr-2 h-5 w-5" />
              Start Interview
            </Button>
          </div>
        )}

        {state === "connecting" && (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-slate-700 flex items-center justify-center animate-pulse">
              <Phone className="w-10 h-10 text-green-400" />
            </div>
            <p className="text-slate-400">Connecting...</p>
          </div>
        )}

        {state === "active" && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-6 flex-1">
            {/* AI Avatar with audio visualization */}
            <div className="relative">
              <div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center transition-transform duration-150"
                style={{
                  transform: `scale(${1 + audioLevel * 0.3})`,
                  boxShadow: `0 0 ${
                    40 + audioLevel * 60
                  }px rgba(99, 102, 241, ${0.3 + audioLevel * 0.4})`,
                }}
              >
                <span className="text-4xl font-bold">AI</span>
              </div>
            </div>

            {/* Live caption */}
            {currentAiText && (
              <div className="bg-slate-800/80 rounded-lg p-4 max-w-lg text-center">
                <p className="text-sm text-slate-300 italic">
                  &ldquo;{currentAiText}&rdquo;
                </p>
              </div>
            )}

            {/* Transcript */}
            <div className="flex-1 w-full overflow-y-auto max-h-[40vh] space-y-3 px-4">
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${
                    entry.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      entry.role === "user"
                        ? "bg-blue-600/40 text-blue-100"
                        : "bg-slate-700/60 text-slate-200"
                    }`}
                  >
                    <p className="text-xs text-slate-400 mb-1">
                      {entry.role === "ai" ? "Interviewer" : "You"}
                    </p>
                    {entry.content}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 pb-8">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleMute}
                className={`rounded-full w-14 h-14 ${
                  isMuted
                    ? "bg-red-600/20 border-red-500 text-red-400"
                    : "bg-slate-700 border-slate-600 text-white"
                }`}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              <Button
                size="lg"
                onClick={stopInterview}
                className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}

        {state === "ended" && (
          <div className="text-center space-y-4 max-w-md">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-600/20 flex items-center justify-center">
              <Phone className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Interview Complete!</h1>
            <p className="text-slate-400">
              Thank you for your time, {candidateName}. Your interview has been
              recorded and the recruiter will review it shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
