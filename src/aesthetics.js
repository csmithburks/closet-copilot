/**
 * Style vibes, built by combining two sources:
 *
 *  • Aesthetics Wiki (aesthetics.fandom.com, community content under CC BY-SA)
 *    — what pieces, colors, fabrics and patterns define each look.
 *  • Fashionpedia (fashionpedia.github.io, ontology under CC BY 4.0)
 *    — the vocabulary those rules are written in: pattern, fit (silhouette),
 *    leather types and finishing details.
 *
 * Fields
 *   like / dislike        clothing types (catalog.js) the source names / rejects
 *   also                  common menswear conventions added on top of the
 *                         source — they count, but less than `like`
 *   palette, avoidColors  color keys
 *   patterns, avoidPatterns, materials, avoidMaterials, fits, avoidFits,
 *   details, avoidDetails Fashionpedia-style attributes
 *   graphics              'avoid' | 'ok' | 'boost' for visible logos/graphics
 *   formalityShift        added to the occasion's target dressiness
 *   signatures            defining color pairs, with the reason shown to the user
 *   source                where the `like` rules come from
 */

const WIKI = (page) => ({ name: `Aesthetics Wiki — ${page.replace(/_/g, ' ')}`, url: `https://aesthetics.fandom.com/wiki/${page}` });

export const SOURCES = [
  {
    name: 'Aesthetics Wiki',
    url: 'https://aesthetics.fandom.com',
    license: 'Community content, CC BY-SA',
    used: 'Which pieces, colors, fabrics and patterns define each vibe',
  },
  {
    name: 'Fashionpedia (Jia et al., ECCV 2020)',
    url: 'https://fashionpedia.github.io/home/',
    license: 'Ontology and annotations, CC BY 4.0',
    used: 'Vocabulary for patterns, fit/silhouette, leather types and finishing details',
  },
];

export const AESTHETICS = [
  {
    key: 'old_money',
    label: 'Old money',
    blurb: 'Understated elegance: tailored, logo-free classics in a muted palette — plain-looking but high quality.',
    source: WIKI('Old_Money'),
    // Wiki: navy blazers, tailored suits, tailored shirts, turtlenecks, wool & trench coats, oxfords.
    like: ['blazer', 'suit_jacket', 'dress_shirt', 'oxford', 'turtleneck', 'overcoat', 'trousers', 'dress_shoes'],
    also: ['sweater', 'cardigan', 'knit_polo', 'chinos', 'loafers', 'pea_coat', 'linen_shirt', 'linen_trousers', 'boots'],
    dislike: ['hoodie', 'sweatshirt', 'joggers', 'cargo', 'athletic_shorts', 'athletic_top', 'tank', 'leggings', 'running', 'parka', 'fleece', 'jersey', 'varsity_jacket'],
    // Wiki: "muted palette", with black and purple also used; navy blazers.
    palette: ['navy', 'charcoal', 'grey', 'light_grey', 'black', 'cream', 'camel', 'khaki', 'brown', 'white', 'purple', 'burgundy', 'forest'],
    avoidColors: ['red', 'orange', 'yellow', 'pink', 'teal', 'multi', 'lavender'],
    patterns: ['solid', 'texture', 'herringbone', 'houndstooth'],
    avoidPatterns: ['print', 'camouflage', 'animal', 'floral', 'paisley'],
    // Wiki: wool, silk, cashmere, leather.
    materials: ['wool', 'cashmere', 'silk', 'leather', 'suede', 'linen', 'tweed'],
    avoidMaterials: ['fleece', 'technical', 'jersey'],
    fits: ['slim', 'regular'], // wiki: tailored
    avoidFits: ['oversized'],
    avoidDetails: ['distressed', 'cargo_pockets'],
    graphics: 'avoid', // wiki: designer pieces without logos
    formalityShift: 0.4,
    signatures: [
      ['navy', 'grey', 'Navy tailoring over grey — understated elegance'],
      ['camel', 'charcoal', 'Camel and charcoal reads quietly expensive'],
      ['navy', 'cream', 'Navy and cream is muted and refined'],
      ['black', 'camel', 'Black with camel is classic old money'],
    ],
  },
  {
    key: 'preppy',
    label: 'Preppy',
    blurb: 'Ivy-league classics with color: oxford button-downs, polos, chinos, cable knits and plenty of pattern.',
    source: WIKI('Preppy'),
    // Wiki (menswear): OCBDs, polos, chinos, Nantucket Reds, slacks, cardigans, Aran/cable knits,
    // blazers, trench & pea coats, wax jackets, vests, field jackets; boat shoes, loafers,
    // duck boots, white tennis shoes, black dress shoes.
    like: ['oxford', 'polo', 'chinos', 'shorts', 'trousers', 'cardigan', 'sweater', 'blazer', 'overcoat', 'pea_coat', 'barn_jacket', 'vest', 'chore_coat', 'boat_shoes', 'loafers', 'work_boots', 'leather_sneakers', 'dress_shoes'],
    also: ['knit_polo', 'quarter_zip', 'sweater_vest', 'sneakers'],
    dislike: ['hoodie', 'cargo', 'joggers', 'athletic_top', 'leggings', 'jersey', 'parka'],
    // Wiki: navy, Nantucket Red (salmon/pale red), pastels.
    palette: ['navy', 'red', 'pink', 'blush', 'light_blue', 'lavender', 'sage', 'white', 'khaki', 'cream', 'green', 'forest', 'yellow'],
    avoidColors: ['black'],
    // Wiki: argyle, check/gingham/madras/tartan/plaid, stripes (nautical), critters, monograms.
    patterns: ['solid', 'argyle', 'check', 'stripe', 'houndstooth', 'texture'],
    avoidPatterns: ['camouflage', 'animal'],
    // Wiki: cotton, silk, tweed, waxed fabric, knit wool.
    materials: ['cotton', 'silk', 'tweed', 'waxed', 'wool', 'knit'],
    avoidMaterials: ['technical'],
    fits: ['regular', 'slim'],
    avoidFits: ['oversized'],
    details: ['cable', 'double_breasted', 'quilted'],
    avoidDetails: ['distressed'],
    graphics: 'ok',
    formalityShift: 0.2,
    signatures: [
      ['navy', 'khaki', 'Navy and khaki — the prep foundation'],
      ['red', 'navy', 'Nantucket red with navy is peak preppy'],
      ['pink', 'navy', 'Pink and navy is classic prep'],
      ['light_blue', 'khaki', 'Light blue oxford and khakis — Ivy uniform'],
    ],
  },
  {
    key: 'minimalist',
    label: 'Clean minimal',
    blurb: 'Simple and quiet: white tees, button-ups, khaki or black trousers and jeans — no bold or bright colors.',
    source: WIKI('Minimalism'),
    // Wiki: white t-shirts, collared/button-up shirts, khaki or black pants, jeans; no bold/bright colors.
    like: ['tshirt', 'oxford', 'dress_shirt', 'chinos', 'trousers', 'jeans'],
    also: ['sweater', 'turtleneck', 'overcoat', 'leather_sneakers', 'boots', 'loafers'],
    dislike: ['jersey', 'cargo', 'varsity_jacket', 'athletic_top', 'parka'],
    palette: ['white', 'black', 'khaki', 'grey', 'light_grey', 'charcoal', 'cream', 'navy', 'camel', 'dark_denim'],
    avoidColors: ['red', 'orange', 'yellow', 'pink', 'purple', 'green', 'teal', 'multi', 'mustard', 'blue', 'lavender'],
    patterns: ['solid', 'texture'],
    avoidPatterns: ['print', 'check', 'stripe', 'argyle', 'floral', 'paisley', 'camouflage', 'animal', 'geometric', 'dot', 'fair_isle'],
    materials: ['cotton', 'wool', 'cashmere', 'linen'],
    fits: ['regular', 'slim'],
    avoidDetails: ['distressed', 'embroidered', 'cargo_pockets'],
    graphics: 'avoid',
    formalityShift: 0.2,
    signatures: [
      ['white', 'khaki', 'White and khaki — minimal at its simplest'],
      ['white', 'black', 'Black and white keeps it quiet and sharp'],
      ['grey', 'charcoal', 'Tonal greys stay calm'],
    ],
  },
  {
    key: 'streetwear',
    label: 'Streetwear',
    blurb: 'Comfortable and logo-forward: jeans, printed tees, sneakers, letterman and workwear jackets, oversized fits.',
    source: WIKI('Streetwear'),
    // Wiki: jeans, T-shirts, sneakers, letterman jackets, workwear (Carhartt) jackets, oversized jerseys,
    // printed/embroidered tees and jackets, Timberland boots, Dr. Martens; prominent logos.
    like: ['jeans', 'tshirt', 'sneakers', 'varsity_jacket', 'chore_coat', 'jersey', 'work_boots', 'boots'],
    also: ['hoodie', 'sweatshirt', 'cargo', 'joggers', 'bomber', 'parka', 'denim_jacket', 'leather_sneakers', 'running', 'shorts'],
    dislike: ['dress_shirt', 'trousers', 'blazer', 'suit_jacket', 'dress_shoes', 'loafers', 'boat_shoes', 'cardigan'],
    palette: ['black', 'white', 'grey', 'olive', 'charcoal', 'light_denim', 'dark_denim', 'red', 'blue', 'orange', 'multi', 'cream'],
    avoidColors: [],
    patterns: ['solid', 'print', 'camouflage'],
    avoidPatterns: [],
    materials: ['denim', 'jersey', 'canvas', 'cotton', 'leather', 'technical'],
    fits: ['oversized', 'relaxed'], // wiki: oversized jerseys
    avoidFits: ['slim'],
    details: ['embroidered', 'cargo_pockets', 'washed'],
    graphics: 'boost', // wiki: brand, team and record-label logos
    formalityShift: -0.5,
    signatures: [
      ['black', 'olive', 'Black and olive is a streetwear staple'],
      ['white', 'light_denim', 'White tee and washed denim — streetwear basics'],
    ],
  },
  {
    key: 'workwear',
    label: 'Workwear / Americana',
    blurb: 'Rugged American basics: blue jeans, white tees, flannel, leather jackets and heavy boots.',
    source: WIKI('Americana'),
    // Wiki: leather jackets, T-shirts, flannel shirts, heavy-duty workwear, blue jeans,
    // heavy leather / Timberland / cowboy boots; denim, flannel, leather.
    like: ['leather_jacket', 'tshirt', 'flannel', 'jeans', 'work_boots', 'boots', 'chore_coat'],
    also: ['henley', 'denim_jacket', 'overshirt', 'barn_jacket', 'vest', 'chinos', 'cargo', 'oxford'],
    dislike: ['dress_shirt', 'trousers', 'suit_jacket', 'dress_shoes', 'loafers', 'athletic_top', 'leggings', 'running', 'boat_shoes'],
    // Wiki (Western): tan, sage, mustard; plus denim blues and leather browns.
    palette: ['dark_denim', 'light_denim', 'khaki', 'sage', 'mustard', 'brown', 'white', 'olive', 'rust', 'navy', 'cream', 'black', 'red'],
    avoidColors: ['pink', 'lavender', 'purple'],
    patterns: ['solid', 'check', 'texture'],
    avoidPatterns: ['floral', 'paisley'],
    materials: ['denim', 'flannel', 'leather', 'canvas', 'corduroy', 'suede', 'waxed', 'cotton'],
    avoidMaterials: ['silk', 'cashmere'],
    fits: ['regular', 'relaxed'],
    details: ['washed', 'quilted'],
    graphics: 'ok',
    formalityShift: -0.2,
    signatures: [
      ['white', 'dark_denim', 'White tee and blue jeans — pure Americana'],
      ['brown', 'dark_denim', 'Brown leather and denim — rugged classic'],
      ['red', 'dark_denim', 'Red flannel with denim is workwear canon'],
    ],
  },
  {
    key: 'coastal',
    label: 'Coastal',
    blurb: 'Loose, breathable and relaxed: white button-downs, linen, straight denim, chunky knits and nautical stripes.',
    source: WIKI('Coastal_Grandmother'),
    // Wiki: white button-down, straight-leg denim, wide-leg cropped pants, chunky knit sweater,
    // linen; sandals; nautical stripes; linen, gauze, terry, chunky knit, denim; loose fits.
    like: ['oxford', 'linen_shirt', 'jeans', 'linen_trousers', 'sweater', 'sandals'],
    also: ['knit_polo', 'polo', 'tshirt', 'shorts', 'chinos', 'boat_shoes', 'loafers', 'leather_sneakers', 'cardigan'],
    dislike: ['hoodie', 'parka', 'fleece', 'work_boots', 'cargo', 'joggers', 'jersey', 'leather_jacket'],
    palette: ['white', 'cream', 'light_blue', 'navy', 'sage', 'khaki', 'blush', 'light_grey', 'light_denim'],
    avoidColors: ['black', 'charcoal', 'burgundy', 'purple', 'orange'],
    patterns: ['solid', 'stripe', 'texture'],
    avoidPatterns: ['camouflage', 'animal', 'print'],
    materials: ['linen', 'knit', 'denim', 'cotton'],
    avoidMaterials: ['technical', 'fleece', 'leather'],
    fits: ['relaxed', 'regular'], // wiki: loose, straight, wide-leg
    details: ['cable'],
    graphics: 'avoid',
    formalityShift: 0,
    signatures: [
      ['white', 'light_denim', 'White button-down and light denim — coastal classic'],
      ['white', 'navy', 'Navy and white feels nautical'],
      ['cream', 'khaki', 'Cream and khaki linen is breezy'],
    ],
  },
  {
    key: 'dark_academia',
    label: 'Dark academia',
    blurb: '1940s prep-school uniforms: turtlenecks, oxfords, fisherman sweaters, tweed and plaid in earthy dark tones.',
    source: WIKI('Dark_Academia'),
    // Wiki: turtlenecks, oxford shirts, fisherman sweaters, sweater vests, t-shirts, cable knits;
    // dress pants, trousers, tweed trousers; cardigans, blazers, waistcoats, pea coats,
    // double-breasted jackets, trench coats, overcoats; oxfords/brogues, loafers, boat shoes, Dr. Martens.
    like: ['turtleneck', 'oxford', 'sweater', 'sweater_vest', 'tshirt', 'trousers', 'chinos', 'cardigan', 'blazer', 'vest', 'pea_coat', 'suit_jacket', 'overcoat', 'dress_shoes', 'loafers', 'boat_shoes', 'boots'],
    also: ['dress_shirt', 'knit_polo', 'barn_jacket'],
    dislike: ['hoodie', 'athletic_top', 'athletic_shorts', 'joggers', 'cargo', 'running', 'sandals', 'jersey', 'varsity_jacket', 'parka'],
    // Wiki: black, grey, beige, brown, cream, ivory, dark green, burgundy, soft yellow.
    palette: ['black', 'grey', 'charcoal', 'khaki', 'brown', 'cream', 'white', 'forest', 'burgundy', 'mustard', 'camel'],
    avoidColors: ['pink', 'light_blue', 'orange', 'lavender', 'teal', 'blue', 'red'],
    patterns: ['check', 'herringbone', 'houndstooth', 'texture', 'solid'], // wiki: plaid, tweed
    avoidPatterns: ['print', 'camouflage', 'floral'],
    // Wiki: cashmere, wool, tweed, linen, cotton.
    materials: ['cashmere', 'wool', 'tweed', 'linen', 'cotton', 'corduroy', 'knit'],
    avoidMaterials: ['technical', 'fleece', 'jersey'],
    fits: ['regular', 'slim'],
    details: ['cable', 'double_breasted'],
    avoidDetails: ['distressed'],
    graphics: 'avoid',
    formalityShift: 0.3,
    signatures: [
      ['burgundy', 'brown', 'Burgundy and brown — dark academia in two colors'],
      ['forest', 'cream', 'Dark green and cream feels library-chic'],
      ['charcoal', 'camel', 'Charcoal and camel is moody and scholarly'],
    ],
  },
  {
    key: 'athleisure',
    label: 'Athleisure',
    blurb: 'Comfortable, sporty and put-together: performance pieces worn outside the gym.',
    source: null, // No usable Aesthetics Wiki page — these rules are general convention.
    like: [],
    also: ['athletic_top', 'tshirt', 'hoodie', 'sweatshirt', 'quarter_zip', 'joggers', 'leggings', 'athletic_shorts', 'fleece', 'parka', 'running', 'sneakers', 'leather_sneakers'],
    dislike: ['dress_shirt', 'trousers', 'blazer', 'suit_jacket', 'dress_shoes', 'loafers', 'heels'],
    palette: ['black', 'grey', 'charcoal', 'white', 'navy', 'olive', 'light_grey', 'sage'],
    avoidColors: [],
    patterns: ['solid', 'texture'],
    avoidPatterns: ['floral', 'paisley'],
    materials: ['technical', 'jersey', 'fleece'],
    avoidMaterials: ['tweed', 'silk', 'linen'],
    fits: ['regular', 'relaxed'],
    details: ['zip_up'],
    graphics: 'ok',
    formalityShift: -0.6,
    allowAthletic: true,
    signatures: [['black', 'grey', 'Black and grey keeps athleisure sleek']],
  },
];

export const AESTHETIC_BY_KEY = Object.fromEntries(AESTHETICS.map((a) => [a.key, a]));
