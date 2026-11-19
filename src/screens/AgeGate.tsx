import { Image, Linking, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useApp } from '../AppState';
import { PRIVACY_URL, TERMS_URL, TERMS_VERSION } from '../config';
import { Button, Screen } from '../ui/components';
import { Float, PopIn } from '../ui/motion';
import { colors, font } from '../ui/theme';

const LOGO = require('../../assets/brand/logo-badge-512.png');

/**
 * First launch (and again whenever the Terms change): the age question, and
 * the player's agreement to the Terms. Tapping either button is the agreement.
 */
export function AgeGate() {
  const { settings, updateSettings } = useApp();
  // A short phone gets a smaller logo, so the buttons never fall off the screen.
  const { height } = useWindowDimensions();
  const logo = height < 720 ? 140 : 220;
  // Coming back to agree to new Terms: keep their spice if their age answer hasn't changed.
  const returning = settings.ageAsked;
  const answer = (adult: boolean) =>
    updateSettings({
      ageAsked: true,
      ageConfirmed: adult,
      spice: returning && settings.ageConfirmed === adult ? settings.spice : adult ? 'tipsy' : 'chill',
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: Date.now(),
      // First launch also starts the free Pro trial.
      trialStartedAt: settings.trialStartedAt ?? Date.now(),
    });
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        {/* The first thing anyone sees: the logo lands, then bobs. */}
        <PopIn>
          <Float>
            <Image source={LOGO} style={{ width: logo, height: logo }} accessibilityLabel="PickleParty" />
          </Float>
        </PopIn>
        <Text style={styles.title}>{returning ? 'Quick update' : 'Welcome!'}</Text>
        <Text style={styles.body}>
          {returning ? 'We updated our Terms. ' : ''}PickleParty has optional drinking-game modes. Are you of legal
          drinking age (21+) where you live?
        </Text>
        <Text style={styles.fine}>
          Play responsibly: every dare and drink is optional, never drink and drive, and stop if you feel unwell.
          You play at your own risk and you are responsible for your own actions. By continuing you agree to
          the{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
            Terms of Use
          </Text>{' '}
          and{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Privacy Policy
          </Text>
          .
        </Text>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          <Button label="I'm 21+ and I agree" onPress={() => answer(true)} />
          <Button label="I agree, keep it alcohol-free" variant="secondary" onPress={() => answer(false)} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  title: { color: colors.pickle, fontSize: 40, fontFamily: font.bold, textAlign: 'center' },
  body: { color: colors.text, fontSize: 18, textAlign: 'center', lineHeight: 26 },
  fine: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  link: { color: colors.sky, textDecorationLine: 'underline' },
});
