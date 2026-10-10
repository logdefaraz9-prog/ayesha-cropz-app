# Ayesha Cropz mobile app (Android + iPhone)

This project turns the Ayesha Cropz website design into one app for both Android and iPhone using Capacitor.
The whole site lives in `www/index.html`. App icon and splash artwork are in `assets/`.

## Quick test APK (no installs needed)
This builds a test version of the Android app in the cloud. It is for testing only, not for the Play Store.
1. Create a free GitHub account and a new private repository.
2. Upload everything from this folder, including the hidden `.github` folder. If the upload page skips it, choose "Add file > Create new file", type `.github/workflows/build-apk.yml` as the name, and paste in the contents of `build-apk.yml`.
3. Open the repository's **Actions** tab, choose **Build test APK**, then **Run workflow**.
4. After about 5 to 10 minutes, open the finished run and download **ayesha-cropz-test-apk**. Unzip it to get `app-debug.apk`.
5. Send the APK to an Android phone and open it. Allow "install unknown apps" for the app you opened it from. If Play Protect warns, choose "Install anyway".

## What you need
- Node.js (https://nodejs.org)
- Android: Android Studio, and a Google Play Console account (one-time fee)
- iPhone: a Mac with Xcode, and an Apple Developer account (yearly fee). No Mac? Use a cloud build service such as Codemagic.

## Build steps
1. `npm install`
2. `npx cap add android` and `npx cap add ios`
3. `npm run assets`   (creates all icon and splash sizes from the `assets/` folder)
4. `npx cap sync`

### Android
5. `npx cap open android` opens Android Studio.
6. Build > Generate Signed App Bundle (.aab). Keep the signing key safe and backed up.
7. Upload the .aab in Google Play Console.

### iPhone
5. `npx cap open ios` opens Xcode.
6. Set the Team and the Bundle Identifier, then Product > Archive.
7. Upload to App Store Connect, then submit for review.

## What is already built in
- Bottom tab bar (Home, Soda, Careers, Contact, Call) that appears only inside the app
- "Share this app" button, tap-to-call, and an offline copy of the pages
- `www/privacy.html` privacy policy page (upload it to the client's domain and use its link in both stores)
- `www/manifest.webmanifest` and `www/sw.js` so the same files also work as an installable web app when hosted
- `STORE-LISTING.md` with ready-to-paste store text, privacy answers and a release checklist

## "Ask Ayesha" assistant
A side chat panel answers customer questions about prices, flavors, crates, hatchery, travel, CSC, careers, address and contact, including simple Hinglish. It works offline. See `assistant-server/README.md` to connect a real AI.

## Online ordering and live stock
Customers pick 1 bottle or 1 crate, see live availability, and order with UPI or pay on delivery. Stock and orders live in a Google Sheet. Customers can also track their order status (ID + phone). Without the sheet, orders are sent by email only and the Track tab is hidden. Follow `google-sheet/SETUP.md` to switch on live stock, order records and tracking.

## Welcome animation and sound
When the app opens, the Ayesha Soda logo draws itself, "Ayesha SODA" pops in with fizz, a cap pop and a chime, and a voice says "Welcome to Ayesha Soda". People can tap **Skip**. It also runs from "Replay welcome" in the footer.
- The fizz, pop and chime are made in code (no audio files).
- The voice is the phone's built-in speech voice, so it sounds different on each phone. For the best result, record a person saying "Welcome to Ayesha Soda", save it as `welcome.mp3` and put it in the `www` folder next to `index.html`. The app uses it automatically.
- Turned off for people who have "reduce motion" on in their phone settings.

## Before you publish
- Confirm the app ID `com.ayeshacropz.app` with the client (capacitor.config.json). It cannot change after release.
- Both stores need a privacy policy web page, because the forms collect names and phone numbers.
- Add real screenshots and an app description for each store.
- Apple can reject apps that are only a website in a frame. Adding a few native features helps, for example push notifications, tap-to-call, share and offline access.

## Updating content later
Edit `www/index.html`, then run `npx cap sync` and rebuild.

## Forms
Inquiry and job-application forms email info@ayeshacropz.co.in through FormSubmit. The first submission sends an
activation email to that address, which must be confirmed once.
