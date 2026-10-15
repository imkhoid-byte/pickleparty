import { describe, expect, it } from '@jest/globals';
import { speechText } from '../../audio/speechText';
import { CARDS, PACKS, addressCard, cardsForPacks, drawCard } from '../cards';
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
  it('reads as a sentence in every spice level', () => {
    for (const card of CARDS) {
      for (const spice of ['chill', 'tipsy', 'wild'] as const) {
        const text = renderPenalty(card.text, spice, zero);
        expect(text).not.toMatch(/\b(out|give|gives)\s+(take|do|drink|hold|run|finish)\b/);
      }
    }
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
    expect(momentPrompt('net', 'Sam', 'tipsy').body).toBe('Sam fed the net. Net tax: Sam, take 1 sip.');
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

describe('announcer text', () => {
  it('names the team that has to act in every moment', () => {
    const p = momentPrompt('ace', 'Lob Squad', 'tipsy', 'Dink Floyd');
    expect(p.body).toBe('Lob Squad aced Dink Floyd. Dink Floyd, take 1 sip.');
    expect(p.sound).toBe('zap');
  });
  it('attaches a sound to big moments', () => {
    const p = promptForEvents(
      [{ type: 'gameOver', winner: 0, pickled: true }],
      state,
      'tipsy',
    );
    expect(p?.sound).toBe('airhorn');
    expect(p?.body).toContain('Bangers, take a big gulp');
  });
  it('reads naturally', () => {
    expect(speechText({ title: '🥒 PICKLED!', body: 'Mike & Sara won 11-0 — wow.' })).toBe(
      'PICKLED! Mike and Sara won 11 to 0, wow.',
    );
  });
  it('addresses dares to a team but not votes or rules', () => {
    expect(addressCard('do a dance', 'dare', 'Lob Squad')).toBe('Lob Squad: do a dance');
    expect(addressCard('VOTE: who?', 'vote', 'Lob Squad')).toBe('VOTE: who?');
  });
});
