import { describe, expect, it } from '@jest/globals';
import { CARDS, PACKS, cardsForPacks, drawCard } from '../cards';
import { momentPrompt, promptForEvents } from '../party';
import { newMatch } from '../scoring';
import { renderPenalty } from '../spice';

const state = newMatch({ format: 'doubles', scoring: 'sideout', target: 11, teamNames: ['Dinkers', 'Bangers'] });
const zero = () => 0;

describe('renderPenalty', () => {
  it('scales sips by spice', () => {
    expect(renderPenalty('{sips:1}', 'tipsy')).toBe('take 1 sip');
    expect(renderPenalty('{sips:2}', 'wild')).toBe('take 4 sips');
  });
  it('never mentions drinking alcohol in chill mode', () => {
    for (const card of CARDS) {
      const text = renderPenalty(card.text, 'chill', zero).toLowerCase();
      expect(text).not.toMatch(/\bsips?\b|finish your drink|gulp/);
    }
  });
});

describe('promptForEvents', () => {
  it('prefers the game-over prompt and calls out a pickle', () => {
    const p = promptForEvents(
      [{ type: 'point', team: 0 }, { type: 'gameOver', winner: 0, pickled: true }],
      state,
      'tipsy',
    );
    expect(p?.title).toBe('PICKLED!');
    expect(p?.body).toContain('Bangers');
    expect(p?.big).toBe(true);
  });
  it('skips most side outs', () => {
    expect(promptForEvents([{ type: 'sideOut', to: 1 }], state, 'tipsy', () => 0.9)).toBeNull();
    expect(promptForEvents([{ type: 'sideOut', to: 1 }], state, 'tipsy', () => 0.1)?.body).toContain('Dinkers');
  });
  it('fills moment templates', () => {
    expect(momentPrompt('net', 'Sam', 'tipsy').body).toBe('Sam fed the net. Net tax: take 1 sip.');
  });
});

describe('cards', () => {
  it('has unique ids and every pack has cards', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const pack of PACKS) expect(cardsForPacks([pack.id]).length).toBeGreaterThan(0);
  });
  it('avoids recently drawn cards', () => {
    const deck = cardsForPacks(['classic']).slice(0, 2);
    expect(drawCard(deck, [deck[0].id], zero)?.id).toBe(deck[1].id);
    expect(drawCard([], [], zero)).toBeNull();
  });
});
