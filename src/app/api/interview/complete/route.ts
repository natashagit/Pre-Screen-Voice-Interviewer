import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = formData.get("token");
  const interviewId = formData.get("interviewId");
  const transcriptRaw = formData.get("transcript");
  const durationRaw = formData.get("duration");
  const recording = formData.get("recording");

  if (
    typeof token !== "string" ||
    typeof interviewId !== "string" ||
    typeof transcriptRaw !== "string" ||
    typeof durationRaw !== "string"
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: link } = await supabase
    .from("interview_links")
    .select("id, candidate_id")
    .eq("token", token)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }

  const { data: interview } = await supabase
    .from("interviews")
    .select("id, link_id")
    .eq("id", interviewId)
    .single();

  if (!interview || interview.link_id !== link.id) {
    return NextResponse.json(
      { error: "Interview does not match link" },
      { status: 403 }
    );
  }

  let recordingPath: string | null = null;
  if (recording instanceof File && recording.size > 0) {
    const fileName = `${link.candidate_id}/${Date.now()}.webm`;
    const buffer = Buffer.from(await recording.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(fileName, buffer, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      console.error("Recording upload error:", uploadError);
    } else {
      recordingPath = fileName;
    }
  }

  const transcript = JSON.parse(transcriptRaw);
  const duration = parseInt(durationRaw, 10);

  const { error: updateInterviewError } = await supabase
    .from("interviews")
    .update({
      recording_path: recordingPath,
      transcript,
      duration_seconds: Number.isFinite(duration) ? duration : 0,
      completed_at: new Date().toISOString(),
    })
    .eq("id", interviewId);

  if (updateInterviewError) {
    console.error("Failed to update interview:", updateInterviewError);
    return NextResponse.json(
      { error: "Failed to save interview" },
      { status: 500 }
    );
  }

  const { error: candidateError } = await supabase
    .from("candidates")
    .update({ status: "interview_completed" })
    .eq("id", link.candidate_id);

  if (candidateError) {
    console.error("Failed to update candidate status:", candidateError);
  }

  const { error: linkError } = await supabase
    .from("interview_links")
    .update({ used_at: new Date().toISOString(), is_active: false })
    .eq("id", link.id);

  if (linkError) {
    console.error("Failed to update link:", linkError);
  }

  return NextResponse.json({ success: true, interviewId });
}
