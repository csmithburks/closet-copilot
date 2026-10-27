// What kinds of clothes exist, with sensible defaults the style engine uses.
// formality: 1 (gym/lounge) … 5 (black tie). warmth: 0 (hot-weather) … 3 (winter).

export const CATEGORIES = [
  { key: 'top', label: 'Tops' },
  { key: 'bottom', label: 'Bottoms' },
  { key: 'onepiece', label: 'One-piece' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'accessory', label: 'Accessories' },
];

export const TYPES = {
  // tops
  tshirt: { cat: 'top', label: 'T-shirt', formality: 1, warmth: 0 },
  tank: { cat: 'top', label: 'Tank top', formality: 1, warmth: 0, athletic: true },
  athletic_top: { cat: 'top', label: 'Athletic top', formality: 1, warmth: 0, athletic: true },
  polo: { cat: 'top', label: 'Polo', formality: 2, warmth: 0 },
  henley: { cat: 'top', label: 'Henley', formality: 2, warmth: 1 },
  oxford: { cat: 'top', label: 'Oxford / casual shirt', formality: 3, warmth: 1 },
  linen_shirt: { cat: 'top', label: 'Linen shirt', formality: 3, warmth: 0 },
  knit_polo: { cat: 'top', label: 'Knit polo', formality: 3, warmth: 1 },
  flannel: { cat: 'top', label: 'Flannel shirt', formality: 2, warmth: 2 },
  dress_shirt: { cat: 'top', label: 'Dress shirt', formality: 4, warmth: 1 },
  blouse: { cat: 'top', label: 'Blouse', formality: 3, warmth: 1 },
  sweater: { cat: 'top', label: 'Sweater', formality: 3, warmth: 2 },
  turtleneck: { cat: 'top', label: 'Turtleneck', formality: 3, warmth: 2 },
  cardigan: { cat: 'top', label: 'Cardigan', formality: 3, warmth: 2 },
  quarter_zip: { cat: 'top', label: 'Quarter-zip pullover', formality: 2, warmth: 2 },
  sweater_vest: { cat: 'top', label: 'Sweater vest', formality: 3, warmth: 1 },
  jersey: { cat: 'top', label: 'Sports / team jersey', formality: 1, warmth: 0 },
  sweatshirt: { cat: 'top', label: 'Sweatshirt', formality: 1, warmth: 2 },
  hoodie: { cat: 'top', label: 'Hoodie', formality: 1, warmth: 2 },
  // bottoms
  jeans: { cat: 'bottom', label: 'Jeans', formality: 2, warmth: 1 },
  chinos: { cat: 'bottom', label: 'Chinos', formality: 3, warmth: 1 },
  trousers: { cat: 'bottom', label: 'Dress trousers', formality: 4, warmth: 1 },
  linen_trousers: { cat: 'bottom', label: 'Linen trousers', formality: 3, warmth: 0 },
  cargo: { cat: 'bottom', label: 'Cargo pants', formality: 1, warmth: 1 },
  joggers: { cat: 'bottom', label: 'Joggers / sweats', formality: 1, warmth: 1, athletic: true },
  athletic_shorts: { cat: 'bottom', label: 'Athletic shorts', formality: 1, warmth: 0, athletic: true },
  shorts: { cat: 'bottom', label: 'Shorts', formality: 1, warmth: 0 },
  skirt: { cat: 'bottom', label: 'Skirt', formality: 3, warmth: 0 },
  leggings: { cat: 'bottom', label: 'Leggings', formality: 1, warmth: 1, athletic: true },
  // one-piece
  dress: { cat: 'onepiece', label: 'Dress', formality: 3, warmth: 0 },
  jumpsuit: { cat: 'onepiece', label: 'Jumpsuit', formality: 3, warmth: 1 },
  // outerwear
  denim_jacket: { cat: 'outerwear', label: 'Denim jacket', formality: 2, warmth: 1 },
  bomber: { cat: 'outerwear', label: 'Bomber', formality: 2, warmth: 1 },
  varsity_jacket: { cat: 'outerwear', label: 'Varsity / letterman jacket', formality: 1, warmth: 1 },
  pea_coat: { cat: 'outerwear', label: 'Pea coat', formality: 3, warmth: 3 },
  leather_jacket: { cat: 'outerwear', label: 'Leather jacket', formality: 2, warmth: 1 },
  overshirt: { cat: 'outerwear', label: 'Overshirt / shacket', formality: 2, warmth: 1 },
  chore_coat: { cat: 'outerwear', label: 'Chore / field jacket', formality: 2, warmth: 1 },
  vest: { cat: 'outerwear', label: 'Vest / gilet', formality: 2, warmth: 1 },
  barn_jacket: { cat: 'outerwear', label: 'Barn / quilted jacket', formality: 3, warmth: 2 },
  blazer: { cat: 'outerwear', label: 'Blazer / sport coat', formality: 4, warmth: 1 },
  suit_jacket: { cat: 'outerwear', label: 'Suit jacket', formality: 5, warmth: 1 },
  rain_jacket: { cat: 'outerwear', label: 'Rain jacket', formality: 1, warmth: 1, rain: true },
  fleece: { cat: 'outerwear', label: 'Fleece', formality: 1, warmth: 2 },
  overcoat: { cat: 'outerwear', label: 'Overcoat / trench', formality: 4, warmth: 3, rain: true },
  parka: { cat: 'outerwear', label: 'Parka / puffer', formality: 1, warmth: 3 },
  // shoes
  sneakers: { cat: 'shoes', label: 'Sneakers', formality: 1, warmth: 1 },
  leather_sneakers: { cat: 'shoes', label: 'Leather sneakers', formality: 2, warmth: 1 },
  running: { cat: 'shoes', label: 'Running / training shoes', formality: 1, warmth: 1, athletic: true },
  boots: { cat: 'shoes', label: 'Chelsea / chukka boots', formality: 3, warmth: 2, rain: true },
  work_boots: { cat: 'shoes', label: 'Work / hiking boots', formality: 2, warmth: 2, rain: true },
  loafers: { cat: 'shoes', label: 'Loafers', formality: 3, warmth: 1 },
  boat_shoes: { cat: 'shoes', label: 'Boat shoes / drivers', formality: 2, warmth: 0 },
  dress_shoes: { cat: 'shoes', label: 'Dress shoes', formality: 5, warmth: 1 },
  heels: { cat: 'shoes', label: 'Heels', formality: 4, warmth: 1 },
  flats: { cat: 'shoes', label: 'Flats', formality: 3, warmth: 1 },
  sandals: { cat: 'shoes', label: 'Sandals / slides', formality: 1, warmth: 0 },
  // accessories (kept in the closet; not used when building outfits yet)
  belt: { cat: 'accessory', label: 'Belt', formality: 3, warmth: 0 },
  hat: { cat: 'accessory', label: 'Hat / cap', formality: 1, warmth: 1 },
  scarf: { cat: 'accessory', label: 'Scarf', formality: 3, warmth: 2 },
  bag: { cat: 'accessory', label: 'Bag', formality: 2, warmth: 0 },
  watch: { cat: 'accessory', label: 'Watch / jewelry', formality: 3, warmth: 0 },
};

export const typesFor = (cat) => Object.entries(TYPES).filter(([, t]) => t.cat === cat).map(([key, t]) => ({ key, ...t }));

// neutral: goes with nearly everything. soft: muted color that behaves almost like a neutral.
export const COLORS = [
  { key: 'white', label: 'White', hex: '#F4F4F2', neutral: true },
  { key: 'cream', label: 'Cream', hex: '#EBE2CC', neutral: true },
  { key: 'light_grey', label: 'Light grey', hex: '#C6C6C6', neutral: true },
  { key: 'grey', label: 'Grey', hex: '#8A8A8A', neutral: true },
  { key: 'charcoal', label: 'Charcoal', hex: '#3C3C3E', neutral: true },
  { key: 'black', label: 'Black', hex: '#141414', neutral: true },
  { key: 'navy', label: 'Navy', hex: '#1F2A44', neutral: true },
  { key: 'light_denim', label: 'Light denim', hex: '#7E9CBF', neutral: true },
  { key: 'dark_denim', label: 'Dark denim', hex: '#2C3A57', neutral: true },
  { key: 'khaki', label: 'Khaki / tan', hex: '#C2A883', neutral: true },
  { key: 'camel', label: 'Camel', hex: '#B07F4F', neutral: true },
  { key: 'brown', label: 'Brown', hex: '#5A3A22', neutral: true },
  { key: 'olive', label: 'Olive', hex: '#5F6338', neutral: true },
  { key: 'light_blue', label: 'Light blue', hex: '#A8C5E6', soft: true },
  { key: 'sage', label: 'Sage', hex: '#9CAF94', soft: true },
  { key: 'blush', label: 'Blush', hex: '#E8C2C0', soft: true },
  { key: 'burgundy', label: 'Burgundy', hex: '#6B1C2A' },
  { key: 'red', label: 'Red', hex: '#C42B2B' },
  { key: 'rust', label: 'Rust', hex: '#A4502A' },
  { key: 'orange', label: 'Orange', hex: '#E27D2B' },
  { key: 'mustard', label: 'Mustard', hex: '#C9A227' },
  { key: 'yellow', label: 'Yellow', hex: '#F0D44A' },
  { key: 'green', label: 'Green', hex: '#2F8A3E' },
  { key: 'forest', label: 'Forest green', hex: '#1F4A36' },
  { key: 'teal', label: 'Teal', hex: '#1B7A7C' },
  { key: 'blue', label: 'Blue', hex: '#2D63B0' },
  { key: 'purple', label: 'Purple', hex: '#5E3F8C' },
  { key: 'lavender', label: 'Lavender', hex: '#C3B1E1', soft: true },
  { key: 'pink', label: 'Pink', hex: '#EE8FB4' },
  { key: 'multi', label: 'Multicolor', hex: '#888888' },
];

export const COLOR_BY_KEY = Object.fromEntries(COLORS.map((c) => [c.key, c]));

// Pattern names follow Fashionpedia's "textile pattern" attributes (CC BY 4.0).
// level drives the pattern-mixing rules: solid < texture < mid < loud.
export const PATTERNS = [
  { key: 'solid', label: 'Plain / solid', level: 'solid' },
  { key: 'texture', label: 'Subtle texture', level: 'texture' },
  { key: 'herringbone', label: 'Herringbone', level: 'texture' },
  { key: 'houndstooth', label: 'Houndstooth', level: 'mid' },
  { key: 'stripe', label: 'Stripe', level: 'mid' },
  { key: 'check', label: 'Check / plaid / tartan', level: 'mid' },
  { key: 'argyle', label: 'Argyle', level: 'mid' },
  { key: 'dot', label: 'Dot', level: 'mid' },
  { key: 'geometric', label: 'Geometric', level: 'mid' },
  { key: 'fair_isle', label: 'Fair isle', level: 'mid' },
  { key: 'floral', label: 'Floral', level: 'loud' },
  { key: 'paisley', label: 'Paisley', level: 'loud' },
  { key: 'camouflage', label: 'Camouflage', level: 'loud' },
  { key: 'animal', label: 'Animal print', level: 'loud' },
  { key: 'print', label: 'Bold print / graphic', level: 'loud' },
];
export const PATTERN_LEVEL = Object.fromEntries(PATTERNS.map((p) => [p.key, p.level]));

// Fit follows Fashionpedia's silhouette attributes (tight / regular / loose / oversized).
export const FITS = [
  { key: 'slim', label: 'Slim / tailored' },
  { key: 'regular', label: 'Regular' },
  { key: 'relaxed', label: 'Relaxed / loose' },
  { key: 'oversized', label: 'Oversized' },
];

// Main fabric. Leather types (suede, shearling) come from Fashionpedia; the
// rest are the fabrics the Aesthetics Wiki pages name for each style.
export const MATERIALS = [
  { key: 'cotton', label: 'Cotton' },
  { key: 'linen', label: 'Linen' },
  { key: 'wool', label: 'Wool' },
  { key: 'cashmere', label: 'Cashmere' },
  { key: 'tweed', label: 'Tweed' },
  { key: 'knit', label: 'Chunky / cable knit' },
  { key: 'denim', label: 'Denim' },
  { key: 'corduroy', label: 'Corduroy' },
  { key: 'flannel', label: 'Flannel' },
  { key: 'silk', label: 'Silk' },
  { key: 'leather', label: 'Leather' },
  { key: 'suede', label: 'Suede' },
  { key: 'shearling', label: 'Shearling' },
  { key: 'waxed', label: 'Waxed cotton' },
  { key: 'canvas', label: 'Canvas / duck' },
  { key: 'jersey', label: 'Jersey / sweat' },
  { key: 'fleece', label: 'Fleece' },
  { key: 'technical', label: 'Technical / nylon' },
];

// Details from Fashionpedia's finishing and opening-type attributes.
export const DETAILS = [
  { key: 'distressed', label: 'Distressed / ripped' },
  { key: 'washed', label: 'Washed / faded' },
  { key: 'quilted', label: 'Quilted' },
  { key: 'double_breasted', label: 'Double-breasted' },
  { key: 'zip_up', label: 'Zip-up' },
  { key: 'cargo_pockets', label: 'Cargo pockets' },
  { key: 'embroidered', label: 'Embroidered' },
  { key: 'cable', label: 'Cable knit' },
];


export const WARMTH_LABELS = ['Light', 'Medium', 'Warm', 'Heavy'];
export const FORMALITY_LABELS = ['', 'Lounge', 'Casual', 'Smart', 'Business', 'Formal'];

export const OCCASIONS = [
  { key: 'casual', label: 'Casual', target: 1.6, min: 1, max: 3 },
  { key: 'smart_casual', label: 'Smart casual', target: 2.6, min: 2, max: 4 },
  { key: 'office', label: 'Business casual', target: 3.2, min: 2, max: 4 },
  { key: 'business', label: 'Business formal', target: 4.4, min: 3, max: 5 },
  { key: 'date', label: 'Date night', target: 2.9, min: 2, max: 5 },
  { key: 'workout', label: 'Workout', target: 1, min: 1, max: 1, athletic: true },
  { key: 'lounge', label: 'Lounge', target: 1, min: 1, max: 2 },
];

export const OCCASION_BY_KEY = Object.fromEntries(OCCASIONS.map((o) => [o.key, o]));
