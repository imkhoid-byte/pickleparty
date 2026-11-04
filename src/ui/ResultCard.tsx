import { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { APP_LINK } from '../config';
import { Team, other } from '../game/scoring';
import { colors, radius, teamColors } from './theme';

const LOGO = require('../../assets/brand/logo-badge-512.png');

/** A finished game, as entered. */
export interface FinalScore {
  teamNames: [string, string];
  scores: [number, number];
  winner: Team;
  /** What the game was played to. */
  target: number;
}

/**
 * The final score as a card, shown on the game-over screen and shared as an
 * image (a picture in the group chat travels further than a line of text).
 */
export const ResultCard = forwardRef<View, { result: FinalScore }>(function ResultCard({ result }, ref) {
  const w = result.winner;
  const l = other(w);
  const names = result.teamNames;
  const pickled = result.scores[l] === 0;
  const accent = pickled ? colors.orange : teamColors[w];
  return (
    // The frame is what gets captured: it gives the image square corners in the
    // app's colors (a capture of the rounded card alone gets white corners on the web).
    // collapsable={false} keeps the view real on Android so it can be captured.
    <View ref={ref} collapsable={false} style={styles.frame}>
      <View style={[styles.card, { borderColor: accent }]}>
        <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={[styles.badge, { color: accent }]}>{pickled ? '🥒 PICKLED! 🥒' : '🏆 WINNERS 🏆'}</Text>
        <Text style={[styles.winner, { color: teamColors[w] }]} numberOfLines={2}>
          {names[w]}
        </Text>
        <Text style={styles.score}>
          {result.scores[w]} – {result.scores[l]}
        </Text>
        <Text style={styles.loser} numberOfLines={2}>
          {pickled ? `shut out ${names[l]}` : `beat ${names[l]}`}
        </Text>
        <Text style={styles.meta}>Game to {result.target}</Text>
        <Text style={styles.footer}>{APP_LINK.replace(/^https?:\/\//, '')} · #PickleParty</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { alignSelf: 'stretch', backgroundColor: colors.surface, padding: 6 },
  card: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 3,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 4,
  },
  logo: { width: 76, height: 76 },
  badge: { fontSize: 16, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },
  winner: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  score: { color: colors.text, fontSize: 58, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 66 },
  loser: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  footer: { color: colors.pickle, fontSize: 12, fontWeight: '800', marginTop: 8, textAlign: 'center' },
});
