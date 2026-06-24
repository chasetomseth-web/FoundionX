import { BLOCK_REGISTRY } from '@/lib/merchant-pages/registry/blockRegistry';
import type { BlockType } from '@/lib/merchant-pages/types';

interface SidebarBlocksProps {
  onAddBlock: (type: BlockType) => void;
}

export default function SidebarBlocks({ onAddBlock }: SidebarBlocksProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Block palette</h2>
        <span className="text-sm text-slate-500">Click to add</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {BLOCK_REGISTRY.map((block) => (
          <button
            key={block.type}
            type="button"
            onClick={() => onAddBlock(block.type)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="block font-semibold">{block.label}</span>
            <span className="block mt-1 text-xs text-slate-500">{block.category}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
