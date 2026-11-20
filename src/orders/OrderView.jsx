export default function OrderView({ order }) {
  return (
    <>
      <p className="route-lead">
        {order.email} · {order.status} · ${order.total}
      </p>
      <ul className="cart-lines cart-lines--readonly">
        {order.items.map((item) => (
          <li key={`${item.productId}:${item.colorId}`} className="cart-line">
            <div className="cart-line-copy">
              <p className="cart-line-name">{item.name}</p>
              <p className="cart-line-color">
                {item.colorName} · × {item.quantity} · ${item.unitPrice} each
              </p>
            </div>
            <p className="cart-line-price">${item.unitPrice * item.quantity}</p>
          </li>
        ))}
      </ul>
      <p>Subtotal ${order.subtotal}</p>
      <p>Shipping ${order.shipping}</p>
      <p>Total ${order.total}</p>
      <p>
        Payment {order.payment.provider} · {order.payment.status}
        {order.payment.reference ? ` · ${order.payment.reference}` : ''}
      </p>
      {order.shippingAddress ? (
        <p>
          {order.shippingAddress.name}, {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postal}, {order.shippingAddress.country}
        </p>
      ) : null}
    </>
  );
}
