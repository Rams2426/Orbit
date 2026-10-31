# Orbit — Workspace, Tasks & Team Collaboration

Orbit is a modern workspace application for managing tasks, schedules, and team workflows with real-time Firebase Firestore synchronization, Google Authentication, and instant QR-code team onboarding.

---

## Deploying to Vercel via GitHub (Step-by-Step)

This project is pre-configured for **zero-config Vercel deployment** via `vercel.json` (including Vite build settings and SPA routing rewrites).

### Step 1: Push to GitHub from AI Studio
1. Click the **Export / Save to GitHub** (GitHub icon) button in the top-right toolbar of Google AI Studio.
2. Connect your GitHub account if prompted.
3. Enter a repository name (for example, `orbit-workspace`) and click **Create & Push**.

### Step 2: Import into Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and sign in with your GitHub account.
2. Find your newly created `orbit-workspace` repository and click **Import**.
3. Vercel will automatically detect **Vite** (`npm run build`, output directory `dist`) from `vercel.json`.
4. Click **Deploy**. Wait ~45 seconds for Vercel to give you your live `.vercel.app` URL (e.g., `https://orbit-workspace.vercel.app`).

### Step 3: Authorize Your Vercel Domain in Firebase (Required for Google Sign-In)
Because Orbit uses **Firebase Google Sign-In**, Firebase blocks sign-in popups from unknown domains until you whitelist your Vercel domain:
1. Open the [Firebase Console — Authentication Settings](https://console.firebase.google.com/project/gen-lang-client-0418095004/authentication/settings).
2. Click the **Authorized domains** tab.
3. Click **Add domain** and paste your Vercel domain (e.g. `orbit-workspace.vercel.app` — without `https://`).
4. Click **Add**. Google Sign-In and real-time team sync will immediately work on your live Vercel site!

---

## Features

- **Workspace Dashboard**: Real-time overview of progress, upcoming deadlines, urgent priorities, and completion metrics.
- **Interactive Calendar**: Month view with task indicators, quick-add per date, and filtering.
- **Task Management**: Priorities, due dates, subtasks, notes, and role-tailored task types (Designer & Student workflows).
- **Team Collaboration**: Create or join teams via shareable invite links or scannable QR codes, assign tasks to team members, and track team progress in real time.
- **Collapsible Sidebar & Theme Support**: Responsive desktop/mobile navigation with Light, Dark, and System theme modes.

---

## Local Development

### Prerequisites
- **Node.js** 18+ and **npm**

### Setup
1. Clone your repository and install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (runs on port `3000`):
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
