import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { InterviewRoom } from "./interview-room";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Validate token
  const { data: link } = await supabase
    .from("interview_links")
    .select("*, candidates(id, name, campaign_id, campaigns(title, questions))")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">
            This interview link is invalid or has already been used.
          </p>
        </div>
      </div>
    );
  }

  // Check expiry
  const isExpired = new Date(link.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Link Expired</h1>
          <p className="text-muted-foreground">
            This interview link has expired. You can request a new one.
          </p>
          <a
            href={`/reschedule/${token}`}
            className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90"
          >
            Request Reschedule
          </a>
        </div>
      </div>
    );
  }

  const candidate = link.candidates as {
    id: string;
    name: string;
    campaign_id: string;
    campaigns: { title: string; questions: string[] };
  };

  return (
    <InterviewRoom
      token={token}
      candidateId={candidate.id}
      candidateName={candidate.name}
      campaignTitle={candidate.campaigns.title}
      questions={candidate.campaigns.questions}
    />
  );
}
