# 🥒 PickleParty

**Play hard. Cause chaos. Don't get pickled.**

PickleParty is a pickleball party game. Nobody taps the phone every point: a regular
game ends with the final score and a workout for the losers, and the drinking game
(21+) is King of the Court in 3-point rounds, with a drink break and a rotation after
every round.

Built with Expo (React Native + TypeScript), so the same code ships to iOS, Android and the web.

![Screens](docs/screenshots.png)

## Features

- **Regular game: losers work out.** Pick two teams and what you're playing to, then go play. When it's over, enter the final score (tap a team to mark them the winner, ＋/− to adjust). The losers get a workout: squats, push-ups, lunges, burpees, jumping jacks or a plank, with more reps the bigger the loss and the most for getting pickled (shut out), plus a lap of shame (`src/game/workout.ts`). The result card shares as an image, and 🎡 **Spin the Loser's Wheel** adds one more fate (workouts only, no drinking).
- **Drinking game: King of the Court (21+).** Doubles (4+ players) or singles (2+). Add everyone's names. Two sides are on court (pairs, or one-on-one); they play **3 points** (rally scoring), then one tap enters how it went (3–0, 2–1, 1–2 or 0–3). At the **drink break** everyone drinks a sip for every point their side lost (+1 for getting swept), the **losing pair rotates off** and the next two waiting come on. Winners stay on as the 👑 Kings, but for at most 3 rounds in a row so everyone plays; with exactly 4 players in doubles, partners switch every round instead; with 5, one loser sits. In singles the loser rotates off and the next player comes on; with just two of you, you play on. Latecomers join the line, anyone can leave it, and the last round can be undone. Every 6th break is also a 💧 water break. The night ends with a leaderboard (rounds won, points, sips) to share (`src/game/rounds.ts`).
- **Party style (drinking game).** 😌 Calm: just the rounds and the drinks. 🎉 Party: draw a Party Card for the next round at any break. 🌀 Chaos: a new Court Rule every round (hands only, hold hands, silent rallies…).
- **Instant Replay (web, beta).** **● Film it** on the game screens films the court and always keeps the last 20–30 seconds (overlapping recordings, `src/replay/recorder.ts`). Tap the big preview after a great point to save it; in the drinking game a 3–0 sweep saves itself. Clips carry the team names, a tag ("ROUND 4") and a PickleParty watermark, turn with the phone (upright or sideways), stay on the phone, and are shared from the game screens. A group that films once has the camera start with the next game. Safari's quirks are handled: the camera restarts itself if it stalls (after the phone turns, say), and the announcer is woken up after the camera starts. The App Store version will do this natively, with a stitched highlight reel.
- **Announcer.** Reads the drink breaks, rotations and workouts out loud by name, with cartoon sound effects (air horn on a sweep or a pickle, kazoo fanfare on a win). Pick the voice: 🎙️ Classic (free), 🐿️ Squeaky Pickle or 🎩 Big Dill (Pro). On iPhone, Safari's speech is kept alive through interruptions (a line cut off by the camera starting, switching apps), and a silent sound loops in the background so the voice is heard even with the ringer switch on silent (Safari mutes speech on silent, but not playing media). Buttons give a soft tap sound (👆 Tap sounds, on by default) and haptics: a light buzz on taps, a success buzz at a drink break or final score (in the app, and in Android browsers; iPhone browsers can't vibrate).
- **Built for the court.** The screen stays on during a game. The drinking game is saved after every round, so if the page reloads (iPhone Safari often does after you switch apps) nothing is lost, and Home offers to go back to it.
- **Spice levels.**
  - 🧃 **Chill**: no alcohol at all. Penalties become squats, planks and water. Anyone can play.
  - 🍺 **Tipsy**: sips. Unlocked only after the 21+ age gate.
  - 🔥 **Wild** (couples only, 21+): Party Deck penalties add a flirty act with your own partner. Choosing it asks everyone to opt in.
- **Party Deck.** Dares, trick shots, house rules and group votes, playable anytime (on or off the court).
- **Stats.** Win/loss rankings by team name from regular games, with a count of pickles, saved on the device. Tap a game to see it or delete it; *Clear all games* asks first. Every delete can be undone.
- **Built for sharing.** Share any result card, the night's leaderboard, a highlight clip or any card straight to the group chat.

### PickleParty Pro (subscription or lifetime)

- ⚔️ **Crew Stats:** head-to-head rivalries, win streaks, Hall of Shame.
- 📜 **Unlimited history.** Free players keep every game, but only the latest 10 are visible.
- 📣 **Recap cards:** a weekly brag sheet to post in the group chat.
- 🏟️ **Round Robin:** runs open play for a crowd. Add everyone's name, pick courts and game length, and each round pairs up new partners with fair sit-outs. Tap the winning pair on each court when their game is done; the standings update as you go.
- 🃏 **Every Party Pack:** *Kitchen Nightmares*, *Trick Shot Tour*, *After Dark*, *Date Night*, seasonal packs like 🎃 *Halloween Bash*, and future drops.
- ✏️ **Custom cards:** your crew's inside jokes, shuffled into the deck.
- 🐿️ **Announcer voices:** Squeaky Pickle and Big Dill. Classic stays free.

💋 **Date Night** (21+ only) is a couples pack. Every dare involves only your own partner, everyone has to opt in each time it's switched on, and any card can be passed.

## Design

"Neon court at night" (`src/ui/theme.ts`): one deep gradient background with a floodlight glow, raised surfaces with hairline edges, gradient buttons that glow in their own color, and Fredoka as the display face (rounded, like the logo) with the system font for long text. Motion lives in `src/ui/motion.tsx` and is kept small: screens ease in, buttons and tiles spring when pressed, pop-ups land with a bounce, numbers and chips pop when they change, the logo bobs, and a win gets one burst of confetti. Everything animates transform and opacity only (native driver in the app), and it all switches off with the phone's Reduce Motion setting.

## Run it

```bash
npm install
npm start            # scan the QR code with the Expo Go app on your phone
npm run web          # or play it in a browser
npm test             # unit tests for game + business logic
npm run typecheck
npm run lint
```

## Project layout

```
src/app/                       screens (Expo Router: one file per route)
src/screens/                   screen UI
src/game/scoring.ts            pickleball scoring engine (tested)
src/game/party.ts              match events → party prompts (tested)
src/game/cards.ts              card packs: add new cards here
src/game/crew.ts               rivalries, streaks, recaps (tested)
src/game/roundRobin.ts         open-play scheduler (tested)
src/monetization/entitlements.ts  who gets what: trial, Pro, free limits (tested)
src/purchases.ts               payments via RevenueCat, plus the waitlist
src/config.ts                  links, payment keys, product ids
public/                        privacy policy, terms, waitlist form (served on the website)
```

Seasonal packs: give a pack a `season` (badge + months) in `PACKS` and it gets a "limited time" badge and a home-screen banner in those months. 🎃 *Halloween Bash* runs in October; when it's in the deck, random team names turn spooky ("The Dink Dead", "Boo Crew").

Adding content is easy: append strings to `CARDS` in `src/game/cards.ts`. Use `{sips:N}`
for a penalty and `{finish}` for the big one. Chill mode rewrites both automatically,
and a test checks that chill mode never mentions alcohol.

## Shipping to the App Store

1. Create an Apple Developer account ($99/yr) and a Google Play account ($25 one-time).
2. `npx eas-cli@latest login`, then `npx eas-cli@latest build --platform ios --profile production`.
3. `npx eas-cli@latest submit --platform ios`. Bundle id is `app.pickleparty` (change it in `app.json` if it's taken).
4. **Age rating:** answer *"Frequent/Intense Alcohol, Tobacco, or Drug Use or References"* honestly. Drinking games are typically rated **17+** on iOS. The app already includes an age gate, a responsible-play notice, and an alcohol-free Chill mode.
5. The app icon, splash, Android icons, favicon and in-app logo are all generated from the PickleParty logo in `assets/brand/logo-source.png` by `python3 scripts/make_icons.py`. To change the logo, replace that file and rerun the script. Keep `APP_LINK` in `src/config.ts` pointing at a page that links to the store, so shared results bring people back.

## Monetization

### The model

| | Free | Pro ($4.99/mo, $29.99/yr or $39.99 once) |
| --- | --- | --- |
| Scorekeeping, party prompts, Classic deck | ✅ forever | ✅ |
| Game history | latest 10 visible (all saved) | everything |
| Crew Stats, recaps, Round Robin, custom cards, Squeaky Pickle & Big Dill voices | sample/locked | ✅ |
| Premium packs | buy one at a time ($2.99, Date Night $3.99) | all included |

- **The free part stays free.** Scoring and the basic party game are how the app spreads, so they're never limited.
- **14-day reverse trial.** Every new player gets full Pro on day one with no card. When it ends, they keep playing free but lose the crew stats they got used to. That loss is the main reason to subscribe. The app shows one paywall when the trial ends and never interrupts again.
- **Sneak peeks.** Free players sometimes draw a real card from a locked pack, mid-party, when they're most likely to want more.
- **Lifetime Pro ($39.99 once)** is for crews who play a few times a month and won't subscribe to a party game. It also makes the yearly plan look like the better deal.
- **One phone runs the game,** so one organizer's subscription covers their whole crew at their matches.

### Before payments are live: the waitlist

With no payment keys set, the paywall says "Pro is launching soon" and collects emails.
That shows whether people actually want Pro before you pay Apple $99.

- Emails are saved by **Netlify Forms**. In Netlify, open your site → **Forms** → **Enable form detection**, then redeploy.
- Sign-ups appear under **Forms → pro-waitlist**, along with which locked feature people tapped (`interest`). That tells you which feature sells.

### Turning on real payments

`src/purchases.ts` uses [RevenueCat](https://www.revenuecat.com) (free to start; it takes a small cut once revenue grows), which handles Apple, Google and web payments.

1. In **App Store Connect**, create:
   - a subscription group with `pickleparty.pro.monthly` ($4.99) and `pickleparty.pro.annual` ($29.99)
   - a non-consumable in-app purchase `pickleparty.pro.lifetime` ($39.99)
   - non-consumable in-app purchases `pickleparty.pack.kitchen`, `.trickshots`, `.afterdark`, `.halloween` ($2.99) and `.datenight` ($3.99)
2. In **RevenueCat**:
   - add the app and import those products
   - create an entitlement named **`pro`** and attach both subscriptions and the lifetime product
   - make the default offering with **Monthly**, **Annual** and **Lifetime** packages
   - make a second offering called **`packs`** with one package per pack, named exactly `kitchen`, `trickshots`, `afterdark`, `chaos`, `halloween`, `datenight`
3. Put the RevenueCat public keys in EAS (and Netlify, for web payments through Stripe) as environment variables:
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_REVENUECAT_WEB_KEY`.
4. Build with `npx eas-cli@latest build --profile preview` and test with a Sandbox account. Purchases don't work in Expo Go; there, RevenueCat runs in a preview mode.

The paywall then shows real store prices, a plan picker, restore, and the auto-renew wording plus Terms and Privacy links that Apple requires. Both pages are in `public/` and are served at `/terms.html` and `/privacy.html`. They are starting templates, not legal advice; review them before launch.

Development builds show a **"DEV: turn Pro on/off"** button on the paywall so you can test both experiences.

### Other revenue later

| Stream | Notes |
| --- | --- |
| **Venue / league edition** | Pickleball bars and clubs: branded decks, leaderboards, round robins for their leagues. |
| **Sponsored packs** | Paddle or drink brands sponsor a themed deck. |
| **Merch** | "I got PICKLED 🥒" shirts via print-on-demand. |

## Growth playbook

- The share text on every result is what spreads the app. Every pickled game is a brag that links back to the store.
- Post short TikTok/Reels clips of the PICKLED! screen and of trick-shot card attempts. Pickleball content does very well on short-form video.
- Seed it with local clubs, rec leagues and pickleball bars, and give league organizers free Pro.
- Ideas for next versions: a camera "trick shot cam" for recording card attempts, shareable result images, online leaderboards across friends, and a tournament bracket mode.

## Play responsibly

Drinking modes are for adults of legal drinking age only. Chill mode is always available. Never drink and drive.
