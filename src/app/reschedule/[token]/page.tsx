"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function ReschedulePage() {
  const params = useParams();
  const token = params.token as string;
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(true);
  const [linkData, setLinkData] = useState<{
    id: string;
    candidate_id: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function validate() {
      const { data } = await supabase
        .from("interview_links")
        .select("id, candidate_id")
        .eq("token", token)
        .single();

      if (data) setLinkData(data);
      setValidating(false);
    }
    validate();
  }, [token, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkData) return;
    setLoading(true);
    setError("");

    try {
      // Deactivate old link
      await supabase
        .from("interview_links")
        .update({ is_active: false })
        .eq("id", linkData.id);

      // Create new link
      const { data: newLink, error: linkError } = await supabase
        .from("interview_links")
        .insert({ candidate_id: linkData.candidate_id })
        .select()
        .single();

      if (linkError) throw linkError;

      // Save reschedule request
      await supabase.from("reschedule_requests").insert({
        candidate_id: linkData.candidate_id,
        original_link_id: linkData.id,
        new_link_id: newLink.id,
        reason: reason || null,
      });

      // Update candidate status
      await supabase
        .from("candidates")
        .update({ status: "rescheduled" })
        .eq("id", linkData.candidate_id);

      setSubmitted(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to request reschedule"
      );
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">
            This link is not valid. Please contact the recruiter.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Reschedule Requested</h1>
          <p className="text-muted-foreground">
            A new interview link has been generated. The recruiter will send you
            a new invitation email shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Request Reschedule</CardTitle>
          <CardDescription>
            Can&apos;t make it? We&apos;ll generate a new interview link for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Let us know why you need to reschedule..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Request New Link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
