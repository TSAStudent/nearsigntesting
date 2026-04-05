import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface SignyChatRequest {
  userName?: string;
  languagePreference?: 'asl_first' | 'english' | 'bilingual';
  message: string;
  history?: ChatHistoryItem[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: 'I am not available right now because the AI key is missing.' },
        { status: 200 }
      );
    }

    const body = (await request.json()) as SignyChatRequest;
    const message = body?.message?.trim();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const history = (body.history ?? []).slice(-8);
    const userName = body.userName?.trim() || 'friend';
    const languagePreference = body.languagePreference ?? 'bilingual';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            `You are Signy, a friendly assistant inside NearSign. Keep responses concise, warm, and accessibility-minded for Deaf/HoH users. Offer practical help about making friends, safe communication, social anxiety, planning hangouts, and using the app features. Never claim actions you cannot perform. User language preference is ${languagePreference}. If asl_first, keep language visually clear and simple.`,
        },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        {
          role: 'user',
          content: `${userName}: ${message}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 260,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'I am here to help. Ask me anything about connecting, safety, or planning hangouts.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error from Signy chat route', error);
    return NextResponse.json(
      { reply: 'Something went wrong while I was thinking. Please try again in a moment.' },
      { status: 200 }
    );
  }
}

