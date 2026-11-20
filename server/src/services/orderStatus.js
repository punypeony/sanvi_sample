import { HttpError } from '../utils/httpError.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { recordAudit } from './audit.js';

// A status can move only along these edges.
export const TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['packed', 'cancelled', 'refunded'],
  packed: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const RESTORES = new Set(['cancelled', 'refunded']);

async function restoreStock(order) {
  for (const item of order.items) {
    const product = await Product.findOne({ id: item.productId });
    if (!product) continue;
    const colorway = product.colorways.find((entry) => entry.id === item.colorId);
    if (!colorway) continue;
    colorway.stockCount += item.quantity;
    await product.save();
  }
}

export async function changeOrderStatus(orderNumber, next, actor) {
  const current = await Order.findOne({ orderNumber });
  if (!current) throw new HttpError(404, 'Order not found.');
  const allowed = TRANSITIONS[current.status] || [];
  if (!allowed.includes(next)) {
    throw new HttpError(409, 'That status change is not allowed.');
  }

  const from = current.status;
  if (RESTORES.has(next) && current.stockCommitted) {
    const claimed = await Order.findOneAndUpdate(
      { _id: current._id, status: from, stockCommitted: true },
      { $set: { stockCommitted: false } },
    );
    if (claimed) {
      try {
        await restoreStock(current);
      } catch (error) {
        await Order.updateOne({ _id: current._id }, { $set: { stockCommitted: true } });
        throw error;
      }
    }
  }

  const paymentStatus = next === 'refunded'
    ? 'refunded'
    : next === 'cancelled' && current.payment.status === 'pending'
      ? 'failed'
      : current.payment.status;

  const saved = await Order.findOneAndUpdate(
    { _id: current._id, status: from },
    { $set: { status: next, 'payment.status': paymentStatus } },
    { returnDocument: 'after' },
  );
  if (!saved) throw new HttpError(409, 'That status change is not allowed.');

  await recordAudit({
    actorId: actor._id,
    action: 'order.status',
    target: saved.orderNumber,
    before: from,
    after: `${next}${RESTORES.has(next) && current.stockCommitted ? ' stock restored' : ''}`,
  });
  return saved;
}
