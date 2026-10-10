// Card decks. Text may use {sips:N} and {finish}; see spice.ts.

export type PackId = 'classic' | 'kitchen' | 'trickshots' | 'afterdark';
export type CardKind = 'dare' | 'rule' | 'trick' | 'vote';

export interface Card {
  id: string;
  pack: PackId;
  kind: CardKind;
  text: string;
}

export interface Pack {
  id: PackId;
  name: string;
  emoji: string;
  description: string;
  premium: boolean;
  /** Display price; real price comes from the store once IAP is wired up. */
  price?: string;
}

export const PACKS: Pack[] = [
  { id: 'classic', name: 'Classic Dink', emoji: '🥒', description: 'The starter deck. Dares, rules & votes.', premium: false },
  { id: 'kitchen', name: 'Kitchen Nightmares', emoji: '🔥', description: 'Spicier dares and chaotic house rules.', premium: true, price: '$2.99' },
  { id: 'trickshots', name: 'Trick Shot Tour', emoji: '🎯', description: 'Behind-the-back, ernes, ATPs. Film everything.', premium: true, price: '$2.99' },
  { id: 'afterdark', name: 'After Dark', emoji: '🌙', description: 'For the 4th game when nobody is keeping score.', premium: true, price: '$2.99' },
];

const c = (pack: PackId, kind: CardKind, texts: string[]): Card[] =>
  texts.map((text, i) => ({ id: `${pack}-${kind}-${i}`, pack, kind, text }));

export const CARDS: Card[] = [
  ...c('classic', 'dare', [
    'Your next serve must be underhand… with your non-dominant hand. Miss it and {sips:1}.',
    'Call the score in your best sports-announcer voice for the rest of the game.',
    'Every time you hit the net this game, {sips:1}.',
    'Swap paddles with your opponent for the next 3 rallies.',
    'You must yell "PICKLE!" before every shot next rally. Forget once and {sips:2}.',
    'High-five everyone on court. Whoever gives the weakest high-five must {sips:1}.',
    'Next point, you can only hit dinks. Lose the point and {sips:1}.',
    'Do your best victory dance right now. Group votes: lame dance means {sips:1}.',
    'Play the next rally on one foot as much as you can.',
    'Give your partner a pep talk like they are about to play the championship.',
  ]),
  ...c('classic', 'rule', [
    'HOUSE RULE: Nobody can say "out". Say "pickle" instead. Violators {sips:1}.',
    'HOUSE RULE: Hit the ball into the kitchen on a serve? {sips:2}.',
    'HOUSE RULE: Whoever wins a rally with a lob gets to make someone {sips:1}.',
    'HOUSE RULE: Before serving, the server must compliment an opponent.',
    'HOUSE RULE: Any ball that hits a body = the hit player {sips:1}.',
    'HOUSE RULE: 10+ shot rally? Everyone {sips:1} to celebrate.',
    'HOUSE RULE: Teams must celebrate every point with a coordinated handshake.',
    'HOUSE RULE: Last person to touch their nose after a side-out must {sips:1}.',
  ]),
  ...c('classic', 'vote', [
    'VOTE: Who has the worst serve on court? They {sips:2}.',
    'VOTE: Who complains about line calls the most? They {sips:1}.',
    'VOTE: Who has the best outfit? They give out {sips:3} however they want.',
    'VOTE: Who would win in a 1v1? Everyone else {sips:1}.',
    'VOTE: Most likely to blame their paddle. They {sips:1}.',
  ]),
  ...c('kitchen', 'dare', [
    'You must stand in the kitchen for the entire next rally. Every volley costs you {sips:1}.',
    'Your opponents choose your next shot: drive, drop or lob. Disobey and {sips:2}.',
    'For the rest of the game, you must serve with your eyes closed. Faults cost {sips:1}.',
    'Trade one item of clothing (hat, sunglasses, sweatband) with an opponent.',
    'Speak only in pickle puns until you win a rally. Every miss costs {sips:1}.',
    'Next rally, if you lose it you {finish}.',
    'Challenge an opponent to a dink-off. First to miss must {sips:3}.',
  ]),
  ...c('kitchen', 'rule', [
    'HOUSE RULE: Ernes are worth 2 points this game.',
    'HOUSE RULE: Every side-out, the team losing serve must {sips:1}.',
    'HOUSE RULE: You must call "kitchen!" when stepping in. Forget? {sips:2}.',
    'HOUSE RULE: Loudest celebrator each rally picks who drinks. They make someone {sips:1}.',
  ]),
  ...c('trickshots', 'trick', [
    'TRICK SHOT: Return a dink behind your back. Land it and give out {sips:3}.',
    'TRICK SHOT: Hit an Around-The-Post this game and your opponents {finish}.',
    'TRICK SHOT: Land a between-the-legs shot. Miss = {sips:1}, make = everyone else {sips:2}.',
    'TRICK SHOT: Attempt an Erne this game. Pull it off and the other team {sips:3}.',
    'TRICK SHOT: Serve and hit the paddle-handle "tweener". Film it for the group chat.',
    'TRICK SHOT: Return a lob with a jump overhead. Land it and pick a house rule.',
  ]),
  ...c('afterdark', 'dare', [
    'Text your ex your pickleball rating. Or {finish}.',
    'Let the opposing team post one photo on your story.',
    'Do your best impression of each player on court. Worst impression vote: {sips:2}.',
    'Tell the group your most embarrassing pickleball moment or {sips:3}.',
    'Serenade your partner for 15 seconds before the next serve.',
  ]),
  ...c('afterdark', 'vote', [
    'VOTE: Who is most likely to cry after losing? They {sips:2}.',
    'VOTE: Who takes pickleball way too seriously? They {sips:2}.',
    'VOTE: Who would you least want as a partner at nationals? They {sips:1}.',
  ]),
];

export function cardsForPacks(packs: PackId[]): Card[] {
  return CARDS.filter((card) => packs.includes(card.pack));
}

export function drawCard(
  deck: Card[],
  recent: string[] = [],
  rng: () => number = Math.random,
): Card | null {
  if (deck.length === 0) return null;
  const fresh = deck.filter((card) => !recent.includes(card.id));
  const pool = fresh.length > 0 ? fresh : deck;
  return pool[Math.floor(rng() * pool.length)];
}
