// Placeholder catalogue payload, shaped like an API response.
// `product` is the product document. Its prices, stock flags, and specs are
// PLACEHOLDERS until a real catalogue exists. `reviews` is one page of the reviews endpoint.

export const product = {
  id: 'noir-over-ear',
  name: 'Noir',
  placeholder: true,
  currency: 'USD',
  specs: [
    { id: 'driver', label: 'Driver', value: '40 mm dynamic' },
    { id: 'frequency', label: 'Frequency response', value: '4 Hz – 40 kHz' },
    { id: 'isolation', label: 'Isolation', value: '−22 dB passive' },
    { id: 'battery', label: 'Battery', value: '30 hours' },
    { id: 'weight', label: 'Weight', value: '268 g' },
    { id: 'charging', label: 'Charging', value: 'USB-C' },
    { id: 'mics', label: 'Microphones', value: '4' },
  ],
  // `stock` is "in_stock" or "out_of_stock". `price` is whole dollars.
  colorways: [
    { id: 'maroon', stock: 'in_stock', price: 449 },
    { id: 'sky', stock: 'in_stock', price: 429 },
    { id: 'noir', stock: 'in_stock', price: 399 },
    { id: 'ivory', stock: 'out_of_stock', price: 449 },
  ],
};

export const reviews = {
  average: 4.8,
  count: 2310,
  reviews: [
    {
      id: 'rv-01',
      name: 'Mara Ellison',
      rating: 5,
      text: 'The silence is the feature. A train went past the window and I only noticed because the cup moved.',
      colorway: 'noir',
    },
    {
      id: 'rv-02',
      name: 'Jonah Abebe',
      rating: 5,
      text: 'Bass has weight without sitting on the vocal. I stopped reaching for the EQ.',
      colorway: 'maroon',
    },
    {
      id: 'rv-03',
      name: 'Priya Raman',
      rating: 4,
      text: 'Clarity is the reason I kept them. Voices land in front of the mix, not inside it.',
      colorway: 'ivory',
    },
    {
      id: 'rv-04',
      name: 'Chris Dalton',
      rating: 5,
      text: 'Wore them through a six-hour edit. The clamp stays even and the top end never turns harsh.',
      colorway: 'sky',
    },
    {
      id: 'rv-05',
      name: 'Elena Voss',
      rating: 5,
      text: 'ANC on a night bus, then off in a quiet room. Both feel finished, not like a mode switch.',
      colorway: 'noir',
    },
    {
      id: 'rv-06',
      name: 'Samir Shah',
      rating: 4,
      text: 'Detail on acoustic guitar is the test I use. The string noise is still there, which is the point.',
      colorway: 'ivory',
    },
    {
      id: 'rv-07',
      name: 'Hannah Cho',
      rating: 5,
      text: 'I bought the maroon pair for the colour and stayed for how little they change the voice.',
      colorway: 'maroon',
    },
    {
      id: 'rv-08',
      name: 'Owen Briggs',
      rating: 5,
      text: 'Low end is physical, not bloated. Kick drums stop when the recording stops.',
      colorway: 'sky',
    },
    {
      id: 'rv-09',
      name: 'Leila Nasser',
      rating: 4,
      text: 'Took them on two flights. The seal is calm, and the fold is flat enough for the sleeve.',
      colorway: 'noir',
    },
    {
      id: 'rv-10',
      name: 'Marcus Adeyemi',
      rating: 5,
      text: 'Silence first, then the track. That order is what sold me after a week of commuting.',
      colorway: 'ivory',
    },
    {
      id: 'rv-11',
      name: 'Ines Moreau',
      rating: 5,
      text: 'Sky blue, and they look as considered as they sound. Nothing rattles when I turn my head.',
      colorway: 'sky',
    },
    {
      id: 'rv-12',
      name: 'Theo Park',
      rating: 4,
      text: 'I can leave them on between takes. The room comes back gently when the music stops.',
      colorway: 'maroon',
    },
  ],
};
