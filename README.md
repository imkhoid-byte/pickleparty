# 🥒 PickleParty

**Play your games. We'll bring the chaos.**

PickleParty turns a normal session of pickleball into a party game. You play
exactly like you always do: nobody keeps score on a phone mid-rally. Between
games, someone enters the final score in two taps, and the app:

- picks who plays next (fair rotation or "winners stay", the way groups already rotate),
- deals a house rule for the next game,
- reveals the result with penalties (🥒 **PICKLED!** for an 11-0 shutout) and storylines
  ("🔥 Dee has won 5 straight", "😤 Revenge! Mike got one back on Eli"),
- and wraps up the night with a shareable recap (MVP, best duo, most pickled).

Built with Expo (React Native + TypeScript), so the same code ships to iOS, Android and the web.

![Screens](docs/screenshots.png)

## Features

- **Parties.** Add who's at the court once; next time they're one tap away. Doubles or singles, games to 7, 9, 11, 15 or 21. Add or remove people mid-party. A party survives the app being closed.
- **Two-tap scoring between games.** Who won, then the losing score (`11-7`). Extra-point games (`13-11`) supported.
- **Results reveal.** Penalties scale with the game: PICKLED!, blowouts, nail-biters. Storylines call out streaks, snapped streaks, revenge, first wins, milestone wins and unbeaten partnerships.
- **Live score (optional).** Someone sitting out can keep score rally by rally with the full party engine (game point, ties, heaters, Pickle Watch). The result flows back into the party.
- **House rules, moments and the Party Deck.** A rule for every game; one-tap moments (net ball, ace, kitchen fault, erne/ATP, 10+ rally, body shot, way out); dares, trick shots and group votes anytime.
- **Spice levels.**
  - 🧃 **Chill**: no alcohol at all. Penalties become squats, planks and water. Anyone can play.
  - 🍺 **Tipsy** / 🔥 **Wild**: sips, and a Pickle Penalty for getting shut out. Unlocked only after the 21+ age gate.
- **Player stats.** Every game is tracked per person (partners rotate in pickleball), with rankings for everyone.
- **Built for sharing.** The night's recap, player cards and party cards all share straight to the group chat with a link back to the app.

### PickleParty Pro (subscription)

- ⚔️ **Player profiles:** head-to-head vs everyone, best partner, nemesis, favorite victim, points +/-.
- 🔄 **Smart rotation:** fair sit-outs with new partners every game, or "winners stay" (capped at 2 games). Free parties shuffle randomly.
- 📜 **Every game, forever.** Free players keep every game, but only the latest 10 are visible.
- 🔥 **Streaks & Hall of Shame.**
- 🃏 **Every Party Pack:** *Kitchen Nightmares*, *Trick Shot Tour*, *After Dark*, *Date Night* and future drops.
- ✏️ **Custom cards:** your crew's inside jokes, shuffled into the deck.

💋 **Date Night** (21+ only) is a couples pack. Every dare involves only your own partner, everyone has to opt in each time it's switched on, and any card can be passed.

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
src/game/party.ts              match events & results → party prompts (tested)
src/game/players.ts            player records, profiles, storylines, recaps (tested)
src/game/rotation.ts           who plays next: fair / winners stay / random (tested)
src/game/cards.ts              card packs: add new cards here
src/monetization/entitlements.ts  who gets what: trial, Pro, free limits (tested)
src/purchases.ts               payments via RevenueCat, plus the waitlist
src/config.ts                  links, payment keys, product ids
public/                        privacy policy, terms, waitlist form (served on the website)
```

Adding content is easy: append strings to `CARDS` in `src/game/cards.ts`. Use `{sips:N}`
for a penalty and `{finish}` for the big one. Chill mode rewrites both automatically,
and a test checks that chill mode never mentions alcohol.

## Shipping to the App Store

1. Create an Apple Developer account ($99/yr) and a Google Play account ($25 one-time).
2. `npx eas-cli@latest login`, then `npx eas-cli@latest build --platform ios --profile production`.
3. `npx eas-cli@latest submit --platform ios`. Bundle id is `app.pickleparty` (change it in `app.json` if it's taken).
4. **Age rating:** answer *"Frequent/Intense Alcohol, Tobacco, or Drug Use or References"* honestly. Drinking games are typically rated **17+** on iOS. The app already includes an age gate, a responsible-play notice, and an alcohol-free Chill mode.
5. Replace the placeholder icon/splash in `assets/` with real art (a cartoon pickle holding a paddle would work well), and keep `APP_LINK` in `src/config.ts` pointing at a page that links to the store, so shared results bring people back.

## Monetization

### The model

| | Free | Pro ($4.99/mo or $29.99/yr) |
| --- | --- | --- |
| Parties, two-tap scoring, results reveal, recap, rankings, Classic deck | ✅ forever | ✅ |
| Game history | latest 10 visible (all saved) | everything |
| Player profiles, streaks, smart rotation, custom cards | locked (random rotation) | ✅ |
| Premium packs | buy one at a time ($2.99, Date Night $3.99) | all included |

- **The free part stays free.** Playing a full party and sharing the recap is how the app spreads, so it's never limited.
- **14-day reverse trial.** Every new player gets full Pro on day one with no card. When it ends, they keep playing free but lose the player profiles and fair rotation they got used to. That loss is the main reason to subscribe. The app shows one paywall when the trial ends and never interrupts again.
- **Sneak peeks.** Free players sometimes draw a real card from a locked pack, mid-party, when they're most likely to want more.
- **One phone runs the party,** so one organizer's subscription covers their whole crew. Organizers feel the pain of "who's up next?" most, and smart rotation solves it.

### Before payments are live: the waitlist

With no payment keys set, the paywall says "Pro is launching soon" and collects emails.
That shows whether people actually want Pro before you pay Apple $99.

- Emails are saved by **Netlify Forms**. In Netlify, open your site → **Forms** → **Enable form detection**, then redeploy.
- Sign-ups appear under **Forms → pro-waitlist**, along with which locked feature people tapped (`interest`). That tells you which feature sells.

### Turning on real payments

`src/purchases.ts` uses [RevenueCat](https://www.revenuecat.com) (free to start; it takes a small cut once revenue grows), which handles Apple, Google and web payments.

1. In **App Store Connect**, create:
   - a subscription group with `pickleparty.pro.monthly` ($4.99) and `pickleparty.pro.annual` ($29.99)
   - non-consumable in-app purchases `pickleparty.pack.kitchen`, `.trickshots`, `.afterdark` ($2.99) and `.datenight` ($3.99)
2. In **RevenueCat**:
   - add the app and import those products
   - create an entitlement named **`pro`** and attach both subscriptions
   - make the default offering with **Monthly** and **Annual** packages
   - make a second offering called **`packs`** with one package per pack, named exactly `kitchen`, `trickshots`, `afterdark`, `datenight`
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
