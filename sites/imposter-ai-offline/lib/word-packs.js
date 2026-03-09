export const WORD_PACKS = [
  ['Pizza', 'Burger'],
  ['Beach', 'Pool'],
  ['Laptop', 'Tablet'],
  ['Cat', 'Dog'],
  ['Coffee', 'Tea'],
  ['Winter', 'Autumn'],
  ['Football', 'Basketball'],
  ['YouTube', 'TikTok'],
  ['Mountains', 'Forest'],
  ['Museum', 'Library']
];

export function pickWordPair() {
  return WORD_PACKS[Math.floor(Math.random() * WORD_PACKS.length)];
}
