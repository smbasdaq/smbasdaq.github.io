# SOP: move the data to Google Drive and connect the site

1. **Upload** `data/Asdaq_Publications.xlsx` and `data/Asdaq_Profile.xlsx` to a Google Drive folder (e.g. `Dad Profile Website/data`).
2. **Convert**: open each file → File → *Save as Google Sheets*. Work only in the Google Sheets versions from now on.
3. **Share**: Share → General access → *Anyone with the link* → *Viewer*.
4. **Copy the IDs** from each address bar: `https://docs.google.com/spreadsheets/d/<ID>/edit`.
5. **Edit `js/config.js`**:
   ```js
   source: "sheets",
   sheets: { publicationsId: "<publications ID>", profileId: "<profile ID>" }
   ```
6. **Test locally** (`python -m http.server 8000`), then publish.

## Day-to-day editing
* Add a paper: new row at the bottom of the right theme tab. Year, Title, Authors, Journal, DOI (just `10.xxxx/...`).
* Add a theme: add a row in **Themes** (Code, Tab, Display Name, Description, Icon, Order) and create a tab with exactly that **Tab** name and the same headings as the other theme tabs.
  Icons available: heart, leaf, brain, accessibility, droplet, virus, globe, pill, flask, dna, wheat.
* Update metrics: edit the **Metrics** tab in the profile sheet; set `Show` = Yes for ResearchGate / Web of Science rows once filled.

## Why gviz links
The site reads each tab with `.../gviz/tq?tqx=out:csv&sheet=<Tab name>`. This needs only the sheet ID and the tab name, so no "Publish to web" step per tab is needed. The sheet must be viewable by anyone with the link.

## Automatic Google Scholar numbers (optional, free)
Google Scholar has no public data feed, so the site cannot read it directly. SerpApi reads it for you.

1. Sign up at https://serpapi.com/users/sign_up (free plan: 250 searches/month).
2. Copy your **Private API Key** from https://serpapi.com/manage-api-key.
3. Open the **profile** Google Sheet → Extensions → Apps Script → paste `docs/google-apps-script/scholar-metrics.gs`.
4. Project Settings → Script properties → add `SERPAPI_KEY` = your key.
5. Run `updateScholarMetrics` once (approve permissions), then add a daily time-driven trigger.

The script updates the Google Scholar rows in the **Metrics** tab (citations, h-index, i10-index, As of) and fills a **Citations by Year** tab.
The top of the website and the Analytics section both read those rows, so they update together.
Never paste the API key into the website files: anyone could read it and use up your quota.
