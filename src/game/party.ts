// Turns match events and on-court "moments" into party prompts.

import { MatchEvent, MatchState, Team, other } from './scoring';
import { Spice, renderPenalty } from './spice';

export interface PartyPrompt {
  emoji: string;
  title: string;
  body: string;
  /** Big moments get a full-screen takeover instead of a toast. */
  big?: boolean;
}

export type MomentId = 'net' | 'ace' | 'kitchen' | 'erne' | 'longRally' | 'bodyShot' | 'wayOut';

export const MOMENTS: { id: MomentId; emoji: string; label: string }[] = [
  { id: 'net', emoji: '🥅', label: 'Into the net' },
  { id: 'ace', emoji: '⚡', label: 'Ace' },
  { id: 'kitchen', emoji: '🍳', label: 'Kitchen fault' },
  { id: 'erne', emoji: '🦅', label: 'Erne / ATP' },
  { id: 'longRally', emoji: '🔁', label: '10+ rally' },
  { id: 'bodyShot', emoji: '🎯', label: 'Body shot' },
  { id: 'wayOut', emoji: '🚀', label: 'Way out' },
];

const MOMENT_TEXT: Record<MomentId, { title: string; body: string }> = {
  net: { title: 'Net Tax', body: '{who} fed the net. Net tax: {sips:1}.' },
  ace: { title: 'Ace!', body: 'Unreturnable. The receiver must {sips:1}.' },
  kitchen: { title: 'Kitchen Fault', body: 'Get out of the kitchen! {who} must {sips:1}.' },
  erne: { title: 'Highlight Reel', body: 'Legendary shot. {who} hands out {sips:3} to anyone.' },
  longRally: { title: 'Dink War', body: 'That rally was a movie. Everyone {sips:1}.' },
  bodyShot: { title: 'Body Shot', body: 'Ouch. Whoever got tagged gets to make the hitter {sips:1}.' },
  wayOut: { title: 'Launched It', body: 'That ball is in orbit. {who} must {sips:2}.' },
};

const fill = (text: string, vars: Record<string, string>, spice: Spice, rng: () => number) =>
  renderPenalty(
    text.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m),
    spice,
    rng,
  );

export function momentPrompt(
  id: MomentId,
  who: string,
  spice: Spice,
  rng: () => number = Math.random,
): PartyPrompt {
  const moment = MOMENTS.find((m) => m.id === id)!;
  const t = MOMENT_TEXT[id];
  return { emoji: moment.emoji, title: t.title, body: fill(t.body, { who }, spice, rng) };
}

/**
 * Pick at most one prompt for a rally's events. Rarer, bigger events win.
 * Side-outs only trigger sometimes so the game doesn't stop every rally.
 */
export function promptForEvents(
  events: MatchEvent[],
  state: MatchState,
  spice: Spice,
  rng: () => number = Math.random,
): PartyPrompt | null {
  const name = (t: Team) => state.config.teamNames[t];
  const f = (text: string, vars: Record<string, string> = {}) => fill(text, vars, spice, rng);

  const over = events.find((e) => e.type === 'gameOver');
  if (over && over.type === 'gameOver') {
    const loser = name(other(over.winner));
    if (over.pickled) {
      return {
        emoji: '🥒',
        title: 'PICKLED!',
        body: f('{loser} got skunked. Pickle Penalty: {finish}. Then a lap of shame.', { loser }),
        big: true,
      };
    }
    return {
      emoji: '🏆',
      title: `${name(over.winner)} wins!`,
      body: f('{loser} must {sips:2}. Winners pick the next house rule.', { loser }),
      big: true,
    };
  }

  const watch = events.find((e) => e.type === 'pickleWatch');
  if (watch && watch.type === 'pickleWatch') {
    return {
      emoji: '👀',
      title: 'Pickle Watch',
      body: f('{team} has zero points. Score one now or face the Pickle Penalty.', { team: name(watch.team) }),
    };
  }

  const streak = events.find((e) => e.type === 'streak');
  if (streak && streak.type === 'streak') {
    return {
      emoji: '🔥',
      title: `${streak.length}-point heater`,
      body: f(`{team} is cooking. {victims} must {sips:${Math.min(streak.length / 2, 3)}}.`, {
        team: name(streak.team),
        victims: name(other(streak.team)),
      }),
    };
  }

  const gamePoint = events.find((e) => e.type === 'gamePoint');
  if (gamePoint && gamePoint.type === 'gamePoint') {
    return {
      emoji: '⏳',
      title: 'Game Point',
      body: f('{team} is one away. {other} — {sips:1} for courage.', {
        team: name(gamePoint.team),
        other: name(other(gamePoint.team)),
      }),
    };
  }

  const tied = events.find((e) => e.type === 'tied');
  if (tied && tied.type === 'tied') {
    return { emoji: '🤝', title: `Tied at ${tied.score}`, body: f('Dead even. Everybody {sips:1}.') };
  }

  const sideOut = events.find((e) => e.type === 'sideOut');
  if (sideOut && sideOut.type === 'sideOut' && rng() < 0.25) {
    return {
      emoji: '🔄',
      title: 'Side Out',
      body: f('{team} lost the serve. Server must {sips:1}.', { team: name(other(sideOut.to)) }),
    };
  }

  return null;
}
