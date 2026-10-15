// Card decks. Text may use {sips:N} and {finish}; see spice.ts.

export type PackId =
  | 'classic'
  | 'kitchen'
  | 'trickshots'
  | 'afterdark'
  | 'chaos'
  | 'datenight'
  | 'halloween'
  | 'custom';
/**
 * dare/trick: one team. rule: a house rule for the whole game. vote: the group.
 * court: changes how play works for everyone until the next one is drawn
 * (Chaos Rules: a new one every few points; break it and you lose the rally).
 */
export type CardKind = 'dare' | 'rule' | 'trick' | 'vote' | 'court';

/** Shown above (and read before) the card text, so card texts don't repeat it. */
export const CARD_KIND_LABEL: Record<CardKind, string> = {
  dare: 'Dare',
  rule: 'House Rule',
  trick: 'Trick Shot',
  vote: 'Group Vote',
  court: 'Court Rule',
};

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
    id: 'chaos',
    name: 'Chaos Rules',
    emoji: '🌀',
    description: 'Court Rules that change how every rally is played. Robot mode, slow motion, opera voices.',
    premium: true,
    price: '$2.99',
  },
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
    'High-five everyone on court. Whoever gives the weakest one must {sips:1}.',
    'Next point, you can only hit dinks. Lose it and {sips:1}.',
    'Do your best victory dance right now. If the group votes it lame, {sips:1}.',
    'Play the next rally on one foot as much as you can.',
    'Give your partner a pep talk like they are about to play the championship.',
  ]),
  ...c('classic', 'rule', [
    'Nobody can say "out". Say "pickle" instead. Violators {sips:1}.',
    'Hit the ball into the kitchen on a serve? {sips:2}.',
    'Whoever wins a rally with a lob gets to make someone {sips:1}.',
    'Before serving, the server must compliment an opponent.',
    'Any ball that hits a body: the player who got hit must {sips:1}.',
    '10+ shot rally? Everyone {sips:1} to celebrate.',
    'Teams must celebrate every point with a coordinated handshake.',
    'Last person to touch their nose after a side-out must {sips:1}.',
  ]),
  ...c('classic', 'vote', [
    'Who has the worst serve on court? They {sips:2}.',
    'Who complains about line calls the most? They {sips:1}.',
    'Who has the best outfit? They pick anyone to {sips:3}.',
    'Who would win in a 1v1? Everyone else {sips:1}.',
    'Most likely to blame their paddle. They {sips:1}.',
  ]),
  // Court Rules: "Name: what everyone has to do." They're all original.
  ...c('classic', 'court', [
    'Paddles Down: no paddles. Everyone hits with an open hand.',
    'Hand in Hand: partners hold hands the whole rally.',
    'Steady Hands: everyone plays holding their drink in their free hand. Spill a drop and you lose the rally.',
    'Kitchen Is Lava: one toe in the kitchen and you lose the rally.',
    'Silent Rally: not a sound. The first person to talk, laugh or grunt loses the rally for their team.',
    'Off-Hand Only: everyone plays with their non-dominant hand.',
    'Chicken Wing: tuck your free hand in your armpit and flap it after every shot.',
    'Spin Cycle: spin all the way around after every shot you hit.',
    'Dinks Only: no drives and no lobs. Every shot has to be soft.',
    'Hum Along: each team hums a song the whole rally. Whoever stops humming loses it.',
    'One-Knee Serve: serves are hit from one knee.',
    'Call Your Shot: say "dink", "drive" or "lob" before every hit, then hit exactly that.',
    'Statue: one player on each team can\'t move their feet. Partners pick who.',
    'Be Nice: compliment an opponent before every serve. Forget and the serve is a fault.',
    'Low Rider: everyone plays crouched with bent knees. Stand up straight and you lose the rally.',
    'Bounce It: every ball has to bounce before you hit it. No volleys anywhere.',
  ]),
  ...c('kitchen', 'dare', [
    'You must stand in the kitchen for the entire next rally. Every volley: {sips:1}.',
    'Your opponents choose your next shot: drive, drop or lob. Disobey and {sips:2}.',
    'For the rest of the game, you must serve with your eyes closed. Every fault: {sips:1}.',
    'Trade one item of clothing (hat, sunglasses, sweatband) with an opponent.',
    'Speak only in pickle puns until you win a rally. Every miss: {sips:1}.',
    'Next rally, if you lose it you {finish}.',
    'Challenge an opponent to a dink-off. First to miss must {sips:3}.',
  ]),
  ...c('kitchen', 'rule', [
    'Ernes are worth 2 points this game.',
    'Every side-out, the team losing serve must {sips:1}.',
    'You must call "kitchen!" when stepping in. Forget? {sips:2}.',
    'Loudest celebrator each rally picks who drinks. They make someone {sips:1}.',
  ]),
  ...c('trickshots', 'trick', [
    'Return a dink behind your back. Land it and the other team must {sips:3}.',
    'Hit an Around-The-Post this game and your opponents {finish}.',
    'Land a between-the-legs shot. Miss it and {sips:1}. Make it and everyone else must {sips:2}.',
    'Attempt an Erne this game. Pull it off and the other team {sips:3}.',
    'Serve and hit the paddle-handle "tweener". Film it for the group chat.',
    'Return a lob with a jump overhead. Land it and pick a house rule.',
  ]),
  ...c('afterdark', 'dare', [
    'Text your ex your pickleball rating. Or {finish}.',
    'Let the opposing team post one photo on your story.',
    'Do your best impression of each player on court. If the group votes them the worst, {sips:2}.',
    'Tell the group your most embarrassing pickleball moment or {sips:3}.',
    'Serenade your partner for 15 seconds before the next serve.',
  ]),
  ...c('afterdark', 'vote', [
    'Who is most likely to cry after losing? They {sips:2}.',
    'Who takes pickleball way too seriously? They {sips:2}.',
    'Who would you least want as a partner at nationals? They {sips:1}.',
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
    'Losing partner carries both paddles and water bottles like a butler until the next game.',
  ]),
  ...c('chaos', 'court', [
    'Paddle Swap: everyone swaps paddles with the opponent across the net.',
    'The Butler: free hand behind your back like a fancy waiter.',
    'Play-by-Play: the server narrates every shot out loud like a TV commentator.',
    'Slow Motion: everyone moves in slow motion between shots. Rushing loses the rally.',
    'Opera Night: every word spoken during a rally must be sung.',
    'Tiny Steps: shuffle steps only. No running.',
    'Two-Hander: everyone holds the paddle with both hands.',
    'Switch Hitter: swap paddle hands after every shot you hit.',
    'Lob Lockdown: no lobs. A lob loses the rally.',
    'Robot Mode: move and talk like a robot. Break character and you lose the rally.',
    "Name Caller: shout your partner's name before every shot.",
    'Strike a Pose: freeze in a superhero pose for a second after every shot you hit.',
    'Whisper Score: the score must be whispered. A normal voice is a fault.',
    'Air Guitar: the team that wins a rally shreds 3 seconds of air guitar before the next serve.',
    'Off-Hand Serve: serves are hit with your non-dominant hand.',
    'Moonwalker: moonwalk back to the baseline after every point.',
    'Three Dinks First: each rally needs 3 dinks before anyone can attack.',
    'Drop It: the third shot has to be a drop. Drive it and you lose the rally.',
    "Stick Together: partners stay within a paddle's reach of each other.",
    'Sing the Score: the server sings the score before serving.',
    'Tongue Out: everyone plays with their tongue out.',
    'Very British: everyone speaks in a posh British accent. Big Dill approves.',
    'High-Five Club: partners high-five after every shot either of them hits.',
    'Point First: point to where you are going to hit before every shot.',
    'Heel Toe: walk heel-to-toe between points like you are on a tightrope.',
    'Hat Swap: everyone swaps hats or sunglasses with their opponent.',
    'No Backhands: forehands only. A backhand loses the rally.',
    'Victory Roar: roar like a lion every time your team wins a rally.',
  ]),
  ...c('datenight', 'court', [
    'Smooch to Serve: the server kisses their partner before every serve.',
    'Hip to Hip: partners stay hip to hip the whole rally.',
    'Pet Names: call your partner a pet name before every shot.',
    'Winner\'s Kiss: the team that wins each rally shares a kiss before the next serve.',
  ]),
  ...c('datenight', 'vote', [
    'Cutest couple on court. Everyone else {sips:1}.',
    'Which couple would survive a mixed-doubles tournament together? The other pair must {sips:2}.',
    'Which couple argues most about line calls? They kiss and make up, or {sips:2}.',
  ]),
  // Halloween Bash: seasonal pack.
  ...c('halloween', 'dare', [
    'Zombie walk to the baseline before your next serve. Too lively? {sips:1}.',
    'Serve your next point with your best vampire laugh. Fault and {sips:1}.',
    'Monster dance-off: 10 seconds, everyone watching. The group picks the weakest: {sips:1}.',
    'Speak only in spooky whispers until you win a rally. Every point you lose: {sips:1}.',
    'Play the next rally as a mummy: stiff arms, locked elbows. Lose it and {sips:1}.',
    'Trick or treat! Your opponents choose: a treat ({sips:2}) or a trick (play the next rally with your off hand).',
    'Howl at the moon (or the court lights) before your next serve. Too quiet? {sips:1}.',
    'Pick a costume character and stay in it until the next side-out. Break it and {sips:1}.',
    'Ghost serve: eyes closed on your next one. Miss it and {sips:1}.',
    'Tell the scariest story you can in 15 seconds. If the group votes it not scary: {sips:2}.',
    'Cast a spell on an opponent: they hop on one foot for the next rally. Lose it and the spell backfires: {sips:1}.',
  ]),
  ...c('halloween', 'rule', [
    'Every time the ball hits the net, everyone yells "BOO!" Last one to yell: {sips:1}.',
    'Anyone in costume is immune to one penalty this game.',
    'Call the score in your creepiest voice. Forget and {sips:1}.',
    'Lobs are now ghost balls. Win a rally with one and pick someone to {sips:1}.',
    'The team that loses a rally does a zombie groan. Forget it and {sips:1}.',
  ]),
  ...c('halloween', 'trick', [
    'The Headless Rider: hit one with your hat pulled over your eyes. Land it and the other team must {sips:2}.',
    'Pumpkin drop: a soft one that dies in the kitchen. Nail it and the other team must {sips:2}.',
  ]),
  ...c('halloween', 'court', [
    'Zombie Shuffle: no running. Zombies only shuffle.',
    "Witch's Cackle: cackle after every shot you hit.",
    'Count Dinkula: free hand holds your collar up over your face like a cape.',
  ]),
  ...c('halloween', 'vote', [
    'Best costume on court. Everyone else {sips:1}.',
    'Who would be first to go in a horror movie? They {sips:2}.',
    'Who is secretly a vampire (never seen before noon)? They {sips:1}.',
    'Who screams loudest on a haunted hayride? They {sips:1}.',
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
