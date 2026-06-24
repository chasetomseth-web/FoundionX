export function suggestReply(message: string) {
  const lower = (message || '').toLowerCase();

  if (lower.includes('refund') || lower.includes('return')) {
    return 'I can help you with that refund. Can you confirm your order ID so we can process it right away?';
  }

  if (lower.includes('shipping') || lower.includes('where is') || lower.includes('tracking')) {
    return "I understand you're asking about shipping. Let me check your order status and update you shortly.";
  }

  if (lower.includes('ingredient') || lower.includes('contains')) {
    return 'Great question — I can break down the full ingredient list for you if you\'d like.';
  }

  return 'Thanks for reaching out — I’m looking into this and will get back to you shortly.';
}
