import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { transcribeMediaWithOpenAI } from '@/lib/openaiTranscribe';

export const runtime = 'nodejs';
export const maxDuration = 120;

type TranscribeVideoBody = {
  url?: string;
};

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.ogg': 'video/ogg',
};

function isSafeUploadsPath(decodedUrlPath: string) {
  if (!decodedUrlPath.startsWith('/uploads/')) return false;
  // Basic path traversal guard.
  return !decodedUrlPath.includes('..');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranscribeVideoBody;
    const rawUrl = body?.url?.trim();

    if (!rawUrl) {
      return NextResponse.json({ error: 'Video URL is required.' }, { status: 400 });
    }

    const decodedUrlPath = decodeURIComponent(rawUrl);
    if (!isSafeUploadsPath(decodedUrlPath)) {
      return NextResponse.json(
        { error: 'Only local uploaded videos can be transcribed.' },
        { status: 400 }
      );
    }

    const relPath = decodedUrlPath.replace(/^\/+/, '');
    const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
    const absoluteFilePath = path.resolve(process.cwd(), 'public', relPath);

    if (!absoluteFilePath.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: 'Invalid video path.' }, { status: 400 });
    }

    const buffer = await readFile(absoluteFilePath);
    const ext = path.extname(absoluteFilePath).toLowerCase();
    const mimeType = MIME_BY_EXT[ext] || 'video/mp4';

    const fileName = path.basename(absoluteFilePath);
    const { transcript, skipped, error } = await transcribeMediaWithOpenAI(
      buffer,
      mimeType,
      fileName
    );

    return NextResponse.json({
      transcript: transcript ?? undefined,
      captionsFromTranscript: Boolean(transcript),
      transcriptionSkipped: skipped,
      transcriptionError: error ?? undefined,
    });
  } catch (error) {
    console.error('Transcribe existing video failed', error);
    return NextResponse.json(
      { error: 'Could not transcribe this video. Please try again.' },
      { status: 500 }
    );
  }
}
