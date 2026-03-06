import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4">
      <div className="text-center max-w-2xl space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">VoiceScreen</h1>
        <p className="text-xl text-muted-foreground">
          AI-powered pre-screening interviews for recruiters. Upload candidates,
          send invites, and let AI conduct voice interviews — then review
          recordings and transcripts at your own pace.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
