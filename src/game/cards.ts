// Card decks. Text may use {sips:N} and {finish}; see spice.ts.

export type PackId = 'classic' | 'kitchen' | 'trickshots' | 'afterdark' | 'datenight' | 'halloween' | 'custom';
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
  /** Display price; the real price comes from the store. */
  price?: string;
  /** Only offered to players who passed the 21+ gate, and needs couples to opt in. */
  adult?: boolean;
  /** Seasonal packs get a badge, and a home-screen banner during these months (0 = January). */
  season?: { badge: string; months: number[] };
}

export const PACKS: Pack[] = [
  { id: 'classic', name: 'Classic Dink', emoji: '🥒', description: 'The starter deck. Dares, rules & votes.', premium: false },
  { id: 'kitchen', name: 'Kitchen Nightmares', emoji: '🔥', description: 'Spicier dares and chaotic house rules.', premium: true, price: '$2.99' },
  { id: 'trickshots', name: 'Trick Shot Tour', emoji: '🎯', description: 'Behind-the-back, ernes, ATPs. Film everything.', premium: true, price: '$2.99' },
  { id: 'afterdark', name: 'After Dark', emoji: '🌙', description: 'For the 4th game when nobody is keeping score.', premium: true, price: '$2.99' },
  {
    id: 'halloween',
    name: 'Halloween Bash',
    emoji: '🎃',
    description: 'Zombie walks, mummy rallies, trick-or-treat dares and costume votes.',
    premium: true,
    price: '$2.99',
    season: { badge: '🎃 Limited time', months: [9] },
  },
  {
    id: 'datenight',
    name: 'Date Night',
    emoji: '💋',
    description: 'Flirty dares for couples doubles. Only ever involves your own partner.',
    premium: true,
    price: '$3.99',
    adult: true,
  },
];

/** Shown on a player's own cards (Pro feature, not sold separately). */
export const CUSTOM_PACK = { name: 'Your Crew', emoji: '✏️' };

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
    'HOUSE RULE: Any ball that hits a body: the player who got hit must {sips:1}.',
    'HOUSE RULE: 10+ shot rally? Everyone {sips:1} to celebrate.',
    'HOUSE RULE: Teams must celebrate every point with a coordinated handshake.',
    'HOUSE RULE: Last person to touch their nose after a side-out must {sips:1}.',
  ]),
  ...c('classic', 'vote', [
    'VOTE: Who has the worst serve on court? They {sips:2}.',
    'VOTE: Who complains about line calls the most? They {sips:1}.',
    'VOTE: Who has the best outfit? They pick anyone to {sips:3}.',
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
    'TRICK SHOT: Return a dink behind your back. Land it and the other team must {sips:3}.',
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
  // Date Night: every card involves only your own partner. Couples can always Pass.
  ...c('datenight', 'dare', [
    'Lose this rally? Your partner gets one free butt-slap. 🍑',
    'Win the next rally and collect a kiss from your partner. Lose it and you owe them a back rub tonight.',
    'Your partner picks your next shot. Refuse and you owe them a kiss in front of everyone.',
    "Whisper to your partner what you'd do if you win this game. They rate it 1-10. Under 5? {sips:1}.",
    'Dip your partner like a dance finale before your next serve.',
    'Compliment your partner on something that has nothing to do with pickleball. Blush and {sips:1}.',
    'Slow-dance with your partner for 10 seconds. Everyone else hums.',
    'Your partner renames you for the rest of the game. Everyone has to use it.',
    'Tell your partner, out loud, the moment you first thought they were hot.',
    'Next point you win, celebrate with a kiss from your partner. Forget and {sips:2}.',
    'Losing partner carries both paddles and both waters like a butler until the next game.',
  ]),
  ...c('datenight', 'vote', [
    'VOTE: Cutest couple on court. Everyone else {sips:1}.',
    'VOTE: Which couple would survive a mixed-doubles tournament together? The other couple {sips:2}.',
    'VOTE: Which couple argues most about line calls? They kiss and make up, or {sips:2}.',
  ]),
  // Halloween Bash: seasonal pack.
  ...c('halloween', 'dare', [
    'Zombie walk to the baseline before your next serve. Too lively? {sips:1}.',
    'Serve your next point with your best vampire laugh. Fault and {sips:1}.',
    'Monster dance-off: 10 seconds, everyone watching. The group picks the weakest monster: {sips:1}.',
    'Speak only in spooky whispers until you win a rally. Every rally you lose: {sips:1}.',
    'Play the next rally as a mummy: stiff arms, locked elbows. Lose it and {sips:1}.',
    'Trick or treat! Your opponents choose: a treat ({sips:2}) or a trick (play the next rally with your off hand).',
    'Howl at the moon (or the court lights) before your next serve. Too quiet? {sips:1}.',
    'Pick a costume character and stay in character until the next side out. Break character and {sips:1}.',
    'Ghost serve: serve with your eyes closed. Miss it and {sips:1}.',
    'Tell the scariest story you can in 15 seconds. If the group votes it not scary: {sips:2}.',
    'Cast a spell on an opponent: they hop on one foot for the next rally. If your spell fails (you lose the rally): {sips:1}.',
  ]),
  ...c('halloween', 'rule', [
    'HOUSE RULE: Every time the ball hits the net, everyone yells "BOO!" Last one to yell: {sips:1}.',
    'HOUSE RULE: Anyone in costume is immune to one penalty this game.',
    'HOUSE RULE: Call the score in your creepiest voice. Normal voice: {sips:1}.',
    'HOUSE RULE: Lobs are now ghost balls. Win a rally with one and pick someone to {sips:1}.',
    'HOUSE RULE: The team that loses a rally does a zombie groan. Forget it and {sips:1}.',
  ]),
  ...c('halloween', 'trick', [
    'TRICK SHOT: The Headless Rider: hit a shot with your hat pulled over your eyes. Land it and the other team must {sips:2}.',
    'TRICK SHOT: Pumpkin drop: a drop shot that dies in the kitchen. Nail it and the other team must {sips:2}.',
  ]),
  ...c('halloween', 'vote', [
    'VOTE: Best costume on court. Everyone else {sips:1}.',
    'VOTE: Who would be first to go in a horror movie? They {sips:2}.',
    'VOTE: Who is secretly a vampire (never seen before noon)? They {sips:1}.',
    'VOTE: Who screams loudest on a haunted hayride? They {sips:1}.',
  ]),
];

export function cardsForPacks(packs: PackId[]): Card[] {
  return CARDS.filter((card) => packs.includes(card.pack));
}

export function customCards(texts: { id: string; text: string }[]): Card[] {
  return texts.map((t) => ({ id: `custom-${t.id}`, pack: 'custom', kind: 'dare', text: t.text }));
}

/** How often a free player sees a sample card from a pack they don't have. */
export const TEASER_RATE = 1 / 6;

/**
 * Draw from the playable deck, but sometimes show a sample from a locked pack
 * instead. The sample is a real card the group can play, a taste of the pack.
 */
export function drawWithTeaser(
  deck: Card[],
  locked: Card[],
  recent: string[] = [],
  rng: () => number = Math.random,
): { card: Card; locked: boolean } | null {
  if (locked.length > 0 && rng() < TEASER_RATE) {
    const card = drawCard(locked, recent, rng);
    if (card) return { card, locked: true };
  }
  const card = drawCard(deck, recent, rng);
  return card ? { card, locked: false } : null;
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

/** Dares and trick shots go to a specific team so everyone knows who's up. */
export function addressCard(text: string, kind: CardKind, who: string | null): string {
  return who && (kind === 'dare' || kind === 'trick') ? `${who}: ${text}` : text;
}

/** Seasonal packs to promote this month (0 = January). */
export function packsInSeason(month: number): Pack[] {
  return PACKS.filter((p) => p.season?.months.includes(month));
}
