import { randomBytes } from 'node:crypto';

// Stripe Checkout replaces mockCharge. This function never reads a card number,
// an expiry, or a security code. A decline is a test switch, and production ignores it.

export function mockCharge({ outcome, allowDecline }) {
  if (allowDecline && outcome === 'decline') {
    return { ok: false, provider: 'mock', reference: '', status: 'failed' };
  }
  return {
    ok: true,
    provider: 'mock',
    reference: `mock_${randomBytes(6).toString('hex')}`,
    status: 'paid',
  };
}
