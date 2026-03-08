import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mic, Users, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      candidates(count)
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your interview campaigns and candidates.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
            <Mic className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-serif tracking-tight mb-2">
            No campaigns yet
          </h2>
          <p className="text-muted-foreground text-sm mb-6 text-center max-w-sm">
            Create your first campaign to start screening candidates
            with AI voice interviews.
          </p>
          <Link href="/dashboard/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/campaigns/${campaign.id}`}
            >
              <Card className="group hover:border-primary/25 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg font-serif tracking-tight group-hover:text-primary transition-colors">
                      {campaign.title}
                    </CardTitle>
                    <Badge
                      variant={
                        campaign.status === "active" ? "default" : "secondary"
                      }
                      className="shrink-0"
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.description && (
                    <CardDescription className="line-clamp-2 mt-1.5">
                      {campaign.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {campaign.candidates?.[0]?.count ?? 0}
                      </span>
                      <span>
                        {new Date(campaign.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
