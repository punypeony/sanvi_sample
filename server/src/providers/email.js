import { config } from '../config/index.js';

// TODO: replace these console lines with a real email provider.
// The log keeps the reset link and the order number. It does not include the
// email address, a postal address, or any card data. `email` is for the provider.

export function sendPasswordReset({ email, token }) {
  void email;
  const url = `${config.clientOrigin}/reset?token=${encodeURIComponent(token)}`;
  console.info(`[email] TODO: send this with a real email provider. Reset link: ${url}`);
}

export function sendOrderConfirmation(order) {
  console.info(`[email] TODO: send this with a real email provider. Order ${order.orderNumber} confirmation queued`);
}
