import { NextResponse } from 'next/server';

const VISITOR_PLATFORM_URL = process.env.VISITOR_PLATFORM_URL || 'http://localhost:4000';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(`${VISITOR_PLATFORM_URL}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[RETENTION IDENTIFY] Error:', error);
    return NextResponse.json({ error: 'Failed to identify visitor' }, { status: 500 });
  }
}