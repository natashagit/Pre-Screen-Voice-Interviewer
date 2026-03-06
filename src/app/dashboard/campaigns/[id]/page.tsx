import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CampaignDetail } from "./campaign-detail";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  const { data: candidates } = await supabase
    .from("candidates")
    .select(
      `
      *,
      interviews(id, duration_seconds, completed_at),
      interview_links(id, token, expires_at, is_active, used_at)
    `
    )
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  return (
    <CampaignDetail campaign={campaign} candidates={candidates ?? []} />
  );
}
