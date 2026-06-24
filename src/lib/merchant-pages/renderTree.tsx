import React, { ReactNode } from 'react';
import { PageBlock } from './types';
import { sortBlocks } from './blockHelpers';
import BlockRenderer from '@/components/merchant-pages/BlockRenderer';

interface BlockNodeProps {
  block: PageBlock;
  children?: ReactNode;
}

export function BlockNode({ block, children }: BlockNodeProps) {
  const isContainer = ['section', 'container', 'row', 'column', 'hero'].includes(block.type);

  return (
    <div className={`border p-2 mb-3 ${isContainer ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="mb-2 text-xs text-gray-400">{block.type}</div>
      <BlockRenderer block={block} />
      {children ? <div className="ml-4 border-l pl-3 mt-3">{children}</div> : null}
    </div>
  );
}

export function renderTree(blocks: PageBlock[], parentId: string | null = null) {
  return sortBlocks(blocks)
    .filter((block) => block.parentId === parentId)
    .map((block) => (
      <BlockNode key={block.id} block={block}>
        {renderTree(blocks, block.id)}
      </BlockNode>
    ));
}
