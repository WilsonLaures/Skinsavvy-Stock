// data/defaultCategories.js
// Seed data for Category Master — loaded once on first run.
// Add or remove entries here to change what new users see on first launch.

const DEFAULT_CATEGORIES = [
  { name: 'Skincare',                parent: '',             desc: 'All skincare products' },
  { name: 'Toner & Essence',         parent: 'Skincare',     desc: 'Hydrating toners and essences' },
  { name: 'Moisturizer & Cream',     parent: 'Skincare',     desc: 'Day and night creams, gel moisturizers' },
  { name: 'Serum & Ampoule',         parent: 'Skincare',     desc: 'Targeted treatment serums' },
  { name: 'Sunscreen & SPF',         parent: 'Skincare',     desc: 'Sun protection products' },
  { name: 'Cleanser & Face Wash',    parent: 'Skincare',     desc: 'Foam, gel, oil, and micellar cleansers' },
  { name: 'Face Mask & Sheet Mask',  parent: 'Skincare',     desc: 'Clay masks, sheet masks, wash-offs' },
  { name: 'Eye Cream',               parent: 'Skincare',     desc: 'Under-eye treatments and patches' },
  { name: 'Exfoliator & Scrub',      parent: 'Skincare',     desc: 'Chemical and physical exfoliants' },
  { name: 'Lip Care',                parent: 'Skincare',     desc: 'Lip balms, treatments, and scrubs' },

  { name: 'Makeup',                  parent: '',             desc: 'All makeup and colour cosmetics' },
  { name: 'Foundation & BB Cream',   parent: 'Makeup',       desc: 'Liquid, powder, and cushion foundations' },
  { name: 'Concealer',               parent: 'Makeup',       desc: 'Full coverage concealers and correctors' },
  { name: 'Blush & Bronzer',         parent: 'Makeup',       desc: 'Powder and cream blush, contour, bronzer' },
  { name: 'Highlighter',             parent: 'Makeup',       desc: 'Illuminating powders and liquids' },
  { name: 'Eyeshadow',               parent: 'Makeup',       desc: 'Palettes, singles, and duos' },
  { name: 'Eyeliner & Kohl',         parent: 'Makeup',       desc: 'Pencil, liquid, and gel liners' },
  { name: 'Mascara',                 parent: 'Makeup',       desc: 'Volumising, lengthening, and curling mascaras' },
  { name: 'Eyebrow',                 parent: 'Makeup',       desc: 'Brow pencils, pomades, and gels' },
  { name: 'Lip Colour',              parent: 'Makeup',       desc: 'Lipsticks, lip tints, liquid lips, glosses' },
  { name: 'Setting Powder & Spray',  parent: 'Makeup',       desc: 'Finishing and setting products' },
  { name: 'Primer',                  parent: 'Makeup',       desc: 'Face, eye, and lip primers' },

  { name: 'Makeup Tools',            parent: '',             desc: 'Applicators and makeup accessories' },
  { name: 'Makeup Brushes',          parent: 'Makeup Tools', desc: 'Face, eye, and lip brushes' },
  { name: 'Beauty Blender & Sponge', parent: 'Makeup Tools', desc: 'Applicator sponges and puffs' },
  { name: 'Eyelash & Curler',        parent: 'Makeup Tools', desc: 'False lashes, lash glue, curlers' },
  { name: 'Sharpener & Accessories', parent: 'Makeup Tools', desc: 'Pencil sharpeners and tool accessories' },
  { name: 'Brush Cleaner',           parent: 'Makeup Tools', desc: 'Brush cleaning sprays and tools' },

  { name: 'Beauty Care',             parent: '',             desc: 'Body and personal care' },
  { name: 'Body Lotion & Oil',       parent: 'Beauty Care',  desc: 'Moisturisers, oils, and body butters' },
  { name: 'Body Scrub & Exfoliator', parent: 'Beauty Care',  desc: 'Sugar scrubs and exfoliating treatments' },
  { name: 'Hand & Nail Care',        parent: 'Beauty Care',  desc: 'Hand creams, nail care, and polish' },
  { name: 'Hair Care',               parent: 'Beauty Care',  desc: 'Shampoo, conditioner, treatments' },
  { name: 'Fragrance & Perfume',     parent: 'Beauty Care',  desc: 'Eau de parfum, body mists, roll-ons' },
  { name: 'Feminine Care',           parent: 'Beauty Care',  desc: 'Intimate wash and feminine hygiene' },
];
