import MerchantPageEditor from '@/components/merchant-pages/MerchantPageEditor';

interface MerchantPageEditorPageProps {
  params: {
    id: string;
  };
}

export default function MerchantPageEditorPage({ params }: MerchantPageEditorPageProps) {
  return <MerchantPageEditor pageId={params.id} />;
}
