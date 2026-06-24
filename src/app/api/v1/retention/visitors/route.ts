import { NextRequest, NextResponse } from 'next/server';

const VISITOR_PLATFORM_URL = process.env.VISITOR_PLATFORM_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const feed = searchParams.get('feed');

    if (feed === 'true') {
      const response = await fetch(`${VISITOR_PLATFORM_URL}/visitors?feed=true&limit=${limit}`);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch visitors feed' }, { status: response.status });
      }
      const data = await response.json();
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'private, max-age=15' },
      });
    }

    const response = await fetch(`${VISITOR_PLATFORM_URL}/visitors?page=${page}&limit=${limit}`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: response.status });
    }
    const data = await response.json();

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (error) {
    console.error('[RETENTION VISITORS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${VISITOR_PLATFORM_URL}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[RETENTION EVENT] Error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}