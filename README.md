# Q — skip the line, keep your seat

A free, real-time digital queue system for any walk-in business — banks,
clinics, restaurants, government offices, anywhere people currently stand in
a physical line. Customers scan a QR code and get a ticket with their
number, people ahead, and an estimated wait; they're notified the instant
it's their turn and which counter or table to go to. Staff run the line from
any terminal, and going on break needs no handoff — the next free counter
just keeps calling from the same queue.

## How it works

- **Customer** (`/b/:businessSlug`) — no login, no required app install.
  Scan → pick a queue → get a ticket → watch it update live. Works as a
  plain website or an installable PWA. A native app can wrap this later
  with Expo, reusing the same Firebase project.
- **Staff terminal** (`/staff/:businessSlug`) — signs in, picks a station
  (a counter or a table), calls the next customer, marks them served, or
  goes on break. A queue can be "cut off" to stop accepting new tickets
  (e.g. near closing time).
- **Super admin** (`/super-admin`) — you. Create businesses and see their
  customer/staff links. Restricted to `m.mukuka1323@gmail.com` via a
  Firebase custom claim (not just a client-side check — see
  `firestore.rules`).

### Why "go on break" needs no special logic

Tickets are never pre-assigned to a station. A free station "calls next",
which atomically claims the lowest waiting ticket number in that queue. A
station on break just stops calling — any other open station for that
queue naturally picks up the slack. No redistribution code needed.

## Stack (100% free tier)

- **Firebase Firestore** — real-time database, generous free (Spark) tier
- **Firebase Auth** — staff/admin login (email + password)
- **Firebase Hosting** — free static hosting for the built site
- No Cloud Functions required — the one privileged operation (granting
  admin/staff roles) is done by running a script *locally*, not by paying
  for a backend.

## First-time setup (Windows / PowerShell)

```powershell
git clone https://github.com/<your-username>/q-app.git
cd q-app
.\setup.ps1
```

Then:

1. [Create a free Firebase project](https://console.firebase.google.com/) if
   you don't have one.
2. In the Firebase console: **Build > Firestore Database** → create in
   production mode. **Build > Authentication** → enable Email/Password.
3. **Project settings > General > Your apps** → add a Web app, copy the
   config values into `.env`.
4. `firebase login` then `firebase use --add` to link this folder to your
   project.
5. `npm run dev` to run locally.

## Setting yourself up as super admin

1. Sign up once through the app (any sign-up form works, or create the user
   directly in the Firebase console under Authentication).
2. **Project settings > Service accounts > Generate new private key** →
   save it as `serviceAccountKey.json` in the project root (already
   gitignored).
3. Run:
   ```powershell
   .\scripts\set-claims.ps1 -Admin m.mukuka1323@gmail.com
   ```
4. Sign out and back in on `/super-admin` — the claim only takes effect on
   the next login.

## Adding a business

1. Sign in at `/super-admin`, add the business (name + slug).
2. In the Firestore console, under that business document, add:
   - a `queues` subcollection doc, e.g. `{ name: "General", cutoff: false, nextNumber: 1, avgServiceSeconds: 180 }`
   - a `stations` subcollection doc per counter/table, e.g. `{ name: "Counter 1", status: "active", currentTicketId: null }`
   (A small "add queue/station" form is a natural next step — kept out of
   this MVP to stay small; the data model in `src/lib/queue.ts` is what
   any future admin UI writes to.)
3. Grant staff access:
   ```powershell
   .\scripts\set-claims.ps1 -Staff staffmember@business.com -Business <businessId>
   ```
4. Print/display the QR code for `https://your-domain/b/<slug>` at the
   entrance, and open `https://your-domain/staff/<slug>` on each terminal.

## Deploying

```powershell
npm run deploy
```

Builds the site and pushes both Hosting and Firestore security rules.

## Language support

Client-side text is translated via `src/i18n` (currently English, French,
Spanish, Portuguese, Swahili). Add a new language by dropping a JSON file
in `src/i18n/locales/` with the same keys as `en.json` and registering it
in `src/i18n/index.ts`.

## Project structure

```
src/
  lib/firebase.ts    Firebase init + super-admin email allowlist
  lib/queue.ts        All queue/ticket/station logic (the "backend" — no server needed)
  pages/CustomerTicket.tsx   The whole customer experience
  pages/StaffTerminal.tsx    Staff terminal
  pages/SuperAdmin.tsx       You
  i18n/                      Translations
  styles/global.css          Design tokens + the ticket-stub visual identity
firestore.rules       Multi-tenant access control (the real security boundary)
scripts/set-claims.mjs / .ps1   Grant admin/staff roles (run locally, not a paid function)
```

## Roadmap ideas

- Small in-app forms for adding queues/stations (currently done via
  Firestore console) and for inviting staff without the CLI script.
- Optional browser push notifications so customers don't need the tab open.
- Native app via Expo reusing this Firebase project.
- Per-business analytics: average wait, busiest hours.
