import PageEditor from '@/app/storefront/components/PageEditor';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { cookies } from 'next/headers';

interface Props {
  params: { id: string };
}

export default async function EditPage({ params }: Props) {
  // Note: auth/permission checks are primarily enforced in API routes; this server page fetches page data
  const page = await prisma.merchantPage.findUnique({ where: { id: params.id } });
  if (!page) return <div className="p-6">Page not found</div>;

  // Serialize minimal fields for client component
  const clientPage = {
    id: page.id,
    name: page.name,
    slug: page.slug,
    type: page.type,
    html: page.html,
    css: page.css ?? '',
    isPublished: page.isPublished,
    status: page.status,
    isCore: page.isCore,
  };

  return (
    <div className="p-6">
      <PageEditor page={clientPage} onBack={() => { /* noop - client handles */ }} onSaved={() => {}} />
    </div>
  );
}
