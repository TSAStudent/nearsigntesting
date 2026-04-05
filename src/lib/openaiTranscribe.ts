/**
 * Server-only: transcribe audio/video with OpenAI speech-to-text.
 */
import OpenAI from 'openai';

export type OpenAITranscribeResult = {
  transcript: string | null;
  /** Present when transcription is skipped or fails; upload should still succeed */
  skipped?: boolean;
  error?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeMediaWithOpenAI(
  buffer: Buffer,
  mimeType: string,
  fileName = 'media.mp4'
): Promise<OpenAITranscribeResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { transcript: null, skipped: true };
  }

  const safeName = fileName.trim() || 'media.mp4';
  const file = new File([new Uint8Array(buffer)], safeName, {
    type: mimeType || 'application/octet-stream',
  });

  const models = ['gpt-4o-mini-transcribe', 'whisper-1'] as const;

  for (const model of models) {
    try {
      const response = await openai.audio.transcriptions.create({
        file,
        model,
      });
      const transcript = response.text?.trim() ?? '';
      return { transcript: transcript || null };
    } catch (error) {
      // Try fallback model next; only return after final failure.
      if (model === models[models.length - 1]) {
        console.error('[OpenAI STT] request failed', error);
        return {
          transcript: null,
          error: error instanceof Error ? error.message : 'OpenAI transcription failed',
        };
      }
    }
  }

  return { transcript: null, error: 'OpenAI transcription failed' };
}
