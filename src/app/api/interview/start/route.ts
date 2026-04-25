import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: link, error: linkError } = await supabase
    .from("interview_links")
    .select("id, candidate_id, expires_at, is_active, used_at")
    .eq("token", token)
    .single();

  if (
    linkError ||
    !link ||
    !link.is_active ||
    link.used_at ||
    new Date(link.expires_at) < new Date()
  ) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 403 }
    );
  }

  const { data: interview, error: insertError } = await supabase
    .from("interviews")
    .insert({
      candidate_id: link.candidate_id,
      link_id: link.id,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !interview) {
    console.error("Failed to insert interview:", insertError);
    return NextResponse.json(
      { error: "Failed to start interview" },
      { status: 500 }
    );
  }

  const { error: candidateError } = await supabase
    .from("candidates")
    .update({ status: "interview_started" })
    .eq("id", link.candidate_id);

  if (candidateError) {
    console.error("Failed to update candidate status:", candidateError);
  }

  return NextResponse.json({ interviewId: interview.id });
}
