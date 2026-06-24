import { NextResponse } from 'next/server';

const VISITOR_PLATFORM_URL = process.env.VISITOR_PLATFORM_URL || 'http://localhost:4000';

export async function GET() {
  try {
    const response = await fetch(`${VISITOR_PLATFORM_URL}/overview`);
    const data = await response.json();

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    console.error('[RETENTION OVERVIEW] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch retention overview' }, { status: 500 });
  }
}