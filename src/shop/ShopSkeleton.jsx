const CARDS = 8;

export default function ShopSkeleton() {
  return (
    <div className="route-page shop-page">
      <div aria-hidden="true">
        <p className="route-kicker">Shop</p>
        <div className="shop-skel shop-skel-title" />
        <div className="shop-skel shop-skel-lead" />
        <ul className="shop-grid">
          {Array.from({ length: CARDS }, (_, index) => (
            <li key={index} className="shop-skel-card">
              <div className="shop-skel shop-skel-photo" />
              <div className="shop-skel shop-skel-line" />
              <div className="shop-skel shop-skel-line shop-skel-line--short" />
            </li>
          ))}
        </ul>
      </div>
      <p className="sr-only">Loading</p>
    </div>
  );
}
