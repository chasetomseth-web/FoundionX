/**
 * Environment Variable Validation
 * Validates critical environment variables on app startup
 */

interface EnvCheck {
  name: string;
  required: boolean;
  description: string;
}

const ENV_CHECKS: EnvCheck[] = [
  // Critical - Stripe
  { name: 'STRIPE_SECRET_KEY', required: true, description: 'Stripe secret key for payment processing' },
  { name: 'STRIPE_WEBHOOK_SECRET', required: true, description: 'Stripe webhook signature secret' },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: true, description: 'Stripe publishable key for frontend' },
  
  // Critical - Supabase
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase project URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anon/public key' },
  
  // Critical - Database
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  
  // Critical - Email
  { name: 'RESEND_API_KEY', required: true, description: 'Resend API key for transactional emails' },
  
  // Critical - Shipping
  { name: 'SHIPPO_API_KEY', required: false, description: 'Shippo API key for shipping labels (optional)' },
  
  // Critical - Site
  { name: 'NEXT_PUBLIC_SITE_URL', required: true, description: 'Base URL of the application' },
  
  // Optional - Brevo
  { name: 'BREVO_API_KEY', required: false, description: 'Brevo API key for marketing emails' },
  
  // Optional - AI
  { name: 'OPENAI_API_KEY', required: false, description: 'OpenAI API key for AI features' },
];

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  for (const check of ENV_CHECKS) {
    const value = process.env[check.name];
    
    if (!value || value.trim() === '' || value.includes('your-') || value.includes('-here')) {
      if (check.required) {
        missing.push(`${check.name} - ${check.description}`);
      } else {
        warnings.push(`${check.name} - ${check.description}`);
      }
    }
  }

  // Log results
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(m => console.error(`  [ENV] ${m}`));
    
    if (isProd) {
      // Skip throwing during build phase — env vars are set at runtime in Vercel
      // NEXT_PHASE is set by Next.js during build (e.g. 'phase-production-build')
      // During actual runtime on Vercel, NEXT_PHASE is not set
      const isBuildPhase = process.env.NEXT_PHASE !== undefined;
      if (isBuildPhase) {
        console.warn('\n⚠️  Build phase detected. Env vars must be set in Vercel project settings for runtime.\n');
      } else {
        throw new Error(`Missing ${missing.length} required environment variable(s). See logs above.`);
      }
    } else {
      console.warn('\n⚠️  Running in development mode with missing variables. Some features may not work.\n');
    }
  }

  if (warnings.length > 0 && !isProd) {
    console.warn('\n⚠️  Optional environment variables not set:');
    warnings.forEach(w => console.warn(`  [ENV] ${w}`));
    console.warn('');
  }

  if (missing.length === 0 && warnings.length === 0) {
    console.log('✅ All required environment variables are set');
  }
}

export function getEnvCheckReport(): { missing: string[]; warnings: string[]; ok: boolean } {
  const missing: string[] = [];
  const warnings: string[] = [];
  for (const check of ENV_CHECKS) {
    const value = process.env[check.name];
    const isEmpty = !value || value.trim() === '' || value.includes('your-') || value.includes('-here');
    if (isEmpty) {
      if (check.required) missing.push(check.name);
      else warnings.push(check.name);
    }
  }
  return { missing, warnings, ok: missing.length === 0 };
}

export function assertEnvironment(): void {
  validateEnv();
}
