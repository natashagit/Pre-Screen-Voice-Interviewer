import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { candidateName, candidateEmail, token, campaignTitle } =
    await req.json();

  const interviewUrl = `${req.nextUrl.origin}/interview/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Prelude <interviews@prelude.team>",
      to: candidateEmail,
      subject: `You're invited to an interview — ${campaignTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Hi ${candidateName},</h1>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            You've been invited to complete a short AI-powered pre-screening interview for <strong>${campaignTitle}</strong>.
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            The interview is a casual 5-7 minute voice conversation with an AI interviewer. Just click the button below when you're ready.
          </p>
          <div style="margin: 32px 0;">
            <a href="${interviewUrl}" style="background-color: #18181b; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
              Start Interview
            </a>
          </div>
          <p style="font-size: 14px; color: #888; line-height: 1.6;">
            This link will expire in <strong>48 hours</strong>. If you can't make it in time, you'll be able to request a reschedule.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 12px; color: #aaa;">
            Sent via Prelude — AI Pre-Screening Platform
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
