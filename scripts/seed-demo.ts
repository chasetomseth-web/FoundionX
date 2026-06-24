import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

const DEMO_EMAIL = 'marcus@shopkraft.co';
const DEMO_PASSWORD = 'MerchantOS2026!';
const DEMO_ORG_NAME = 'Shopkraft (Demo)';

async function main() {
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    console.log(`[seed-demo] Demo user already exists: ${DEMO_EMAIL}`);
    return;
  }

  const passwordHash = hashPassword(DEMO_PASSWORD);

  const orgSlugBase = DEMO_ORG_NAME
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const orgSlug = `${orgSlugBase}-${Date.now()}`;

  const created = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: DEMO_ORG_NAME,
        slug: orgSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        email: DEMO_EMAIL,
        name: 'Demo Merchant',
        passwordHash,
      },
    });

    await tx.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        permissions: [],
      },
    });

    return { user, org };
  });

  console.log(
    `[seed-demo] Created demo user + org: ${created.user.email} / ${created.org.slug}`
  );
}

main()
  .catch((err) => {
    console.error('[seed-demo] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

