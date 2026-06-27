import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV ?? 'development';
  
  // Test database connection
  let databaseStatus: 'connected' | 'error' = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    databaseStatus = 'error';
    console.error('[HEALTH CHECK] Database connection failed:', error);
  }

  // F.2 — Test Supabase Storage connectivity
  let storageStatus: 'connected' | 'error' = 'connected';
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
  } catch (error) {
    storageStatus = 'error';
    console.error('[HEALTH CHECK] Storage connection failed:', error);
  }

  return NextResponse.json({
    status: 'ok',
    timestamp,
    database: databaseStatus,
    storage: storageStatus,
    environment,
  });
}
