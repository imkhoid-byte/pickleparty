import { describe, expect, it } from '@jest/globals';
import { ANNOUNCERS, announcerFor, announcerScript, pickMaleVoice, voiceSettings } from '../../audio/personas';
import { speechText } from '../../audio/speechText';
import { CARDS, PACKS, addressCard, cardsForPacks, drawCard } from '../cards';
import { MOMENTS, momentPrompt, momentRallyWinner, promptForEvents } from '../party';
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
    expect(p.sound).toBe('boing');
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
  it('characters add a mood-matched intro and sometimes a pun', () => {
    const s = announcerScript(prompt, 'squeaky', () => 0);
    expect(s.text).toBe('Uh-oh, spaghetti-o! Net Tax! Lob Squad, take 1 sip. Brine time!');
    expect(announcerScript(prompt, 'squeaky', () => 0).pitch).toBeGreaterThan(1.5);
    expect(announcerScript(prompt, 'bigdill', () => 0).pitch).toBeLessThan(0.7);
    const quiet = announcerScript(prompt, 'bigdill', () => 0.99);
    expect(quiet.text).toBe('Net Tax! Lob Squad, take 1 sip.');
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
  it('Big Dill uses a male voice, or deepens the default voice when there is none', () => {
    const dill = ANNOUNCERS.find((a) => a.id === 'bigdill')!;
    expect(voiceSettings(dill, 'evan')).toEqual({ voice: 'evan', pitch: 0.65, rate: 0.85 });
    expect(voiceSettings(dill, null)).toEqual({ pitch: 0.55, rate: 0.85 });
    const squeaky = ANNOUNCERS.find((a) => a.id === 'squeaky')!;
    expect(voiceSettings(squeaky, 'evan').voice).toBeUndefined();
  });
});
