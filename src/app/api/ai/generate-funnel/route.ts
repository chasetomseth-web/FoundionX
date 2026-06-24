import { NextRequest, NextResponse } from 'next/server';
import { FUNNEL_TEMPLATES } from '@/lib/merchant-pages/templates';
import type { BlockType } from '@/lib/merchant-pages/types';

const SYSTEM_PROMPT = `You are a funnel builder AI. Return ONLY valid JSON with the shape:
{
  "pages": [
    { "name": string, "blocks": [{ "id": string, "type": string, "parentId": string | null, "order": number, "props": object, "style": object }] }
  ]
}
Use nested structure with section/container/content blocks, include a hero and either a checkout or affiliate block, and add urgency with a countdown or testimonial section.`;

const VALID_BLOCK_TYPES: BlockType[] = [
  'section',
  'container',
  'row',
  'column',
  'hero',
  'text',
  'image',
  'countdown',
  'checkout',
  'affiliate',
  'html',
  'navbar',
  'cta',
  'testimonials',
  'order_bump',
  'upsell',
  'affiliate_signup',
  'referral_dashboard',
  'script',
];

function fallbackPages(name: string) {
  const template = FUNNEL_TEMPLATES[0];
  return [
    {
      name,
      blocks: template.blocks.map((block, index) => ({
        ...block,
        id: `fallback-${Date.now()}-${index}-${block.type}`,
        parentId: block.parentId ?? null,
        order: index,
      })),
    },
  ];
}

function sanitizeResponse(response: any) {
  if (!response || typeof response !== 'object' || !Array.isArray(response.pages)) {
    return null;
  }

  const pages = response.pages.map((page: any) => {
    if (!page || typeof page.name !== 'string' || !Array.isArray(page.blocks)) {
      throw new Error('Invalid page structure');
    }

    const blocks = page.blocks.map((block: any) => {
      if (
        !block ||
        typeof block.id !== 'string' ||
        typeof block.type !== 'string' ||
        !VALID_BLOCK_TYPES.includes(block.type as BlockType) ||
        (block.parentId !== null && typeof block.parentId !== 'string') ||
        typeof block.order !== 'number' ||
        typeof block.props !== 'object' ||
        block.props === null ||
        typeof block.style !== 'object' ||
        block.style === null
      ) {
        throw new Error('Invalid block payload');
      }

      return {
        ...block,
        parentId: block.parentId ?? null,
        order: Number(block.order),
      };
    });

    return {
      name: page.name,
      blocks,
    };
  });

  if (!pages.length) {
    return null;
  }

  return { pages };
}

export async function POST(req: NextRequest) {
  let name = 'AI Generated Funnel';

  try {
    const body = await req.json();
    name = String(body.name ?? name);
    const prompt = String(body.prompt ?? `Create a high converting funnel for ${name}`);
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json({ pages: fallbackPages(name) }, { status: 200 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      console.error('[AI] OpenAI error:', await response.text());
      return NextResponse.json({ pages: fallbackPages(name) }, { status: 200 });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty AI response');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error('[AI] parse error:', error, content);
      return NextResponse.json({ pages: fallbackPages(name) }, { status: 200 });
    }

    const sanitized = sanitizeResponse(parsed);
    if (!sanitized) {
      throw new Error('AI response did not match expected schema');
    }

    return NextResponse.json(sanitized, { status: 200 });
  } catch (error) {
    console.error('[AI] generate-funnel error:', error);
    return NextResponse.json({ pages: fallbackPages(name) }, { status: 200 });
  }
}
