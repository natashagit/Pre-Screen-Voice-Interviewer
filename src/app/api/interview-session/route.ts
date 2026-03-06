import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token, candidateId } = await req.json();

  // Create an ephemeral session token from OpenAI
  // This keeps the API key server-side
  const response = await fetch(
    "https://api.openai.com/v1/realtime/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: `You are a friendly, warm pre-screening interviewer named Alex. Your goal is to have a natural 5-7 minute conversational interview to assess the candidate's communication skills.

Guidelines:
- Start by greeting the candidate warmly and asking them to tell you about themselves.
- Ask one question at a time, listen to their response, and give brief encouraging acknowledgments before moving to the next question.
- Ask natural follow-up questions based on their answers when appropriate.
- Keep your responses concise — this is a conversation, not a lecture.
- Be supportive and professional, but not overly formal.
- After covering all main questions, thank them sincerely and let them know the recruiter will follow up.

Questions to cover (weave them in naturally):
1. "Can you tell me a bit about yourself?"
2. "What's something interesting that happened to you recently?"
3. "How would you describe your communication style?"
4. "Tell me about a time you had to explain something complex to someone."
5. "What are you looking for in your next role?"

When the interview is complete, say goodbye warmly and mention that you'll end the session.`,
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
