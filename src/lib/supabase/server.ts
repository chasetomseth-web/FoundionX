import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

let _supabaseClient: ReturnType<typeof createServerClient> | null = null;

async function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-') || key.includes('placeholder') || key.includes('your-')) {
    return null;
  }
  return { url, key };
}

export async function createClient() {
  const creds = await getSupabaseCredentials();
  if (!creds) {
    // Return a mock client that will fail gracefully
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
      },
    } as any;
  }
  
  const cookieStore = await cookies();

  return createServerClient(
    creds.url,
    creds.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'none',
                secure: true,
              })
            );
          } catch {
            // Server Component read-only context — expected
          }
        },
      },
    }
  );
}
