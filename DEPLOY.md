# Putting the website online (free) — step by step

This folder is the **online version** of the site. It reads all its content from two Google Sheets,
so editing a Sheet and refreshing the page updates the website. Nothing here contains your API key.

---------------------------------------------------------------------------------------------------
## Step 1 — Put the data in Google Sheets
1. On your laptop, take the two Excel files from your WORKING folder
   (`D:\dad-profile-website\data\Asdaq_Publications.xlsx` and `Asdaq_Profile.xlsx`).
   Use these, not older copies: they contain today's Google Scholar update.
2. Upload both to a Google Drive folder (e.g. "Dad Profile Website").
3. Open each file → **File → Save as Google Sheets**. From now on use only the two Google Sheets.
4. In the Profile Google Sheet, **delete the "References" tab** (referee names should not be public).
5. Each Google Sheet → **Share** → General access: **Anyone with the link** → **Viewer** → Done.
6. Copy each sheet's ID from its address bar:
   `https://docs.google.com/spreadsheets/d/` **THIS_LONG_ID** `/edit`

## Step 2 — Connect the website to the Sheets
Open `js/config.js` in VS Code and paste the two IDs:
```js
source: "sheets",
sheets: {
  publicationsId: "…Publications sheet ID…",
  profileId: "…Profile sheet ID…"
},
```
Save. (This is the only code change.)

## Step 3 — Publish on GitHub Pages
1. Create a free account at https://github.com and click **New repository**.
   Name: e.g. `asdaq-profile` · Public · Create.
2. On the new repository page click **uploading an existing file**, drag in **everything inside this
   folder** (index.html, css, js, images, docs, DEPLOY.md) and click **Commit changes**.
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.
4. After 1–2 minutes the site is live at `https://YOUR-USERNAME.github.io/asdaq-profile/`.

To update the site's design later, upload the changed files again (same names) and commit.
Content changes never need GitHub: edit the Google Sheets.

## Step 4 — Automatic Google Scholar updates (every 90 days)
1. Open the **Profile** Google Sheet → **Extensions → Apps Script**.
2. Delete the sample code, paste the whole of `docs/google-apps-script/scholar-metrics.gs`, click **Save**.
3. **Project Settings** (gear) → **Script properties** → add three properties:
   | Property | Value |
   |---|---|
   | `SERPAPI_KEY` | your SerpApi key (same as in `secrets/serpapi_key.txt`) |
   | `PUBLICATIONS_SHEET_ID` | the Publications sheet ID from Step 1 |
   | `LAST_API_FETCH` | `2026-10-26` (the date of your last laptop fetch, so the next one is in 90 days) |
4. In the editor choose **refreshIfStale** → **Run** once → approve the permissions
   (Google will say the app is unverified: Advanced → Go to project). The log should say "No API call made".
5. **Triggers** (clock icon) → **Add Trigger** → function `refreshIfStale` → **Time-driven** → **Day timer** → Save.

From now on, every day it checks the date and, once 90 days have passed, it:
* refreshes Google Scholar citations, h-index, i10-index and citations per year (Metrics / Citations by Year tabs),
* refreshes every paper's citation count and logs them in the Citation History tab,
* adds new papers to a suggested theme tab, highlighted yellow "Auto-added – check theme".
To fetch immediately at any time: run **forceUpdate** (uses about 4 SerpApi searches).

## Step 5 (optional) — Your own web address
Buy a domain (about $10/year, e.g. from Namecheap or Google Domains partners), then in the repository
**Settings → Pages → Custom domain** enter it and follow GitHub's DNS instructions. HTTPS is free.

---------------------------------------------------------------------------------------------------
## After going online
* Your father edits the **Google Sheets** in his browser (they look and work like Excel), then refreshes the site.
* Your laptop folder (`D:\dad-profile-website`) is now only for testing design changes. Its
  `start-site.bat` updates the laptop Excel files, not the Google Sheets — the Apps Script does that online.
