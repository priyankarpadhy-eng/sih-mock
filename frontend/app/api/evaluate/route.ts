import { NextRequest, NextResponse } from 'next/server';
import { evaluateConfiguration } from '@/lib/compliance_evaluator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let rawConfig = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      rawConfig = (formData.get('raw_config') as string) || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        rawConfig = await file.text();
      } else {
        rawConfig = (formData.get('raw_config') as string) || '';
      }
    } else {
      const json = await req.json().catch(() => ({}));
      rawConfig = json.raw_config || json.raw_text || json.text || '';
    }

    if (!rawConfig || !rawConfig.trim()) {
      return NextResponse.json(
        { error: 'No configuration content provided.' },
        { status: 400 }
      );
    }

    // Try backend proxy if available on localhost:8000
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const backendRes = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ raw_config: rawConfig }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        return NextResponse.json(backendData);
      }
    } catch {
      // Local backend unavailable (e.g. running on Vercel serverless) — use native evaluator
    }

    // Serverless / Edge deterministic evaluation
    const evaluation = evaluateConfiguration(rawConfig);
    return NextResponse.json(evaluation);
  } catch (err: any) {
    console.error('API /api/evaluate error:', err);
    return NextResponse.json(
      { error: 'Failed to evaluate configuration.', details: err.message },
      { status: 500 }
    );
  }
}
