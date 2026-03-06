"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, UserPlus, Send, Eye } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  interviews: { id: string; duration_seconds: number; completed_at: string }[];
  interview_links: {
    id: string;
    token: string;
    expires_at: string;
    is_active: boolean;
    used_at: string | null;
  }[];
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  questions: string[];
  created_at: string;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  invited: "default",
  link_expired: "destructive",
  rescheduled: "outline",
  interview_started: "default",
  interview_completed: "default",
};

export function CampaignDetail({
  campaign,
  candidates: initialCandidates,
}: {
  campaign: Campaign;
  candidates: Candidate[];
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  async function addCandidate() {
    if (!name.trim() || !email.trim()) return;
    setAdding(true);

    const { data, error } = await supabase
      .from("candidates")
      .insert({ campaign_id: campaign.id, name, email })
      .select("*, interviews(id, duration_seconds, completed_at), interview_links(id, token, expires_at, is_active, used_at)")
      .single();

    if (!error && data) {
      setCandidates([data, ...candidates]);
      setName("");
      setEmail("");
    }
    setAdding(false);
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as { name?: string; email?: string }[];
        const toInsert = rows
          .filter((r) => r.name && r.email)
          .map((r) => ({
            campaign_id: campaign.id,
            name: r.name!.trim(),
            email: r.email!.trim(),
          }));

        if (toInsert.length === 0) return;

        const { error } = await supabase
          .from("candidates")
          .insert(toInsert);

        if (!error) {
          router.refresh();
          window.location.reload();
        }
      },
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendInvite(candidate: Candidate) {
    setSending(candidate.id);

    // Create an interview link
    const { data: link, error: linkError } = await supabase
      .from("interview_links")
      .insert({ candidate_id: candidate.id })
      .select()
      .single();

    if (linkError || !link) {
      setSending(null);
      return;
    }

    // Send email via Resend
    const emailRes = await fetch("/api/send-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        token: link.token,
        campaignTitle: campaign.title,
      }),
    });

    if (!emailRes.ok) {
      // Deactivate the link if email failed
      await supabase
        .from("interview_links")
        .update({ is_active: false })
        .eq("id", link.id);
      setSending(null);
      return;
    }

    // Update candidate status to invited
    await supabase
      .from("candidates")
      .update({ status: "invited" })
      .eq("id", candidate.id);

    setCandidates(
      candidates.map((c) =>
        c.id === candidate.id
          ? {
              ...c,
              status: "invited",
              interview_links: [...c.interview_links, link],
            }
          : c
      )
    );
    setSending(null);
  }

  const completedCount = candidates.filter(
    (c) => c.status === "interview_completed"
  ).length;
  const invitedCount = candidates.filter(
    (c) => c.status === "invited"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          {campaign.description && (
            <p className="text-muted-foreground mt-1">
              {campaign.description}
            </p>
          )}
        </div>
        <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
          {campaign.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Candidates</CardDescription>
            <CardTitle className="text-2xl">{candidates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invited</CardDescription>
            <CardTitle className="text-2xl">{invitedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Add Candidates */}
      <Card>
        <CardHeader>
          <CardTitle>Add Candidates</CardTitle>
          <CardDescription>
            Add candidates manually or upload a CSV file (columns: name, email).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={addCandidate} disabled={adding}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Table */}
      <Card>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No candidates added yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Interview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium">
                      {candidate.name}
                    </TableCell>
                    <TableCell>{candidate.email}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[candidate.status] ?? "secondary"}>
                        {candidate.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {candidate.interviews.length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(
                            (candidate.interviews[0].duration_seconds || 0) / 60
                          )}{" "}
                          min
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {candidate.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendInvite(candidate)}
                            disabled={sending === candidate.id}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            {sending === candidate.id
                              ? "Sending..."
                              : "Send Invite"}
                          </Button>
                        )}
                        {candidate.interviews.length > 0 && (
                          <Link
                            href={`/dashboard/interviews/${candidate.interviews[0].id}`}
                          >
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
