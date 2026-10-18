import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../AppState';
import { announce, announceLine, hush, playSound } from '../audio/announcer';
import { APP_LINK, HASHTAG } from '../config';
import { scoreCallout, spokenScore } from '../game/callout';
import { CARD_KIND_LABEL, Card as PartyCard, PACKS, addressCard, drawCard, drawWithTeaser } from '../game/cards';
import {
  MOMENTS,
  MomentId,
  courtRuleDue,
  courtRulePrompt,
  pointsUntilNextRule,
  ruleBrokenPrompt,
  PartyPrompt,
  WATER_BREAK,
  momentPrompt,
  momentRallyWinner,
  promptForEvents,
  spinLosersWheel,
  waterBreakDue,
} from '../game/party';
import type { RRLink } from '../game/roundRobin';
import { MatchConfig, MatchState, Team, callScore, newMatch, other, rallyWonBy, undo } from '../game/scoring';
import { renderPenalty } from '../game/spice';
import { usableAnnouncer } from '../monetization/entitlements';
import { goBack, openPaywall } from '../navigation';
import { shareImage } from '../shareImage';
import type { GameRecord } from '../storage';
import { Button, Takeover, tap } from '../ui/components';
import { ANNOUNCER_ART } from '../ui/announcerArt';
import { LosersWheel } from '../ui/LosersWheel';
import { PromptCard } from '../ui/PromptCard';
import { ResultCard } from '../ui/ResultCard';
import { colors, radius, teamColors } from '../ui/theme';
import { useScreenAwake } from '../ui/useScreenAwake';

export function shareText(s: MatchState): string {
  if (s.winner === null) return '';
  const w = s.winner;
  const [winner, loser] = [s.config.teamNames[w], s.config.teamNames[other(w)]];
  const score = `${s.scores[w]}-${s.scores[other(w)]}`;
  const brag = s.scores[other(w)] === 0 ? ` and PICKLED them 🥒💀` : ` 🏓`;
  return `${winner} beat ${loser} ${score}${brag}\nScored on PickleParty ${HASHTAG}\n${APP_LINK}`;
}

function gameRecord(s: MatchState): GameRecord {
  const winner = s.winner ?? 0;
  return {
    id: `${Date.now()}`,
    date: Date.now(),
    teamNames: s.config.teamNames,
    scores: s.scores,
    winner,
    pickled: s.scores[other(winner)] === 0,
    rallies: s.rallies,
  };
}

/** Clicker and keyboard buttons: page turners send arrows or Page Up/Down. */
const TOP_KEYS = ['ArrowLeft', 'ArrowUp', 'PageUp', '1'];
const BOTTOM_KEYS = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', '2'];

/** Pickleball's serving side: from the right when the serving team's score is even, the left when odd. */
const serveSide = (m: MatchState) => (m.scores[m.servingTeam] % 2 === 0 ? 'right' : 'left');

/** The game that last triggered a water break, so one break is only shown once. */
let lastWaterBreak: string | null = null;
/** Remember which game's water break has been shown. */
const markWaterBreak = (id: string | null) => {
  if (id) lastWaterBreak = id;
};
/** 0 or 1 at random (who gets a card when nobody has lost a rally yet). */
const coinFlip = (): Team => (Math.random() < 0.5 ? 0 : 1);

/** The game id a water break is due for (every two games), if it hasn't been shown yet. */
function pendingWaterBreak(history: GameRecord[]): string | null {
  const due = waterBreakDue(history, Date.now());
  return due && due !== lastWaterBreak ? due : null;
}

/** A prompt on screen. Cards can be passed; samples from locked packs offer an unlock. */
type Shown = PartyPrompt & { card?: boolean; lockedPack?: string };

/**
 * Everyday prompts (side-outs, moments, heaters…) show as a big card that closes
 * on its own once it's been read out, so nobody has to walk over to dismiss it.
 * Cards and the game-ending moments stay up until someone taps.
 */
const isBanner = (p: Shown) => !p.card && !p.big;

/** Long enough for the announcer to finish reading it. */
const bannerTime = (p: Shown) => {
  const words = `${p.title} ${p.body}`.split(/\s+/).length;
  return Math.min(15000, Math.max(6000, 3000 + words * 450));
};

export function Match({
  config,
  firstServer,
  roundRobin,
  rrParam,
  gameId,
}: {
  config: MatchConfig;
  firstServer: Team;
  /** Set when this game is one court's game in a round robin. */
  roundRobin?: RRLink;
  /** The same link as it appears in the address, saved so a resumed game keeps it. */
  rrParam?: string;
  /** Which game this is, so a reload (or Resume) picks up the saved game. */
  gameId: string;
}) {
  const {
    settings,
    updateSettings,
    recordGame,
    deck,
    courtRules,
    houseRules,
    lockedCards,
    access,
    history,
    reportRoundRobin,
    savedMatch,
    setSavedMatch,
  } = useApp();
  // This game's saved progress, if the page reloaded or the game was resumed from the home screen.
  const [resumed] = useState(() =>
    savedMatch && savedMatch.id === gameId && savedMatch.match.winner === null ? savedMatch : null,
  );
  useScreenAwake();
  const sun = settings.sunlight;
  // Phone or iPad turned sideways: a TV-friendly layout that fills a mirrored screen.
  const { width, height } = useWindowDimensions();
  const wide = width > height;
  const [tvHelp, setTvHelp] = useState(false);
  // The first couple of matches, a quick tip that sideways is the big-screen mode.
  const [tvTip, setTvTip] = useState(() => settings.tvTipsShown < 2 && width <= height);
  useEffect(() => {
    if (!tvTip) return;
    updateSettings({ tvTipsShown: settings.tvTipsShown + 1 });
    const timer = setTimeout(() => setTvTip(false), 7000);
    return () => clearTimeout(timer);
    // Once per match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bigScore = { fontSize: Math.min(220, Math.round(height * 0.3)), lineHeight: Math.min(230, Math.round(height * 0.32)) };
  // Names and the serve line grow with the screen too, so they read from across a room.
  const bigName = { fontSize: Math.max(24, Math.min(56, Math.round(height * 0.065))) };
  const bigTag = { fontSize: Math.max(13, Math.min(24, Math.round(height * 0.03))) };
  const back = goBack;
  // Pop-ups are native modals: hide them while another screen is on top.
  const focused = useIsFocused();
  const rules = houseRules;
  const [match, setMatch] = useState(() => resumed?.match ?? newMatch(config, firstServer));
  const [houseRule, setHouseRule] = useState<PartyCard | null>(
    () => rules.find((c) => c.id === resumed?.houseRuleId) ?? drawCard(rules),
  );

  // Chaos Rules: a Court Rule (instead of the house rule) that changes every few points.
  const chaos = settings.chaos;
  const [courtRule, setCourtRule] = useState<PartyCard | null>(() =>
    chaos ? (courtRules.find((c) => c.id === resumed?.courtRuleId) ?? drawCard(courtRules)) : null,
  );
  const [pendingBreak, setPendingBreak] = useState(false);
  // A match started from the setup screen can open with a water break.
  const [prompt, setPrompt] = useState<Shown | null>(() =>
    !resumed && pendingWaterBreak(history) ? WATER_BREAK : null,
  );
  const [pendingMoment, setPendingMoment] = useState<MomentId | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  // Between games: the Loser's Wheel and the result card, captured ahead of time
  // so sharing opens instantly (Safari only shares straight from a tap).
  const [wheel, setWheel] = useState<{ options: string[]; landed: number } | null>(null);
  const [wheelDone, setWheelDone] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<{ key: string; uri: string } | null>(null);
  const cardRef = useRef<View>(null);

  // The team that lost the last rally gets the next Party Card dare.
  const [lastLoser, setLastLoser] = useState<Team | null>(null);

  const spice = settings.spice;
  // Rendered once per rule so random penalties (exercises, Wild acts) don't change on every rally.
  const houseRuleText = useMemo(() => (houseRule ? renderPenalty(houseRule.text, spice) : ''), [houseRule, spice]);
  const courtRuleText = useMemo(() => (courtRule ? renderPenalty(courtRule.text, spice) : ''), [courtRule, spice]);
  const newCourtRule = () => drawCard(courtRules, courtRule ? [courtRule.id] : []);
  const names = config.teamNames;
  const audioOn = settings.sound || settings.voice;

  /** Show a prompt and announce it out loud. */
  const voice = { voice: settings.voice, announcer: usableAnnouncer(settings.announcer, access) };
  // Squeaky Pickle or Big Dill appear on the pop-ups they read out.
  const speaker = settings.voice ? ANNOUNCER_ART[voice.announcer] : undefined;
  /** Show a prompt and announce it, with `lead` (the score call) said first. */
  const show = (p: Shown, lead?: string) => {
    setPrompt(p);
    announce(p, { ...voice, sound: settings.sound, lead });
  };
  /** The score call, if the announcer calls the score. */
  const callout = (text: string) => (settings.scoreCalls ? text : '');
  const toggleAudio = () => {
    if (audioOn) hush();
    updateSettings({ sound: !audioOn, voice: !audioOn });
  };
  // Stop talking when leaving the match.
  useEffect(() => hush, []);

  // Banners fade on their own once they've been read out.
  useEffect(() => {
    if (!prompt || !isBanner(prompt)) return;
    const timer = setTimeout(() => setPrompt((p) => (p === prompt ? null : p)), bannerTime(prompt));
    return () => clearTimeout(timer);
  }, [prompt]);

  // Open the game: who serves first and "0, 0, start" (after a water break, if one is due).
  // A resumed game picks up where it left off instead.
  useEffect(() => {
    if (resumed) {
      announceLine(callout(`Welcome back. ${names[match.servingTeam]} serving. ${spokenScore(match)}`), voice);
      return;
    }
    const start = callout(scoreCallout(null, match));
    if (prompt !== WATER_BREAK) {
      announceLine(start, voice);
      return;
    }
    markWaterBreak(pendingWaterBreak(history));
    announce(WATER_BREAK, { ...voice, sound: settings.sound, lead: start });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the game after every rally, so a reload or switching apps doesn't lose it.
  // A finished game is in the stats instead, so it's forgotten here.
  useEffect(() => {
    // Finished, or undone back to the first serve: nothing worth resuming.
    if (match.winner !== null || match.rallies === 0) {
      if (savedMatch?.id === gameId) setSavedMatch(null);
      return;
    }
    setSavedMatch({
      id: gameId,
      match,
      firstServer,
      roundRobin: rrParam,
      houseRuleId: houseRule?.id,
      courtRuleId: courtRule?.id,
      savedAt: Date.now(),
    });
    // Only when the game itself changes; the saved copy changing must not loop back here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, houseRule, courtRule]);

  /**
   * Score a rally. A moment (net ball, ace…) brings its own prompt; it's shown
   * instead of a smaller event prompt, but a game-ending prompt still wins.
   */
  const onRally = (team: Team, moment?: PartyPrompt) => {
    if (match.winner !== null) return;
    const { state, events } = rallyWonBy(match, team);
    setMatch(state);
    tap(settings.haptics, Haptics.ImpactFeedbackStyle.Medium);
    setLastLoser(other(team));
    const p = promptForEvents(events, state, spice, Math.random, { calm: settings.calm });
    // A new Court Rule changes how the next rally is played, so it outranks the everyday prompts.
    let rulePrompt: PartyPrompt | null = null;
    if (chaos && courtRuleDue(match, state)) {
      const rule = newCourtRule();
      setCourtRule(rule);
      if (rule) rulePrompt = courtRulePrompt(rule.text, spice);
    }
    const next = p?.big ? p : (moment ?? rulePrompt ?? p);
    // The score comes first: players need it before the next serve, and the party
    // line can run long (simulated: late score calls drop from 16% of rallies to 1%).
    const call = callout(scoreCallout(match, state));
    if (next) show(next, call);
    else {
      announceLine(call, voice);
      // Play has moved on: an old banner would now be out of date.
      if (prompt && isBanner(prompt)) setPrompt(null);
    }
    if (state.winner !== null) {
      if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      recordGame(gameRecord(state));
      if (roundRobin) reportRoundRobin(roundRobin, config.teamNames, state.winner, state.scores);
    }
  };

  const onDraw = () => {
    // Court Rules come round on their own with Chaos Rules; the button draws the rest.
    const drawn = drawWithTeaser(
      deck.filter((c) => c.kind !== 'court'),
      access.isPro ? [] : lockedCards.filter((c) => c.kind !== 'court'),
      recent,
    );
    if (!drawn) return;
    const { card, locked } = drawn;
    setRecent((r) => [card.id, ...r].slice(0, 12));
    const pack = PACKS.find((p) => p.id === card.pack);
    const who = names[lastLoser ?? coinFlip()];
    show({
      emoji: locked ? '🔒' : '🃏',
      title: locked ? `Sneak peek: ${pack?.name}` : CARD_KIND_LABEL[card.kind],
      body: addressCard(renderPenalty(card.text, spice), card.kind, who),
      card: true,
      lockedPack: locked ? pack?.name : undefined,
      sound: 'whoosh',
    });
  };

  const resetBetweenGames = () => {
    setWheel(null);
    setWheelResult(null);
  };

  const spinWheel = () => {
    if (match.winner === null) return;
    const spin = spinLosersWheel(names[other(match.winner)], names[match.winner], spice);
    setWheelDone(false);
    setWheel(spin);
    if (settings.sound) playSound('drumroll');
  };
  const onWheelDone = () => {
    if (!wheel) return;
    const result = wheel.options[wheel.landed];
    setWheelDone(true);
    setWheelResult(result);
    announce(
      { emoji: '🎡', title: "Loser's Wheel", body: result, sound: 'kazoo' },
      { sound: settings.sound, voice: settings.voice, announcer: usableAnnouncer(settings.announcer, access) },
    );
  };

  // Capture the result card once the game-over screen is up.
  const imageKey = `${match.scores.join('-')}-${match.rallies}`;
  const gameOverShown =
    focused && match.winner !== null && prompt === null && pendingMoment === null && !pendingBreak && wheel === null;
  useEffect(() => {
    if (!gameOverShown || resultImage?.key === imageKey) return;
    const timer = setTimeout(() => {
      if (!cardRef.current) return;
      captureRef(cardRef, { format: 'png', quality: 1, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' })
        .then((uri) => setResultImage({ key: imageKey, uri }))
        .catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [gameOverShown, imageKey, resultImage]);

  const onUndo = () => {
    if (match.history.length === 0) return;
    // Undoing the winning point takes the result back out of the round robin too.
    if (roundRobin && match.winner !== null) reportRoundRobin(roundRobin, config.teamNames, null);
    resetBetweenGames();
    const previous = undo(match);
    setMatch(previous);
    // Say the corrected score, so everyone knows the mis-tap was fixed.
    announceLine(callout(`Undo. ${names[previous.servingTeam]} serving. ${spokenScore(previous)}`), voice);
  };

  // A Bluetooth clicker (a "page turner" or presentation remote) acts like a keyboard:
  // its two buttons score for the top and bottom team, so nobody has to touch the phone.
  // Kept in a ref so the key listener always sees the latest game.
  const keysRef = useRef<(key: string) => void>(() => {});
  useEffect(() => {
    keysRef.current = (key: string) => {
      if (['Backspace', 'u', 'U', 'z', 'Z'].includes(key)) return onUndo();
      const team = TOP_KEYS.includes(key) ? 0 : BOTTOM_KEYS.includes(key) ? 1 : null;
      // Only while a rally is being played: not over a card, a question or the end of the game.
      if (team === null || match.winner !== null || pendingMoment !== null || pendingBreak || tvHelp || wheel !== null) return;
      if (prompt && !isBanner(prompt)) return;
      if (prompt) setPrompt(null);
      onRally(team);
    };
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.repeat) return;
      if ([...TOP_KEYS, ...BOTTOM_KEYS].includes(e.key)) e.preventDefault();
      keysRef.current(e.key);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const rematch = () => {
    resetBetweenGames();
    const loser = match.winner === null ? firstServer : other(match.winner);
    const fresh = newMatch(config, loser);
    setMatch(fresh);
    const start = callout(scoreCallout(null, fresh));
    setHouseRule(drawCard(rules, houseRule ? [houseRule.id] : []));
    if (chaos) setCourtRule(newCourtRule());
    const due = pendingWaterBreak(history);
    if (due) {
      markWaterBreak(due);
      show(WATER_BREAK, start);
    } else {
      setPrompt(null);
      announceLine(start, voice);
    }
  };

  const subtitle = `${config.format === 'doubles' ? 'Doubles' : 'Singles'} · to ${config.target} · ${
    config.scoring === 'rally' ? 'rally' : 'side-out'
  }`;

  return (
    <SafeAreaView style={[styles.safe, sun && styles.sunBg]}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.headerBtn, sun && styles.sunMuted]}>✕ Quit</Text>
        </Pressable>
        <Pressable
          onPress={toggleAudio}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={audioOn ? 'Mute announcer' : 'Turn on announcer'}
          style={styles.subtitleRow}
        >
          <Text style={[styles.subtitle, sun && styles.sunMuted]} numberOfLines={1}>
            {subtitle}
          </Text>
          <Text style={styles.speaker}>{audioOn ? '🔊' : '🔇'}</Text>
        </Pressable>
        <Pressable
          onPress={() => updateSettings({ sunlight: !sun })}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={sun ? 'Turn off sunlight mode' : 'Sunlight mode: brighter, bigger text'}
        >
          <Text style={[styles.speaker, !sun && { opacity: 0.5 }]}>☀️</Text>
        </Pressable>
        <Pressable
          onPress={() => setTvHelp(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="How to show the game on a TV"
        >
          <Text style={[styles.speaker, !wide && { opacity: 0.5 }]}>📺</Text>
        </Pressable>
        <Pressable
          onPress={onUndo}
          disabled={match.history.length === 0}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.headerBtn, sun && styles.sunMuted, match.history.length === 0 && { opacity: 0.3 }]}>↶ Undo</Text>
        </Pressable>
      </View>

      {/* Above the team buttons, so a long banner can spill over them and stay readable. */}
      <View style={[styles.top, wide && styles.topWide]}>
      {chaos && courtRule ? (
        <Pressable
          style={[styles.rule, styles.courtRule, sun && styles.sunSurface, wide && styles.ruleWide]}
          onPress={() => setCourtRule(newCourtRule())}
          accessibilityHint="Draw a different Court Rule"
        >
          <Text style={[styles.ruleText, sun && styles.sunRuleText]} numberOfLines={3}>
            🌀 <Text style={styles.courtLabel}>Court Rule: </Text>
            {courtRuleText}
          </Text>
          <Text style={[styles.ruleHint, sun && styles.sunMuted]}>
            new rule in {pointsUntilNextRule(match)} point{pointsUntilNextRule(match) === 1 ? '' : 's'} · tap to skip
          </Text>
        </Pressable>
      ) : houseRule && (
        <Pressable
          style={[styles.rule, sun && styles.sunSurface, wide && styles.ruleWide]}
          onPress={() => setHouseRule(drawCard(rules, [houseRule.id]))}
          accessibilityHint="Draw a different house rule"
        >
          <Text style={[styles.ruleText, sun && styles.sunRuleText]} numberOfLines={3}>
            📜 <Text style={styles.ruleLabel}>House rule: </Text>
            {houseRuleText}
          </Text>
          <Text style={[styles.ruleHint, sun && styles.sunMuted]}>tap for new rule</Text>
        </Pressable>
      )}

      <Text style={[styles.call, wide && styles.callWide]} accessibilityLabel={`Score ${callScore(match)}`}>
        {callScore(match)}
      </Text>
      </View>

      <View style={[styles.courts, wide && styles.courtsWide]}>
        {([0, 1] as Team[]).map((t) => {
          const serving = match.servingTeam === t;
          return (
            <Pressable
              key={t}
              onPress={() => onRally(t)}
              accessibilityRole="button"
              accessibilityLabel={`${names[t]} won the rally`}
              style={({ pressed }) => [
                styles.team,
                wide && styles.teamWide,
                sun && styles.sunSurface,
                { borderColor: serving ? teamColors[t] : colors.surfaceHi },
                pressed && { transform: [{ scale: 0.98 }], backgroundColor: colors.surfaceHi },
              ]}
            >
              <View style={wide ? styles.teamInfoWide : { flex: 1 }}>
                <Text style={[styles.teamName, wide && bigName, { color: teamColors[t] }]} numberOfLines={1}>
                  {names[t]}
                </Text>
                <Text style={[styles.serveTag, sun && styles.sunServeTag, wide && [bigTag, { textAlign: 'center' }]]} numberOfLines={1}>
                  {serving
                    ? `🏓 Serving${
                        config.format === 'doubles' && config.scoring === 'sideout'
                          ? ` · server ${match.serverNumber}`
                          : ''
                      } · from the ${serveSide(match)}`
                    : 'tap when this team wins a rally'}
                </Text>
              </View>
              <Text style={[styles.score, wide && bigScore, { color: teamColors[t] }]}>{match.scores[t]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Every moment visible at once, 4 to a row: nothing to scroll for mid-game. */}
      <View style={[styles.moments, wide && styles.momentsWide]}>
        {chaos && courtRule && (
          <Pressable
            onPress={() => {
              if (match.winner !== null) return;
              tap(settings.haptics);
              setPendingBreak(true);
            }}
            style={[styles.moment, styles.breakMoment, sun && styles.sunSurface, wide && styles.momentWide]}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 22 }}>🚫</Text>
            <Text style={[styles.momentText, sun && styles.sunMomentText]}>Rule broken</Text>
          </Pressable>
        )}
        {MOMENTS.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              if (match.winner !== null) return;
              tap(settings.haptics);
              setPendingMoment(m.id);
            }}
            style={[styles.moment, sun && styles.sunSurface, wide && styles.momentWide]}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: wide ? 18 : 22 }}>{m.emoji}</Text>
            <Text style={[styles.momentText, sun && styles.sunMomentText]}>{m.label}</Text>
          </Pressable>
        ))}
        {/* Sideways there's no room for a full-width button, so the card draw joins the row. */}
        {wide && (
          <Pressable onPress={onDraw} style={[styles.moment, styles.momentWide, styles.drawWide]} accessibilityRole="button">
            <Text style={{ fontSize: 18 }}>🃏</Text>
            <Text style={[styles.momentText, { color: colors.bg }]}>Party Card</Text>
          </Pressable>
        )}
      </View>

      {!wide && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Button label="🃏  Draw a Party Card" variant="pink" onPress={onDraw} />
        </View>
      )}

      {/* One modal for everything: iOS can't present a second modal while another is closing. */}
      {/* The tip sits over the house rule for a few seconds and never blocks scoring. */}
      {tvTip && !wide && (
        <Pressable onPress={() => setTvTip(false)} style={styles.tvTip} accessibilityRole="button" accessibilityHint="Dismiss">
          <Text style={styles.tvTipText}>📺 Tip: turn your phone sideways for big-screen TV mode</Text>
        </Pressable>
      )}

      {!focused ? null : tvHelp ? (
        <Takeover
          visible
          emoji="📺"
          title={wide ? "You're in TV mode" : 'Put it on the big screen'}
          body={
            wide
              ? 'To show it on a TV: swipe down from the top-right corner for Control Center, tap Screen Mirroring and pick your TV.'
              : 'Turn your phone sideways for TV mode: big scores, side by side. Then swipe down from the top-right corner for Control Center, tap Screen Mirroring and pick your TV.'
          }
          footnote="Phone won't turn? Rotation lock is on: tap the lock icon in Control Center."
          onClose={() => setTvHelp(false)}
        >
          <Button label="Got it" onPress={() => setTvHelp(false)} />
        </Takeover>
      ) : pendingBreak ? (
        <Takeover visible emoji="🚫" title="Who broke the rule?" accent={colors.danger} onClose={() => setPendingBreak(false)}>
          {([0, 1] as Team[]).map((t) => (
            <Button
              key={t}
              label={names[t]}
              variant={t === 0 ? 'primary' : 'pink'}
              onPress={() => {
                // Breaking the Court Rule hands the rally to the other team.
                onRally(other(t), ruleBrokenPrompt(names[t], names[other(t)]));
                setPendingBreak(false);
              }}
            />
          ))}
        </Takeover>
      ) : pendingMoment !== null ? (
        <Takeover
          visible
          emoji={MOMENTS.find((m) => m.id === pendingMoment)?.emoji ?? '❓'}
          title={MOMENTS.find((m) => m.id === pendingMoment)?.ask ?? 'Who did it?'}
          onClose={() => setPendingMoment(null)}
        >
          {([0, 1] as Team[]).map((t) => (
            <Button
              key={t}
              label={names[t]}
              variant={t === 0 ? 'primary' : 'pink'}
              onPress={() => {
                // The moment ended the rally, so it scores it too.
                onRally(
                  momentRallyWinner(pendingMoment, t),
                  momentPrompt(pendingMoment, names[t], spice, names[other(t)]),
                );
                setPendingMoment(null);
              }}
            />
          ))}
        </Takeover>
      ) : prompt !== null && !isBanner(prompt) ? (
        <Takeover
          visible
          emoji={prompt.emoji}
          title={prompt.title}
          body={prompt.body}
          accent={prompt.lockedPack ? colors.sky : prompt.big ? colors.orange : colors.pickle}
          footnote={spice === 'wild' ? 'Not feeling the act? Skip it, no questions asked.' : undefined}
          speaker={speaker}
          onClose={() => setPrompt(null)}
        >
          {prompt.card ? (
            <>
              <Button label="Let's go!" onPress={() => setPrompt(null)} />
              {prompt.lockedPack ? (
                <Button
                  label={`🔓 Get ${prompt.lockedPack}`}
                  variant="secondary"
                  onPress={() => {
                    setPrompt(null);
                    openPaywall('pack');
                  }}
                />
              ) : (
                <Button label="Pass: draw another" variant="ghost" onPress={onDraw} />
              )}
            </>
          ) : undefined}
        </Takeover>
      ) : wheel !== null ? (
        <Takeover
          visible
          accent={colors.orange}
          hero={<LosersWheel key={wheel.options.join('|')} options={wheel.options} landed={wheel.landed} onDone={onWheelDone} />}
          onClose={() => wheelDone && setWheel(null)}
        >
          {wheelDone ? <Button label="Back to the results" onPress={() => setWheel(null)} /> : <></>}
        </Takeover>
      ) : (
        <Takeover
          visible={match.winner !== null && prompt === null}
          accent={match.winner !== null ? teamColors[match.winner] : colors.pickle}
          hero={
            <View style={styles.resultHero}>
              <ResultCard ref={cardRef} match={match} />
              {wheelResult && <Text style={styles.wheelResult}>🎡 {wheelResult}</Text>}
            </View>
          }
          onClose={() => {}}
        >
          <Button
            label="📣 Share the result"
            onPress={() => shareImage(resultImage?.key === imageKey ? resultImage.uri : null, shareText(match))}
          />
          {!wheelResult && <Button label="🎡 Spin the Loser's Wheel" variant="pink" onPress={spinWheel} />}
          {roundRobin ? (
            <Button label="🏟️ Back to the Round Robin" variant="secondary" onPress={back} />
          ) : (
            <Button label="🔁 Rematch" variant="secondary" onPress={rematch} />
          )}
          <View style={styles.resultRow}>
            <Button
              label={access.isPro ? '📊 Crew stats' : '👑 Crew stats'}
              variant="ghost"
              small
              style={{ flex: 1 }}
              onPress={() => (access.isPro ? router.push('/stats') : openPaywall('crewStats'))}
            />
            {!roundRobin && <Button label="Home" variant="ghost" small style={{ flex: 1 }} onPress={back} />}
          </View>
        </Takeover>
      )}
      {focused && prompt && isBanner(prompt) && (
        <PromptCard
          emoji={prompt.emoji}
          title={prompt.title}
          body={prompt.body}
          footnote={spice === 'wild' ? 'Not feeling the act? Skip it, no questions asked.' : undefined}
          duration={bannerTime(prompt)}
          speaker={speaker}
          wide={wide}
          onClose={() => setPrompt(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerBtn: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  speaker: { fontSize: 18 },
  rule: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  ruleText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  ruleLabel: { color: colors.orange, fontWeight: '900' },
  courtRule: { borderLeftColor: colors.danger },
  courtLabel: { color: colors.danger, fontWeight: '900' },
  breakMoment: { borderWidth: 2, borderColor: colors.danger },
  ruleHint: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'right' },
  call: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 8,
    letterSpacing: 4,
  },
  courts: { flex: 1, paddingHorizontal: 16, gap: 12 },
  team: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    paddingHorizontal: 20,
  },
  teamName: { fontSize: 24, fontWeight: '900' },
  serveTag: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  score: { fontSize: 96, fontWeight: '900', fontVariant: ['tabular-nums'] },
  moments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  moment: {
    flexBasis: '22%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  momentText: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  resultHero: { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
  wheelResult: { color: colors.orange, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  resultRow: { flexDirection: 'row', gap: 10 },
  top: { zIndex: 10, elevation: 10 },
  tvTip: {
    position: 'absolute',
    left: 16,
    right: 16,
    // Over the house rule (least needed in the first seconds), clear of the score and moment buttons.
    top: 52,
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 15,
    elevation: 15,
  },
  tvTipText: { color: colors.bg, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  // Sideways (TV) layout: rule and score call share one line, the teams sit side by side.
  topWide: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  ruleWide: { flex: 1, marginHorizontal: 0, paddingVertical: 8 },
  callWide: { fontSize: 40, marginVertical: 0 },
  courtsWide: { flexDirection: 'row', paddingTop: 8 },
  teamWide: { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingVertical: 6 },
  teamInfoWide: { alignItems: 'center', maxWidth: '100%' },
  momentsWide: { flexWrap: 'nowrap', paddingVertical: 6 },
  momentWide: { flexBasis: 0, paddingVertical: 4 },
  drawWide: { backgroundColor: colors.pink },
  // Sunlight mode: pure black, brighter and bigger text, so it reads outdoors at noon.
  sunBg: { backgroundColor: '#000000' },
  sunSurface: { backgroundColor: '#111111' },
  sunMuted: { color: '#FFFFFF' },
  sunRuleText: { fontSize: 17, fontWeight: '800' },
  sunServeTag: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sunMomentText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
