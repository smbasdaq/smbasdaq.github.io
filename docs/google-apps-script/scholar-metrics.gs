/**
 * Google Scholar → Google Sheets updater (online version of tools/update_scholar.py)
 * ================================================================================
 * Paste this whole file into the PROFILE Google Sheet:  Extensions → Apps Script.
 *
 * Every 90 days it:
 *   1. Fetches Prof. Asdaq's Google Scholar profile through SerpApi (about 4 searches).
 *   2. Profile sheet  → Metrics tab: Google Scholar Citations, h-index, i10-index + "As of" date.
 *                     → Citations by Year tab: Year, Citations (chart on the website).
 *   3. Publications sheet → adds papers published since the last fetch (OpenAlex, free; and
 *                           Google Scholar) to a suggested theme tab, highlighted yellow
 *                           "Auto-added – check theme". Supplementary files, corrections and
 *                           duplicates are skipped.
 *                         → refreshes every paper's Citations value and logs them in the
 *                           "Citation History" tab.
 *   4. Saves the fetch date. If anything fails, nothing is saved and the date is unchanged.
 *
 * ONE-TIME SETUP
 *   a. Project Settings (gear icon) → Script properties → Add:
 *        SERPAPI_KEY            = your SerpApi private API key
 *        PUBLICATIONS_SHEET_ID  = the ID of the Publications Google Sheet
 *                                 (the long code in its address bar between /d/ and /edit)
 *   b. Select  forceUpdate  in the toolbar and click Run once. Approve the permissions.
 *      (This is the first fetch. Check the Execution log for the summary.)
 *   c. Triggers (clock icon) → Add trigger → function: refreshIfStale → Time-driven → Day timer.
 *      It checks the date daily and calls SerpApi only when 90 days have passed.
 *
 * The key stays inside Google; it is never in the website files.
 */

const REFRESH_DAYS = 90;
const DEFAULT_SCHOLAR_ID = "MfkzUuQAAAAJ";
const DEFAULT_OPENALEX_ID = "A5028700323";
const TZ = "Asia/Riyadh";

// ---------- Entry points ----------

/** Daily trigger target: fetch on the first run, then only when the last fetch is 90+ days old. */
function refreshIfStale() {
  const last = PropertiesService.getScriptProperties().getProperty("LAST_API_FETCH");
  const ageDays = last ? (Date.now() - new Date(last + "T00:00:00").getTime()) / 86400000 : Infinity;
  if (ageDays < REFRESH_DAYS) {
    console.log("Last API fetch " + last + " (" + Math.floor(ageDays) + " days ago). No API call made.");
    return;
  }
  runUpdate_(last);
}

/** Run manually to fetch now, regardless of the date. */
function forceUpdate() {
  runUpdate_(PropertiesService.getScriptProperties().getProperty("LAST_API_FETCH"));
}

// ---------- Main ----------

function runUpdate_(last) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty("SERPAPI_KEY");
  const pubId = props.getProperty("PUBLICATIONS_SHEET_ID");
  if (!key) throw new Error("Add SERPAPI_KEY under Project Settings → Script properties.");
  if (!pubId) throw new Error("Add PUBLICATIONS_SHEET_ID under Project Settings → Script properties.");

  const profile = SpreadsheetApp.getActiveSpreadsheet();
  const pubs = SpreadsheetApp.openById(pubId);
  const today = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  const since = last || Utilities.formatDate(new Date(Date.now() - REFRESH_DAYS * 86400000), TZ, "yyyy-MM-dd");

  // 1) Fetch everything first; if this throws, nothing has been changed.
  const data = fetchAll_(key, scholarId_(profile));
  const metrics = parseMetrics_(data);
  let openalex = [];
  try { openalex = fetchOpenAlexNew_(openAlexId_(profile), since); }
  catch (e) { console.log("OpenAlex check skipped: " + e); }

  // 2) Write
  updateMetrics_(profile, metrics, today);
  const added = addNewPapers_(pubs, openalex, data.articles, since, today);
  const cit = updatePaperCitations_(pubs, data.articles, today);

  // 3) Remember the date only after everything succeeded
  props.setProperty("LAST_API_FETCH", today);

  added.forEach((a) => console.log("New paper added to '" + a[0] + "': " + a[1]));
  console.log("New papers added: " + added.length);
  console.log("Paper citations updated for " + cit[0] + " of " + cit[1] + " papers (" + data.searches + " searches used).");
  console.log("Updated " + today + ": citations " + metrics.values.Citations + ", h-index " + metrics.values["h-index"] +
              ", i10-index " + metrics.values["i10-index"] + "; " + metrics.graph.length + " years of citation history.");
}

// ---------- SerpApi (Google Scholar) ----------

function fetchPage_(key, authorId, start) {
  const url = "https://serpapi.com/search.json?engine=google_scholar_author&hl=en&num=100&start=" + start +
              "&author_id=" + encodeURIComponent(authorId) + "&api_key=" + encodeURIComponent(key);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("SerpApi error " + res.getResponseCode() + ": " + res.getContentText().slice(0, 300));
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error("SerpApi error: " + json.error);
  return json;
}

function fetchAll_(key, authorId) {
  const first = fetchPage_(key, authorId, 0);
  let articles = first.articles || [];
  let page = 1;
  while (articles.length === 100 * page && page < 6) {
    const more = fetchPage_(key, authorId, 100 * page).articles || [];
    if (!more.length) break;
    articles = articles.concat(more);
    page++;
  }
  first.articles = articles;
  first.searches = page;
  return first;
}

function parseMetrics_(data) {
  const table = (data.cited_by && data.cited_by.table) || [];
  const pick = (name) => { const r = table.find((t) => t[name]); return r ? r[name].all : null; };
  const values = { "Citations": pick("citations"), "h-index": pick("h_index"), "i10-index": pick("i10_index") };
  if (values.Citations == null) throw new Error("No citation table in the SerpApi response; nothing changed.");
  const graph = ((data.cited_by && data.cited_by.graph) || []).filter((g) => g.year).map((g) => [g.year, g.citations]);
  return { values: values, graph: graph };
}

// ---------- Profile sheet ----------

function scholarId_(profile) {
  const sh = profile.getSheetByName("Links");
  if (sh) {
    const vals = sh.getDataRange().getValues();
    for (const row of vals) for (const c of row) {
      if (typeof c === "string" && c.indexOf("scholar.google") >= 0) {
        const m = c.match(/[?&]user=([^&]+)/);
        if (m) return m[1];
      }
    }
  }
  return DEFAULT_SCHOLAR_ID;
}

function openAlexId_(profile) {
  const sh = profile.getSheetByName("Metrics");
  if (sh) {
    const vals = sh.getDataRange().getValues();
    for (const row of vals) for (const c of row) {
      if (typeof c === "string") { const m = c.match(/openalex\.org\/(A\d+)/); if (m) return m[1]; }
    }
  }
  return DEFAULT_OPENALEX_ID;
}

function setText_(range, text) { range.setNumberFormat("@").setValue(String(text)); }

function updateMetrics_(profile, metrics, today) {
  const m = profile.getSheetByName("Metrics");
  const rows = m.getDataRange().getValues();
  const head = rows[0];
  const S = head.indexOf("Source"), M = head.indexOf("Metric"), V = head.indexOf("Value"), A = head.indexOf("As of");
  for (let r = 1; r < rows.length; r++) {
    const v = metrics.values[rows[r][M]];
    if (rows[r][S] === "Google Scholar" && v != null) {
      m.getRange(r + 1, V + 1).setValue(v);
      setText_(m.getRange(r + 1, A + 1), today);
    }
  }
  if (metrics.graph.length) {
    const sh = profile.getSheetByName("Citations by Year") || profile.insertSheet("Citations by Year");
    sh.clearContents();
    sh.getRange(1, 1, 1, 3).setValues([["Year", "Citations", "Source"]]);
    sh.getRange(2, 1, metrics.graph.length, 3).setValues(metrics.graph.map((g) => [g[0], g[1], "Google Scholar via SerpApi, " + today]));
  }
}

// ---------- Publications sheet ----------

const THEME_RULES = [ // same rules as tools/update_scholar.py — first match wins
  ["GBD", /global burden of disease|gbd|204 countries|global, regional, and national|global burden/i],
  ["TEC", /machine learning|deep learning|artificial intelligence|neural network|in[- ]silico|docking|computational|qsar|bioinformatic|network medicine|digital|algorithm|genome/i],
  ["DIS", /disabilit|learning disab/i],
  ["COV", /covid|sars-cov|coronavirus|pandemic|vaccin|tubercul|dengue|malaria|antimicrob|antibacterial|antifungal|infection|antibiotic|meningitis|hiv|infectious/i],
  ["CAN", /cancer|tumou?r|lncrna|oncolog|anticancer|cytotoxic|apoptotic|carcinoma|breast|prostat/i],
  ["CAR", /myocard|cardio|isoproterenol|isoprenaline|ischemia|heart|hypertens|anticoagula|thrombo|ldl|dyslipid|hypolipid/i],
  ["NEU", /depress|anxi|stress|epilep|neuro|alzheimer|parkinson|memory|cognit|brain|mental|psycholog|sleep/i],
  ["MET", /diabet|obes|glycemic|insulin|metabolic|polycystic|pcos|vitamin d|fatty liver/i],
  ["PHP", /pharmacist|pharmacy|prescri|medication|dispens|adherence|self-medication|patient|students|knowledge, attitude|drug interaction|contraindication/i],
  ["DDS", /nano|formulation|gel|tablet|film|hydrogel|delivery|hplc|hptlc|electrochem|sensor|synthes|derivative|patent/i],
  ["NAT", /extract|herb|plant|garlic|saffron|crocin|leaf|leaves|root|seed|fruit|flavon|phyto|polyphenol|date palm|ajwa|wound|hepatoprotect|natural|oxytocin/i],
  ["FOO", /food|juice|oil|starch|packaging|drying|soil|wheat/i],
];
const SKIP_TYPES = ["peer-review", "erratum", "retraction", "dataset", "preprint", "paratext", "editorial-comment", "supplementary-materials", "other"];
const SKIP_TITLE = ["supplementary", "appendix", "correction", "corrigendum", "erratum", "retracted", "retraction", "author response",
                    "reply to", "response to", "data from", "figure ", "table ", "supporting information"];

function norm_(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function skipTitle_(t) { const s = String(t || "").trim().toLowerCase(); return SKIP_TITLE.some((p) => s.indexOf(p) === 0) || s.indexOf("supplementary appendix") >= 0; }
function guessTheme_(t) { for (const r of THEME_RULES) if (r[1].test(t || "")) return r[0]; return "PHP"; }

function themeTabs_(pubs) {
  const rows = pubs.getSheetByName("Themes").getDataRange().getValues();
  const head = rows[0], C = head.indexOf("Code"), T = head.indexOf("Tab");
  const map = {};
  rows.slice(1).forEach((r) => { if (r[C] && r[T]) map[r[C]] = r[T]; });
  return map;
}

function fetchOpenAlexNew_(authorId, since) {
  const url = "https://api.openalex.org/works?per-page=200&filter=author.id:" + authorId + ",from_publication_date:" + since +
              "&select=doi,title,publication_year,type,primary_location,authorships,biblio,cited_by_count";
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("OpenAlex HTTP " + res.getResponseCode());
  return JSON.parse(res.getContentText()).results || [];
}

function addNewPapers_(pubs, openalex, scholarArticles, since, today) {
  const tabs = themeTabs_(pubs);
  const haveDoi = {}, haveTitle = [];
  Object.keys(tabs).forEach((code) => {
    const sh = pubs.getSheetByName(tabs[code]); if (!sh) return;
    const rows = sh.getDataRange().getValues(); const head = rows[0];
    const T = head.indexOf("Title"), D = head.indexOf("DOI");
    rows.slice(1).forEach((r) => {
      if (r[T]) haveTitle.push(norm_(r[T]).slice(0, 50));
      if (D >= 0 && r[D]) haveDoi[String(r[D]).toLowerCase()] = true;
    });
  });
  const known = (title, doi) => {
    const k = norm_(title).slice(0, 50), k40 = k.slice(0, 40);
    return (doi && haveDoi[doi.toLowerCase()]) || haveTitle.some((t) => t && k40 && (t.indexOf(k40) >= 0 || k.indexOf(t.slice(0, 40)) >= 0));
  };

  const fresh = [];
  openalex.forEach((w) => {
    const title = String(w.title || "").trim();
    const doi = String(w.doi || "").replace("https://doi.org/", "");
    if (!title || SKIP_TYPES.indexOf(w.type) >= 0 || skipTitle_(title) || known(title, doi)) return;
    const b = w.biblio || {}, src = (w.primary_location && w.primary_location.source) || {};
    const authors = (w.authorships || []).filter((a) => a.author).map((a) => a.author.display_name);
    const pages = b.first_page && b.last_page && b.first_page !== b.last_page ? b.first_page + "-" + b.last_page : (b.first_page || "");
    fresh.push({ year: w.publication_year, title: title, authors: authors.slice(0, 10).join(", ") + (authors.length > 12 ? ", et al." : ""),
                 journal: src.display_name || "", volume: b.volume || "", issue: b.issue || "", pages: pages, doi: doi,
                 cites: w.cited_by_count || 0, source: "OpenAlex" });
    haveTitle.push(norm_(title).slice(0, 50)); if (doi) haveDoi[doi.toLowerCase()] = true;
  });
  const sinceYear = parseInt(since.slice(0, 4), 10);
  (scholarArticles || []).forEach((a) => {
    const title = String(a.title || "").trim(), year = parseInt(a.year, 10) || 0;
    if (!title || year < sinceYear || skipTitle_(title) || known(title) || /patent/i.test(a.publication || "")) return;
    fresh.push({ year: year, title: title, authors: a.authors || "", journal: a.publication || "", volume: "", issue: "", pages: "",
                 doi: "", cites: (a.cited_by && a.cited_by.value) || 0, source: "Google Scholar" });
    haveTitle.push(norm_(title).slice(0, 50));
  });

  const added = [];
  fresh.forEach((p) => {
    const tabName = tabs[guessTheme_(p.title)] || tabs[Object.keys(tabs)[0]];
    const sh = pubs.getSheetByName(tabName);
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const vals = { "Year": p.year, "Title": p.title, "Authors": p.authors, "Journal": p.journal, "Volume": String(p.volume),
      "Issue": String(p.issue), "Pages": String(p.pages), "DOI": p.doi, "DOI Link": p.doi ? "https://doi.org/" + p.doi : "",
      "DOI Status": p.doi ? "DOI" : "No DOI found", "Type": "Journal article", "Citations": p.cites,
      "Citation Source": p.source + " " + today, "Open Access": "", "Show on Site": "Yes", "Source": p.source,
      "Status": "Auto-added – check theme", "Notes": "Added automatically on " + today + ". Move the row to another theme tab if needed." };
    sh.appendRow(head.map((h) => (vals[h] !== undefined ? vals[h] : "")));
    sh.getRange(sh.getLastRow(), 1, 1, head.length).setBackground("#FFF2CC");
    added.push([tabName, p.title]);
  });
  return added;
}

function updatePaperCitations_(pubs, articles, today) {
  const scholar = {};
  (articles || []).forEach((a) => {
    const k = norm_(a.title).slice(0, 60), c = parseInt((a.cited_by && a.cited_by.value) || 0, 10);
    if (k.length >= 25) scholar[k] = Math.max(scholar[k] || 0, c);
  });
  const keys = Object.keys(scholar);
  if (!keys.length) return [0, 0];
  const tabs = themeTabs_(pubs);
  let hist = pubs.getSheetByName("Citation History");
  if (!hist) { hist = pubs.insertSheet("Citation History"); hist.appendRow(["Date", "Theme", "Title", "Citations"]); }
  const log = [];
  let matched = 0, total = 0;
  Object.keys(tabs).forEach((code) => {
    const sh = pubs.getSheetByName(tabs[code]); if (!sh) return;
    const range = sh.getDataRange(); const rows = range.getValues(); const head = rows[0];
    const T = head.indexOf("Title"), C = head.indexOf("Citations"), S = head.indexOf("Citation Source");
    let changed = false;
    for (let r = 1; r < rows.length; r++) {
      const title = rows[r][T]; if (!title) continue;
      total++;
      const k = norm_(title).slice(0, 60);
      let hit = scholar[k];
      if (hit === undefined) { const x = keys.find((x) => x.indexOf(k.slice(0, 40)) === 0 || k.indexOf(x.slice(0, 40)) === 0); if (x) hit = scholar[x]; }
      if (hit !== undefined) {
        rows[r][C] = hit; if (S >= 0) rows[r][S] = "Google Scholar " + today;
        log.push([today, tabs[code], title, hit]); matched++; changed = true;
      }
    }
    if (changed) {
      // write back only the Citations (and Citation Source) columns, so formulas elsewhere stay untouched
      sh.getRange(2, C + 1, rows.length - 1, 1).setValues(rows.slice(1).map((r) => [r[C]]));
      if (S >= 0) sh.getRange(2, S + 1, rows.length - 1, 1).setValues(rows.slice(1).map((r) => [r[S]]));
    }
  });
  if (log.length) hist.getRange(hist.getLastRow() + 1, 1, log.length, 4).setValues(log);
  return [matched, total];
}
