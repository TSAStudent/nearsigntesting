import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { transcribeMediaWithOpenAI } from '@/lib/openaiTranscribe';

export const runtime = 'nodejs';

/** Allow time for transcription on larger clips (Vercel / local) */
export const maxDuration = 120;

const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20MB

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No video file provided.' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video files are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video is too large. Max 20MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uniqueName = `${randomUUID()}-${sanitizeFilename(file.name)}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const outputPath = path.join(uploadsDir, uniqueName);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(outputPath, buffer);

    const { transcript, skipped, error: transcribeError } =
      await transcribeMediaWithOpenAI(buffer, file.type || 'video/mp4', file.name);

    return NextResponse.json({
      url: `/uploads/${uniqueName}`,
      originalName: file.name,
      size: file.size,
      /** Auto-generated captions from speech in the video */
      transcript: transcript ?? undefined,
      captionsFromTranscript: Boolean(transcript),
      transcriptionSkipped: skipped,
      transcriptionError: transcribeError ?? undefined,
    });
  } catch (error) {
    console.error('Video upload failed', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

