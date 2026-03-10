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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  UserPlus,
  Send,
  Eye,
  Plus,
  X,
  Pencil,
  GripVertical,
  Check,
  ArrowLeft,
  Users,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  interviews: { id: string; duration_seconds: number; completed_at: string; scorecard: { overall_score: number } | null }[];
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

const STATUS_COLORS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
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
  const [questions, setQuestions] = useState<string[]>(campaign.questions);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [editQuestions, setEditQuestions] = useState<string[]>(
    campaign.questions
  );
  const [newQuestion, setNewQuestion] = useState("");
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function startEditingQuestions() {
    setEditQuestions([...questions]);
    setNewQuestion("");
    setEditingQuestions(true);
  }

  function addEditQuestion() {
    if (newQuestion.trim()) {
      setEditQuestions([...editQuestions, newQuestion.trim()]);
      setNewQuestion("");
    }
  }

  function removeEditQuestion(index: number) {
    setEditQuestions(editQuestions.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, direction: "up" | "down") {
    const newArr = [...editQuestions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newArr.length) return;
    [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
    setEditQuestions(newArr);
  }

  async function saveQuestions() {
    if (editQuestions.length === 0) return;
    setSavingQuestions(true);

    const { error } = await supabase
      .from("campaigns")
      .update({ questions: editQuestions })
      .eq("id", campaign.id);

    if (!error) {
      setQuestions(editQuestions);
      setEditingQuestions(false);
    }
    setSavingQuestions(false);
  }

  async function addCandidate() {
    if (!name.trim() || !email.trim()) return;
    setAdding(true);

    const { data, error } = await supabase
      .from("candidates")
      .insert({ campaign_id: campaign.id, name, email })
      .select(
        "*, interviews(id, duration_seconds, completed_at), interview_links(id, token, expires_at, is_active, used_at)"
      )
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

        const { error } = await supabase.from("candidates").insert(toInsert);

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

    try {
      const { data: link, error: linkError } = await supabase
        .from("interview_links")
        .insert({ candidate_id: candidate.id })
        .select()
        .single();

      if (linkError || !link) {
        alert(`Failed to create interview link: ${linkError?.message || "Unknown error"}`);
        setSending(null);
        return;
      }

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

      const emailData = await emailRes.json().catch(() => ({}));

      if (!emailRes.ok) {
        alert(`Failed to send email: ${emailData.error || emailRes.statusText}`);
        await supabase
          .from("interview_links")
          .update({ is_active: false })
          .eq("id", link.id);
        setSending(null);
        return;
      }

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
    } catch (err) {
      console.error("sendInvite error:", err);
      alert(`Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}`);
      setSending(null);
    }
  }

  const [deleting, setDeleting] = useState(false);

  async function deleteCampaign() {
    setDeleting(true);
    // Delete candidates first (foreign key), then campaign
    await supabase.from("candidates").delete().eq("campaign_id", campaign.id);
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaign.id);
    if (!error) {
      router.push("/dashboard");
      router.refresh();
    }
    setDeleting(false);
  }

  const completedCount = candidates.filter(
    (c) => c.status === "interview_completed"
  ).length;
  const invitedCount = candidates.filter(
    (c) => c.status === "invited"
  ).length;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard")}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to campaigns
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">
            {campaign.title}
          </h1>
          {campaign.description && (
            <p className="text-muted-foreground mt-1.5 text-sm max-w-2xl">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Badge
            variant={campaign.status === "active" ? "default" : "secondary"}
          >
            {campaign.status}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete campaign</DialogTitle>
                <DialogDescription>
                  This will permanently delete <strong>{campaign.title}</strong> and
                  all {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} associated
                  with it. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={deleteCampaign}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete campaign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 sm:gap-10 py-4 px-1">
        {[
          { label: "Candidates", value: candidates.length },
          { label: "Invited", value: invitedCount },
          { label: "Completed", value: completedCount },
        ].map((stat, i) => (
          <div key={stat.label} className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif tracking-tight text-foreground">
              {stat.value}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Interview Questions */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif tracking-tight">
                Interview Questions
              </CardTitle>
              <CardDescription className="mt-1">
                Questions the AI interviewer will ask candidates.
              </CardDescription>
            </div>
            {!editingQuestions && (
              <Button
                variant="outline"
                size="sm"
                onClick={startEditingQuestions}
                className="gap-1.5"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingQuestions ? (
            <div className="space-y-3">
              {editQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <div className="flex flex-col gap-0.5 pt-2">
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, "up")}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                      disabled={i === 0}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M6 3L2 7h8L6 3z" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, "down")}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                      disabled={i === editQuestions.length - 1}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M6 9l4-4H2l4 4z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground mt-2 w-5 shrink-0 font-mono text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Textarea
                    value={q}
                    onChange={(e) => {
                      const updated = [...editQuestions];
                      updated[i] = e.target.value;
                      setEditQuestions(updated);
                    }}
                    rows={2}
                    className="flex-1 text-sm resize-none bg-transparent"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEditQuestion(i)}
                    className="mt-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Add a new question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEditQuestion();
                    }
                  }}
                  className="bg-transparent"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEditQuestion}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={saveQuestions}
                  disabled={savingQuestions || editQuestions.length === 0}
                  size="sm"
                  className="gap-1.5"
                >
                  <Check className="h-3 w-3" />
                  {savingQuestions ? "Saving..." : "Save Questions"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingQuestions(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No questions configured.
                </p>
              ) : (
                questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs font-mono text-muted-foreground/50 pt-0.5 w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm leading-relaxed">{q}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Candidates */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight">
            Add Candidates
          </CardTitle>
          <CardDescription className="mt-1">
            Add candidates manually or upload a CSV file (columns: name, email).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent"
              />
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent"
              />
              <Button onClick={addCandidate} disabled={adding} className="gap-1.5 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" />
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
                className="gap-1.5 w-full sm:w-auto"
              >
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight">
            Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No candidates added yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Interview</TableHead>
                  <TableHead className="hidden sm:table-cell">Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id} className="border-border/40">
                    <TableCell className="font-medium">
                      <div>{candidate.name}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{candidate.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {candidate.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_COLORS[candidate.status] ?? "secondary"
                        }
                      >
                        {candidate.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {candidate.interviews.length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(
                            (candidate.interviews[0].duration_seconds || 0) / 60
                          )}{" "}
                          min
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {candidate.interviews.length > 0 &&
                      candidate.interviews[0].scorecard ? (
                        <span className="text-sm font-medium">
                          {candidate.interviews[0].scorecard.overall_score}/5
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">
                          —
                        </span>
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
                            className="gap-1.5"
                          >
                            <Send className="h-3 w-3" />
                            {sending === candidate.id
                              ? "Sending..."
                              : "Send Invite"}
                          </Button>
                        )}
                        {candidate.interviews.length > 0 && (
                          <Link
                            href={`/dashboard/interviews/${candidate.interviews[0].id}`}
                          >
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Eye className="h-3 w-3" />
                              Review
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
