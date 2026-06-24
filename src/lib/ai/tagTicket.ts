export type TicketTag =
  | 'refund'
  | 'shipping'
  | 'ingredient'
  | 'cancellation'
  | 'general';

export function tagTicket(text: string): TicketTag[] {
  const lower = (text || '').toLowerCase();

  const tags: TicketTag[] = [];

  if (lower.includes('refund') || lower.includes('returned') || lower.includes('return')) tags.push('refund');
  if (lower.includes('where is') || lower.includes('shipping') || lower.includes('deliv') || lower.includes('tracking')) tags.push('shipping');
  if (lower.includes('ingredient') || lower.includes('ingredients') || lower.includes('contains')) tags.push('ingredient');
  if (lower.includes('cancel') || lower.includes('cancellation')) tags.push('cancellation');

  if (tags.length === 0) tags.push('general');

  return tags;
}
