import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { UserProfile, DiscoverProfile } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MatchInsightRequest {
  currentUser: UserProfile;
  profile: DiscoverProfile;
  matchScore: number;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { insight: 'Match insights are not available right now.' },
        { status: 200 }
      );
    }

    const body = (await request.json()) as MatchInsightRequest;
    const { currentUser, profile, matchScore } = body;

    if (!currentUser || !profile) {
      return NextResponse.json({ error: 'Missing profile data' }, { status: 400 });
    }

    const sharedInterests = currentUser.interests.filter((i) => profile.interests.includes(i));
    const sharedComm = currentUser.communicationPreferences.filter((c) =>
      profile.communicationPreferences.includes(c)
    );
    const sharedComfort = currentUser.comfortPreferences.filter((c) =>
      profile.comfortPreferences.includes(c)
    );
    const sharedAvailability = currentUser.availability.filter((a) =>
      profile.availability.includes(a)
    );

    const prompt = `
You are helping explain a friendship match between two teens in a safety-focused app for Deaf and hard of hearing youth.
Write a short, friendly explanation (2–4 sentences) of why this is a strong/okay/weak match based on the data below.
Avoid percentages or math; speak in clear, encouraging language and never reveal any private data like exact emails or coordinates.

Match score: ${matchScore} out of 100.

You:
- Identity: ${currentUser.identity}
- Communication: ${currentUser.communicationPreferences.join(', ') || 'none set'}
- Comfort: ${currentUser.comfortPreferences.join(', ') || 'none set'}
- Availability: ${currentUser.availability.join(', ') || 'none set'}
- Interests: ${currentUser.interests.join(', ') || 'none set'}

Them:
- Identity: ${profile.identity}
- Communication: ${profile.communicationPreferences.join(', ') || 'none set'}
- Comfort: ${profile.comfortPreferences.join(', ') || 'none set'}
- Availability: ${profile.availability.join(', ') || 'none set'}
- Interests: ${profile.interests.join(', ') || 'none set'}
- Distance: ${profile.distance} miles away

Shared pieces:
- Shared interests: ${sharedInterests.join(', ') || 'none'}
- Shared communication: ${sharedComm.join(', ') || 'none'}
- Shared comfort: ${sharedComfort.join(', ') || 'none'}
- Shared availability: ${sharedAvailability.join(', ') || 'none'}

Be kind and supportive, and if the match score is low, focus on why it might still be interesting but maybe not the best fit compared to others.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You explain friendship matches for a teen social app in a warm, short, and safety-first way.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 220,
      temperature: 0.7,
    });

    const insight =
      completion.choices[0]?.message?.content?.trim() ||
      'This match looks interesting based on your shared preferences and interests.';

    return NextResponse.json({ insight });
  } catch (error) {
    console.error('Error generating match insight', error);
    return NextResponse.json(
      { insight: 'We could not load a detailed insight right now, but you can still decide based on the score and profile.' },
      { status: 200 }
    );
  }
}

