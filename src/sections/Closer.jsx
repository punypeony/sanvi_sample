import RevealText from './RevealText';

const PRODUCT = [
  { href: '#teardown', label: 'Teardown' },
  { href: '#colors', label: 'Colors' },
  { href: '#sound', label: 'Sound' },
  { href: '#buy', label: 'Pricing' },
];

const SUPPORT = [
  { href: '#reviews', label: 'Reviews' },
  { href: '#contact', label: 'Contact' },
];

const LEGAL = [
  { href: '#legal', label: 'Privacy' },
  { href: '#legal', label: 'Terms' },
];

const SOCIAL = [
  { href: '#contact', label: 'Instagram' },
  { href: '#contact', label: 'X' },
  { href: '#contact', label: 'YouTube' },
];

export default function Closer() {
  return (
    <section className="section section--opaque closer" data-stage-cover aria-label="Close">
      <div className="closer-cta">
        <div className="closer-bg" aria-hidden="true" />
        <RevealText as="h2" className="closer-title">
          Take them home.
        </RevealText>
        <a className="closer-button" href="#buy">
          Shop Noir
        </a>
      </div>

      <footer className="site-footer" id="contact">
        <div className="footer-brand">
          <p className="footer-logo">SANVI AUDIO</p>
          <p id="legal">Privacy and terms are placeholders.</p>
        </div>
        <nav aria-label="Product">
          <h3>Product</h3>
          <ul>
            {PRODUCT.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Support">
          <h3>Support</h3>
          <ul>
            {SUPPORT.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h3>Legal</h3>
          <ul>
            {LEGAL.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Social">
          <h3>Social</h3>
          <ul>
            {SOCIAL.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="footer-copy">© {new Date().getFullYear()} SANVI Audio</p>
      </footer>
    </section>
  );
}
