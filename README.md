# 🥒 PickleParty

**Keep score. Cause chaos. Don't get pickled.**

PickleParty is a pickleball scorekeeper crossed with a party game. You keep score
with one tap per rally, and the app turns big moments (side-outs, game point, a
shutout "pickle", 4-point streaks, net balls, ernes) into dares, house rules and,
for players 21+, drinking-game penalties.

Built with Expo (React Native + TypeScript), so the same code ships to iOS, Android and the web.

![Screens](docs/screenshots.png)

## Features

- **Real pickleball scoring.** Classic side-out doubles (`0-0-2` start, server 1/2), singles, or rally scoring. Play to 7, 11, 15 or 21, win by 2. Undo any tap.
- **Party engine.** Match events trigger prompts automatically: Game Point, Tied, 🔥 heaters, 👀 Pickle Watch, 🥒 **PICKLED!** (an 11-0 shutout), plus one-tap moments (net ball, ace, kitchen fault, erne/ATP, 10+ rally, body shot, way out).
- **House Rules.** Each game starts with a random rule card ("Nobody can say *out*, say *pickle*"). Tap it for a different one.
- **Spice levels.**
  - 🧃 **Chill**: no alcohol at all. Penalties become squats, planks and water. Anyone can play.
  - 🍺 **Tipsy** / 🔥 **Wild**: sips, and a Pickle Penalty for getting shut out. Unlocked only after the 21+ age gate.
- **Party Deck.** Dares, trick shots, house rules and group votes, playable anytime (on or off the court).
- **Leaderboard.** Win/loss record by team name, with a count of pickles, saved on the device.
- **Built for sharing.** You can share any result ("…and PICKLED them 🥒💀") or any card straight to the group chat.
- **Party Packs (in-app purchases).** Classic deck is free. *Kitchen Nightmares*, *Trick Shot Tour* and *After Dark* are premium packs.

## Run it

```bash
npm install
npm start            # scan the QR code with the Expo Go app on your phone
npm run web          # or play it in a browser
npm test             # unit tests for scoring + party logic
npm run typecheck
```

## Project layout

```
App.tsx               screen router + providers
src/game/scoring.ts   pure pickleball scoring engine (tested)
src/game/party.ts     match events → party prompts (tested)
src/game/cards.ts     card packs: add new cards here
src/game/spice.ts     chill/tipsy/wild penalty text
src/game/stats.ts     leaderboard
src/purchases.ts      in-app purchase boundary (swap in a real store SDK here)
src/storage.ts        on-device persistence
src/screens/          UI
```

Adding content is easy: append strings to `CARDS` in `src/game/cards.ts`. Use `{sips:N}`
for a penalty and `{finish}` for the big one. Chill mode rewrites both automatically,
and a test checks that chill mode never mentions alcohol.

## Shipping to the App Store

1. Create an Apple Developer account ($99/yr) and a Google Play account ($25 one-time).
2. `npx eas-cli@latest login`, then `npx eas-cli@latest build --platform ios --profile production`.
3. `npx eas-cli@latest submit --platform ios`. Bundle id is `app.pickleparty` (change it in `app.json` if it's taken).
4. **Age rating:** answer *"Frequent/Intense Alcohol, Tobacco, or Drug Use or References"* honestly. Drinking games are typically rated **17+** on iOS. The app already includes an age gate, a responsible-play notice, and an alcohol-free Chill mode.
5. Replace the placeholder icon/splash in `assets/` with real art (a cartoon pickle holding a paddle would work well), and set `APP_LINK` in `src/config.ts` to your store link so shared results link back to the app.

## Monetization

Free download, with paid add-ons:

| Revenue stream | Notes |
| --- | --- |
| **Party Packs** ($2.99 each) | Already in the UI. Set up products `pickleparty.pack.kitchen`, `.trickshots`, `.afterdark` in App Store Connect / Play Console. |
| **"Party Pass" subscription** | All current and future packs. Monthly content drops keep people subscribed. |
| **Venue / league edition** | Pickleball bars and clubs are an obvious B2B market: branded decks and leaderboards. |
| **Sponsored packs** | Paddle or drink brands sponsor a themed deck. |

**Hooking up real payments:** `src/purchases.ts` is the only file that talks to the
store. Install RevenueCat (`npx expo install react-native-purchases`), implement
`purchasePack` and `restorePurchases` with it, and make a development build
(`eas build --profile preview`). Until then, dev builds unlock packs for free and
release builds show "coming soon". **Nobody can be charged yet.**

## Growth playbook

- The share text on every result is what spreads the app. Every pickled game is a brag that links back to the store.
- Post short TikTok/Reels clips of the PICKLED! screen and of trick-shot card attempts. Pickleball content does very well on short-form video.
- Seed it with local clubs, rec leagues and pickleball bars, and give league organizers a free Party Pass.
- Ideas for next versions: a camera "trick shot cam" for recording card attempts, shareable result images, online leaderboards across friends, and a tournament bracket mode.

## Play responsibly

Drinking modes are for adults of legal drinking age only. Chill mode is always available. Never drink and drive.
