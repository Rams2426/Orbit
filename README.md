# Orbit — Workspace, Tasks & Team Collaboration

Orbit is a modern workspace application for managing tasks, schedules, and team workflows with real-time Firebase Firestore synchronization, Google Authentication, and instant QR-code team onboarding.

---

## Free Hosting Options (No Phone Number Required)

### Option 1: GitHub Pages (Easiest — Built into GitHub, No New Account Needed)
Since your code is on GitHub, you can host it directly on **GitHub Pages** without signing up for any third-party service:
1. Push this project to GitHub using the **GitHub icon** in the top toolbar of AI Studio.
2. Open your repository on GitHub and click **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, change the dropdown from `Deploy from a branch` to **GitHub Actions**.
4. Go to the **Actions** tab, select **Deploy to GitHub Pages**, and click **Run workflow** (or push a commit to `main`).
5. Your app will be live at `https://<your-username>.github.io/<repo-name>/`!
6. Add `<your-username>.github.io` to [Firebase Authorized Domains](https://console.firebase.google.com/project/gen-lang-client-0418095004/authentication/settings).

---

### Option 2: Cloudflare Pages (Fastest Global CDN — No Phone Number Required)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) (only requires email & password — no phone number).
2. In the left sidebar, click **Compute (Workers & Pages)** → **Create** → **Pages** → **Connect to Git**.
3. Select your GitHub repository.
4. Set **Framework preset** to `Vite` (`npm run build`, output directory `dist`) and click **Save and Deploy**.
5. Add your `.pages.dev` domain to [Firebase Authorized Domains](https://console.firebase.google.com/project/gen-lang-client-0418095004/authentication/settings).

---

### Option 3: Render Static Sites (Sign in with GitHub — No Phone Number Required)
1. Go to [dashboard.render.com](https://dashboard.render.com/register) and click **Sign in with GitHub**.
2. Click **New +** → **Static Site** and select your repository.
3. Set:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Click **Create Static Site**.
5. Add your `.onrender.com` domain to [Firebase Authorized Domains](https://console.firebase.google.com/project/gen-lang-client-0418095004/authentication/settings).

---

### Option 4: Firebase Hosting (Uses Your Existing Google Account)
Since your database is already on Firebase, you can host on Firebase Hosting (`gen-lang-client-0418095004.web.app` is already pre-authorized for Google Sign-In!):
1. Open your repo in **GitHub Codespaces** (click the green **Code** button on GitHub → **Codespaces** → **Create codespace on main**).
2. Run in the Codespaces terminal:
   ```bash
   npm install
   npm run build
   npx firebase-tools login --no-localhost
   npx firebase-tools deploy --only hosting
   ```

---

## Important: Authorize Your Hosting Domain in Firebase

Whenever you deploy to a new domain (`<username>.github.io`, `*.pages.dev`, `*.onrender.com`, etc.), add it to Firebase so Google Sign-In works:
1. Open [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/gen-lang-client-0418095004/authentication/settings).
2. Click **Add domain** and enter your domain (e.g., `your-username.github.io` — without `https://` or path).
