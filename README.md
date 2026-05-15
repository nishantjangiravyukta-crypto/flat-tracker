# FlatTracker Next (Initial Scaffold)

A modern, mobile-first flatmates tracking app scaffold built with **Next.js + TypeScript + TailwindCSS + Zustand + Firebase-ready auth**.

## Implemented foundations

- ✅ Authentication scaffold (sign up/sign in, Google social login hook)
- ✅ Flat/group creation and join by invite code
- ✅ Shared expense tracking with split modes:
  - even split
  - ratio split
- ✅ Settle up transactions + recent history timeline
- ✅ Dashboard summary cards (total spend, owed/owing, upcoming bills, open chores)
- ✅ Task/chore management (create, assign, complete, delete)
- ✅ Real-time multi-tab updates with BroadcastChannel sync
- ✅ Mobile-first responsive UI with dark mode
- ✅ Firebase integration hooks with local demo fallback
- ✅ CI workflow (lint + build)
- ✅ Optional PWA manifest scaffold (`public/manifest.webmanifest`)

## Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript
- **Styling:** TailwindCSS 4
- **State:** Zustand
- **Backend-ready:** Firebase Auth integration points (`src/lib/firebase.ts`)

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Firebase setup (optional but recommended)

Create `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
```

Without these variables, the app still runs in **demo mode** with persistent local state.

## Project structure

- `src/app/page.tsx` – main UI and module scaffolding
- `src/store/useFlatStore.ts` – global state, persistence, and domain actions
- `src/lib/firebase.ts` – Firebase auth adapter and subscriptions
- `src/lib/types.ts` – shared domain types
- `.github/workflows/ci.yml` – CI for lint/build

## Roadmap

- [ ] Firestore/Supabase persistence for expenses/tasks/groups
- [ ] Email invite flow and deep-link join pages
- [ ] Push notifications for task reminders and bills
- [ ] Charting module (category and member trends)
- [ ] Full PWA install/offline support with icons + service worker
- [ ] Role-based permissions for group admins

## Contribution guide

1. Fork and clone.
2. Create a feature branch.
3. Run checks before PR:
   ```bash
   npm run lint
   npm run build
   ```
4. Keep modules typed and small; prefer store actions over inline mutation.
5. Add clear PR descriptions with screenshots for UI updates.
