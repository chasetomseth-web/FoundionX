export interface TicketTags {
  refund?: boolean;
  shipping?: boolean;
  product_question?: boolean;
  cancellation?: boolean;
  cancellation_request?: boolean;
}

// Placeholder AI tagger.
// Later you can swap this with a real LLM call.
export async function analyzeTicket(message: string): Promise<string[]> {
  const text = (message ?? '').toLowerCase();

  const tags: string[] = [];

  if (/(refund|reimburse|chargeback)/.test(text)) tags.push('refund');
  if (/(ship|shipping|tracking|delivery|delivered|carrier)/.test(text)) tags.push('shipping');
  if (/(cancel|cancellation|stop order|don\'?t want)/.test(text)) tags.push('cancellation');
  if (/(ingredient|how to|what is|does it|product|sku|where is)/.test(text)) tags.push('product_question');

  // If nothing matches, return empty tag set.
  return tags;
}

