import { MERCH_STORE_URL } from '../config/monetization';

export interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  fourthwallUrl: string;
  tagline: string;
}

export const products: Product[] = [
  {
    id: 'tee-logo',
    name: 'LOGO TEE',
    price: '$24',
    image: `${import.meta.env.BASE_URL}merch/tee-logo.png`,
    fourthwallUrl: MERCH_STORE_URL,
    tagline: 'Classic DSCRMBL wordmark on heavyweight cotton.',
  },
  {
    id: 'hoodie-pixel',
    name: 'PIXEL HOODIE',
    price: '$48',
    image: `${import.meta.env.BASE_URL}merch/hoodie-pixel.png`,
    fourthwallUrl: MERCH_STORE_URL,
    tagline: 'Neon pixel-art hoodie for late-night scrambling.',
  },
  {
    id: 'sticker-pack',
    name: 'STICKER PACK',
    price: '$6',
    image: `${import.meta.env.BASE_URL}merch/sticker-pack.png`,
    fourthwallUrl: MERCH_STORE_URL,
    tagline: 'Five vinyl stickers. Laptops, water bottles, you know the drill.',
  },
  {
    id: 'cap-retro',
    name: 'RETRO CAP',
    price: '$28',
    image: `${import.meta.env.BASE_URL}merch/cap-retro.png`,
    fourthwallUrl: MERCH_STORE_URL,
    tagline: 'Dad-cap with embroidered D-scramble logo.',
  },
];
