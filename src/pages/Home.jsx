import { Link, useOutletContext } from 'react-router';
import { flagship, flagshipPath, products } from '../data/products';
import ProductImage from '../components/ProductImage';
import Hero from '../sections/Hero';
import Reviews from '../sections/Reviews';
import RevealText from '../sections/RevealText';
import PageReady from './PageReady';
import StageCover from './StageCover';

const featured = products.filter((item) => item.featured);

const TRUST = [
  { title: 'Shipping', text: 'Free over $50. Placeholder, nothing ships yet.' },
  { title: 'Returns', text: '30 days. Placeholder, no returns desk yet.' },
  { title: 'Warranty', text: '2 years. Placeholder, no claims yet.' },
];

const FOOTER = {
  product: [
    { to: '/shop', label: 'Shop' },
    { to: flagshipPath, label: flagship.name },
    { to: '/products/ear-cushions', label: 'Ear cushions' },
    { to: '/products/travel-case', label: 'Travel case' },
  ],
  support: [
    { href: '#reviews', label: 'Reviews' },
    { href: '#contact', label: 'Contact' },
  ],
  legal: [
    { href: '#legal', label: 'Privacy' },
    { href: '#legal', label: 'Terms' },
  ],
  social: [
    { href: '#contact', label: 'Instagram' },
    { href: '#contact', label: 'X' },
    { href: '#contact', label: 'YouTube' },
  ],
};

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {links.map((item) => (
          <li key={item.label}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <a href={item.href}>{item.label}</a>}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Home() {
  const { colorId, onColorChange } = useOutletContext();

  return (
    <>
      <Hero colorId={colorId} onColorChange={onColorChange} />

      {/* One opaque block, taller than the screen, so the canvas pauses
          from the moment the hero hands off until the footer. */}
      <div className="section section--opaque home-after" data-stage-cover>
        <section id="featured" className="home-block" aria-labelledby="featured-title">
          <p className="route-kicker">Featured</p>
          <h2 id="featured-title">In the shop</h2>
          <ul className="catalog-list">
            {featured.map((item) => (
              <li key={item.id}>
                <Link to={`/products/${item.slug}`}>
                  <ProductImage name={item.name} image={item.images[0]} category={item.category} decorative />
                  <span className="catalog-name">{item.name}</span>
                  <span className="catalog-meta">{item.category}</span>
                  <span className="catalog-price">${item.price}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="flagship" className="home-teaser" aria-labelledby="flagship-title">
          <p className="route-kicker">Flagship</p>
          <h2 id="flagship-title" className="home-teaser-title">
            <RevealText as="span">{flagship.name}, in full.</RevealText>
          </h2>
          <p className="route-lead">{flagship.tagline}</p>
          <Link to={flagshipPath} className="light-button">
            Explore {flagship.name}
          </Link>
        </section>

        <Reviews />

        <section className="home-trust" aria-labelledby="trust-title">
          <h2 id="trust-title" className="sr-only">
            Shipping, returns, and warranty
          </h2>
          <ul>
            {TRUST.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <footer className="site-footer" id="contact">
          <div className="footer-brand">
            <p className="footer-logo">SANVI AUDIO</p>
            <p id="legal">Privacy and terms are placeholders.</p>
          </div>
          <FooterColumn title="Product" links={FOOTER.product} />
          <FooterColumn title="Support" links={FOOTER.support} />
          <FooterColumn title="Legal" links={FOOTER.legal} />
          <FooterColumn title="Social" links={FOOTER.social} />
          <p className="footer-copy">© {new Date().getFullYear()} SANVI Audio</p>
        </footer>
      </div>

      <StageCover />
      <PageReady
        title="SANVI Audio — Noir"
        description="Noir headphones, and the rest of the line. Placeholder catalogue."
      />
    </>
  );
}
