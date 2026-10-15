import { describe, expect, it } from '@jest/globals';
import { ANNOUNCERS, announcerFor, announcerScript, pickMaleVoice, voiceSettings } from '../../audio/personas';
import { speechText } from '../../audio/speechText';
import { CARDS, PACKS, addressCard, cardsForPacks, drawCard, packsInSeason } from '../cards';
import { LOSERS_WHEEL, MOMENTS, momentPrompt, momentRallyWinner, promptForEvents, spinLosersWheel, waterBreakDue } from '../party';
import { newMatch } from '../scoring';
import { WILD_ACTS, renderPenalty } from '../spice';

const state = newMatch({ format: 'doubles', scoring: 'sideout', target: 11, teamNames: ['Dinkers', 'Bangers'] });
const zero = () => 0;

describe('renderPenalty', () => {
  it('scales sips by spice', () => {
    expect(renderPenalty('{sips:1}', 'tipsy')).toBe('take 1 sip');
    expect(renderPenalty('{sips:2}', 'wild', () => 0)).toBe('take 2 sips, then kiss your partner');
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
    expect(promptForEvents([{ type: 'sideOut', to: 1 }], state, 'tipsy', () => 0.2)).toBeNull();
    expect(promptForEvents([{ type: 'sideOut', to: 1 }], state, 'tipsy', () => 0.05)?.body).toContain('Dinkers');
  });
  it('only calls for sips on late ties', () => {
    expect(promptForEvents([{ type: 'tied', score: 5 }], state, 'tipsy')).toBeNull();
    expect(promptForEvents([{ type: 'tied', score: 7 }], state, 'tipsy')?.title).toBe('Tied at 7');
  });
  it('calls a water break every two games in a session', () => {
    const min = 60 * 1000;
    const now = 1_000_000_000;
    const game = (id: string, ago: number) => ({
      id,
      date: now - ago * min,
      teamNames: ['A', 'B'] as [string, string],
      scores: [11, 5] as [number, number],
      winner: 0 as const,
      pickled: false,
      rallies: 30,
    });
    expect(waterBreakDue([], now)).toBeNull();
    expect(waterBreakDue([game('1', 1)], now)).toBeNull();
    expect(waterBreakDue([game('1', 20), game('2', 1)], now)).toBe('2');
    expect(waterBreakDue([game('1', 40), game('2', 20), game('3', 1)], now)).toBeNull();
    // Yesterday's game doesn't count toward today's session.
    expect(waterBreakDue([game('0', 60 * 24), game('1', 1)], now)).toBeNull();
  });
  it('fills moment templates', () => {
    expect(momentPrompt('net', 'Sam', 'tipsy').body).toBe('Sam fed the net. Pay the tax: take 1 sip.');
  });
});

describe('calm mode', () => {
  const calm = { calm: true };
  it('skips the everyday prompts', () => {
    expect(promptForEvents([{ type: 'sideOut', to: 1 }], state, 'tipsy', () => 0, calm)).toBeNull();
    expect(promptForEvents([{ type: 'streak', team: 0, length: 4 }], state, 'tipsy', () => 0, calm)).toBeNull();
    expect(promptForEvents([{ type: 'tied', score: 8 }], state, 'tipsy', () => 0, calm)).toBeNull();
  });
  it('keeps the big moments', () => {
    expect(promptForEvents([{ type: 'gamePoint', team: 0 }], state, 'tipsy', () => 0, calm)?.title).toBe('Game Point');
    expect(promptForEvents([{ type: 'pickleWatch', team: 1 }], state, 'tipsy', () => 0, calm)?.title).toBe('Pickle Watch');
    expect(
      promptForEvents([{ type: 'gameOver', winner: 0, pickled: true }], state, 'tipsy', () => 0, calm)?.title,
    ).toBe('PICKLED!');
  });
});

describe("Loser's Wheel", () => {
  it('lands on one of its outcomes, naming the teams', () => {
    const spin = spinLosersWheel('Bangers', 'Dinkers', 'tipsy', () => 0.99);
    expect(spin.options).toHaveLength(LOSERS_WHEEL.length);
    expect(spin.landed).toBe(LOSERS_WHEEL.length - 1);
    for (const o of spin.options) expect(o).toMatch(/Bangers|Dinkers/);
    expect(spin.options.join(' ')).not.toMatch(/\{|\}/);
  });
  it('never mentions alcohol in chill mode', () => {
    for (const o of spinLosersWheel('Bangers', 'Dinkers', 'chill', () => 0).options) {
      expect(o.toLowerCase()).not.toMatch(/\bsips?\b|gulp|beer|booze/);
    }
  });
});

describe('read aloud', () => {
  it('never reads a card label twice', () => {
    for (const card of CARDS) expect(card.text).not.toMatch(/^(HOUSE RULE|VOTE|GROUP VOTE|TRICK SHOT|DARE):/i);
    expect(speechText({ title: 'Dare', body: 'DARE: Sing.' })).toBe('Dare! Sing.');
  });
  it('capitalizes a penalty that starts a sentence', () => {
    expect(renderPenalty('Forget? {sips:2}.', 'tipsy')).toBe('Forget? Take 2 sips.');
  });
  it('never repeats a team name in an automatic prompt', () => {
    const names = ['Dinkers', 'Bangers'];
    const events = [
      [{ type: 'gameOver', winner: 0, pickled: true }],
      [{ type: 'gameOver', winner: 0, pickled: false }],
      [{ type: 'pickleWatch', team: 1 }],
      [{ type: 'streak', team: 0, length: 4 }],
      [{ type: 'gamePoint', team: 0 }],
      [{ type: 'sideOut', to: 1 }],
    ] as Parameters<typeof promptForEvents>[0][];
    const texts = [
      ...events.map((e) => speechText(promptForEvents(e, state, 'tipsy', () => 0)!)),
      ...MOMENTS.map((m) => speechText(momentPrompt(m.id, 'Dinkers', 'tipsy', 'Bangers'))),
    ];
    for (const t of texts) for (const n of names) expect(t.split(n).length - 1).toBeLessThanOrEqual(1);
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
    expect(p.body).toBe('Untouchable serve from Lob Squad. Dink Floyd, take 1 sip.');
    expect(p.sound).toBe('boing');
  });
  it('attaches a sound to big moments', () => {
    const p = promptForEvents(
      [{ type: 'gameOver', winner: 0, pickled: true }],
      state,
      'tipsy',
    );
    expect(p?.sound).toBe('airhorn');
    expect(p?.body).toContain('Bangers got skunked! Pickle Penalty: take a big gulp');
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

describe('moments score the rally', () => {
  it('faults give the rally to the other team, winners keep it', () => {
    expect(momentRallyWinner('net', 0)).toBe(1);
    expect(momentRallyWinner('kitchen', 1)).toBe(0);
    expect(momentRallyWinner('wayOut', 0)).toBe(1);
    expect(momentRallyWinner('ace', 0)).toBe(0);
    expect(momentRallyWinner('erne', 1)).toBe(1);
    expect(momentRallyWinner('bodyShot', 1)).toBe(1);
    expect(momentRallyWinner('longRally', 0)).toBe(0);
  });
  it('every moment asks a question', () => {
    for (const m of MOMENTS) expect(m.ask).toMatch(/\?$/);
  });
});

describe('wild mode (couples)', () => {
  it('adds one partner act per prompt, on top of the drink', () => {
    const text = renderPenalty('Miss = {sips:1}, make = everyone else {sips:2}.', 'wild', () => 0);
    expect(text).toBe('Miss = take 1 sip, then kiss your partner, make = everyone else take 2 sips.');
    expect(renderPenalty('Pickle Penalty: {finish}.', 'wild', () => 0)).toBe(
      'Pickle Penalty: take a big gulp, then give your partner a movie-finale dip kiss.',
    );
  });
  it('acts only ever involve your own partner', () => {
    for (const act of WILD_ACTS) expect(act).toMatch(/your partner/);
  });
  it('tipsy and chill never get acts', () => {
    expect(renderPenalty('{sips:1}', 'tipsy')).toBe('take 1 sip');
    expect(renderPenalty('{sips:1} {finish}', 'chill', () => 0)).not.toMatch(/partner/);
  });
});

describe('announcer personalities', () => {
  const prompt = { title: 'Net Tax', body: 'Lob Squad, take 1 sip.', sound: 'sadtrombone' as const };
  it('classic reads it straight', () => {
    expect(announcerScript(prompt, 'classic', () => 0).text).toBe('Net Tax! Lob Squad, take 1 sip.');
  });
  it('Squeaky Pickle shouts everything and repeats itself', () => {
    const s = announcerScript(prompt, 'squeaky', () => 0);
    expect(s.text).toBe("Uh-oh, spaghetti-o! Net Tax! Net Tax! Lob Squad, take 1 sip! I'm telling!");
    expect(s.pitch).toBeGreaterThan(1.5);
    expect(s.pitch * s.pitchScale).toBeLessThanOrEqual(2);
  });
  it('Big Dill is understated and terribly polite', () => {
    const s = announcerScript(prompt, 'bigdill', () => 0);
    expect(s.text).toBe(
      "Oh dear. Oh dear, oh dear. Net Tax. Lob Squad, kindly take 1 sip. My grandmother plays with more conviction, and she's a hundred and four.",
    );
    expect(s.pitch).toBeLessThan(0.7);
    expect(announcerScript(prompt, 'bigdill', () => 0.99).text).toBe('Net Tax. Lob Squad, kindly take 1 sip.');
  });
  it('characters keep every name and number, and never mention drinks themselves', () => {
    const chill = { title: 'Tied at 8', body: 'Dink Floyd and Lob Squad, everybody do 10 squats.', sound: 'boing' as const };
    for (const id of ['squeaky', 'bigdill'] as const) {
      for (let i = 0; i < 200; i++) {
        const t = announcerScript(chill, id).text;
        expect(t).toMatch(/Dink Floyd.*Lob Squad.*10 squats/);
        expect(t.toLowerCase()).not.toMatch(/\b(sip|drink|beer|booze|gulp|shot)\b/);
      }
    }
  });
  it('every announcer introduces itself', () => {
    for (const a of ANNOUNCERS) expect(a.preview.length).toBeGreaterThan(10);
  });
  it('Hype is gone; a saved Hype setting falls back to the default', () => {
    expect(ANNOUNCERS.map((a) => a.id)).toEqual(['squeaky', 'bigdill', 'classic']);
    expect(announcerFor('hype').id).toBe('squeaky');
  });
  it('every announcer has a voice the phone can do', () => {
    for (const a of ANNOUNCERS) {
      expect(a.pitch).toBeGreaterThanOrEqual(0.5);
      expect(a.pitch).toBeLessThanOrEqual(2);
    }
  });
});

describe('announcer voices', () => {
  const v = (name: string, identifier: string, language = 'en-US', quality = 'Default') => ({
    name,
    identifier,
    language,
    quality,
  });
  it('finds a male voice on iPhone, preferring US and enhanced quality', () => {
    const ios = [
      v('Samantha', 'com.apple.voice.compact.en-US.Samantha'),
      v('Fred', 'com.apple.speech.synthesis.voice.Fred'),
      v('Daniel', 'com.apple.voice.compact.en-GB.Daniel', 'en-GB'),
      v('Aaron', 'com.apple.voice.compact.en-US.Aaron'),
      v('Evan', 'com.apple.voice.enhanced.en-US.Evan', 'en-US', 'Enhanced'),
    ];
    expect(pickMaleVoice(ios)).toBe('com.apple.voice.enhanced.en-US.Evan');
  });
  it('finds Google male voices on Android and named male voices in browsers', () => {
    expect(pickMaleVoice([v('en-us-x-sfg-local', 'en-us-x-sfg-local'), v('en-us-x-iom-local', 'en-us-x-iom-local')])).toBe(
      'en-us-x-iom-local',
    );
    expect(
      pickMaleVoice([v('Google UK English Female', 'Google UK English Female', 'en-GB'), v('Google UK English Male', 'Google UK English Male', 'en-GB')]),
    ).toBe('Google UK English Male');
    expect(pickMaleVoice([v('Microsoft Zira', 'zira'), v('Thomas', 'fr', 'fr-FR')])).toBeNull();
  });
  it('Big Dill prefers a British male voice', () => {
    const list = [
      v('Aaron', 'com.apple.voice.compact.en-US.Aaron'),
      v('Daniel', 'com.apple.voice.compact.en-GB.Daniel', 'en-GB'),
      v('Samantha', 'com.apple.voice.compact.en-US.Samantha'),
    ];
    expect(pickMaleVoice(list, 'en-GB')).toBe('com.apple.voice.compact.en-GB.Daniel');
    expect(pickMaleVoice(list)).toBe('com.apple.voice.compact.en-US.Aaron');
    expect(ANNOUNCERS.find((a) => a.id === 'bigdill')?.accent).toBe('en-GB');
  });
  it('Big Dill uses a male voice, or deepens the default voice when there is none', () => {
    const dill = ANNOUNCERS.find((a) => a.id === 'bigdill')!;
    expect(voiceSettings(dill, 'evan')).toEqual({ voice: 'evan', pitch: 0.65, rate: 0.82 });
    expect(voiceSettings(dill, null)).toEqual({ pitch: 0.55, rate: 0.82 });
    const squeaky = ANNOUNCERS.find((a) => a.id === 'squeaky')!;
    expect(voiceSettings(squeaky, 'evan').voice).toBeUndefined();
  });
});

describe('Halloween Bash pack', () => {
  const cards = CARDS.filter((c) => c.pack === 'halloween');
  it('is a premium seasonal pack for October with a full deck', () => {
    const pack = PACKS.find((p) => p.id === 'halloween')!;
    expect(pack.premium).toBe(true);
    expect(pack.adult).toBeFalsy();
    expect(packsInSeason(9).map((p) => p.id)).toContain('halloween');
    expect(packsInSeason(3).map((p) => p.id)).not.toContain('halloween');
    expect(cards.length).toBeGreaterThanOrEqual(20);
    expect(new Set(cards.map((c) => c.kind))).toEqual(new Set(['dare', 'rule', 'trick', 'vote']));
  });
  it('stays alcohol-free in chill mode', () => {
    for (const c of cards) expect(renderPenalty(c.text, 'chill', () => 0)).not.toMatch(/\bsips?\b|gulp/);
  });
});
