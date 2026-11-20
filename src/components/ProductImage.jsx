// Stand-in art. A real photo is just an image `src` on the product; until
// then this draws a neutral field with the product name so nothing 404s.

const STOPS = {
  headphones: ['#2c3038', '#12141a'],
  accessories: ['#32302c', '#141210'],
  parts: ['#2a3032', '#101416'],
  bundles: ['#302c34', '#141018'],
};

export default function ProductImage({
  name,
  image,
  category = 'headphones',
  decorative = false,
  lazy = false,
  flip = false,
}) {
  if (image?.src) {
    return (
      <img
        className="product-mark"
        src={image.src}
        alt={decorative ? '' : image.alt || name}
        loading={lazy ? 'lazy' : undefined}
        decoding={lazy ? 'async' : undefined}
      />
    );
  }

  const [from, to] = STOPS[category] || STOPS.headphones;
  const label = flip ? image?.alt || name : name;
  const size = label.length > 18 ? 34 : 46;
  const title = image?.alt || name;

  return (
    <svg
      className="product-mark"
      viewBox="0 0 800 800"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      <defs>
        <linearGradient
          id={`mark-${image?.id || name}`}
          x1={flip ? '1' : '0'}
          y1={flip ? '1' : '0'}
          x2={flip ? '0' : '1'}
          y2={flip ? '0' : '1'}
        >
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill={`url(#mark-${image?.id || name})`} />
      <text
        x="400"
        y="400"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#e6e8ee"
        fontFamily="Inter, sans-serif"
        fontSize={size}
      >
        {label}
      </text>
    </svg>
  );
}
