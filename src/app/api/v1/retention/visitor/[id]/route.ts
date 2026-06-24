import { NextResponse } from 'next/server';

const VISITOR_PLATFORM_URL = process.env.VISITOR_PLATFORM_URL || 'http://localhost:4000';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const response = await fetch(`${VISITOR_PLATFORM_URL}/visitors/${id}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    const visitor = await response.json();

    return NextResponse.json(visitor, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (error) {
    console.error('[RETENTION VISITOR] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch visitor' }, { status: 500 });
  }
}