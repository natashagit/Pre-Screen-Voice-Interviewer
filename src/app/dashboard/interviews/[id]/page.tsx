import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { InterviewReview } from "./interview-review";

export default async function InterviewReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: interview } = await supabase
    .from("interviews")
    .select(
      `
      *,
      candidates(name, email, campaign_id, campaigns(title))
    `
    )
    .eq("id", id)
    .single();

  if (!interview) notFound();

  // Get signed URL for recording if exists
  let recordingUrl: string | null = null;
  if (interview.recording_path) {
    const { data } = await supabase.storage
      .from("recordings")
      .createSignedUrl(interview.recording_path, 3600);
    recordingUrl = data?.signedUrl ?? null;
  }

  const candidate = interview.candidates as {
    name: string;
    email: string;
    campaign_id: string;
    campaigns: { title: string };
  };

  return (
    <InterviewReview
      interview={interview}
      candidateName={candidate.name}
      candidateEmail={candidate.email}
      campaignTitle={candidate.campaigns.title}
      campaignId={candidate.campaign_id}
      recordingUrl={recordingUrl}
    />
  );
}
