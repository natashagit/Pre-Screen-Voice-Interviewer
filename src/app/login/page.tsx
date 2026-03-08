"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company: company || null,
            },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="prelude-app min-h-screen flex items-center justify-center bg-background px-4">
      {/* Subtle radial glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(139,110,78,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/15 border border-primary/25">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <span className="text-2xl tracking-tight font-serif text-foreground">
              Prelude
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            AI-powered voice screening for recruiters
          </p>
        </div>

        <Card className="border-border/60">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-serif tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Start screening candidates with AI voice interviews"
                : "Sign in to continue to your dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className="h-11 bg-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="company"
                      className="text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Company{" "}
                      <span className="normal-case tracking-normal opacity-50">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="h-11 bg-transparent"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="h-11 bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-11 bg-transparent"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading
                  ? "Loading..."
                  : isSignUp
                  ? "Create Account"
                  : "Sign In"}
              </Button>
            </form>
            <div className="mt-5 text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
