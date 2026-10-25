/* Loads sheet tabs as arrays of row objects.
   source "excel"  -> reads data/Asdaq_Publications.xlsx and data/Asdaq_Profile.xlsx directly (edit in Excel, save, refresh)
   source "sheets" -> reads the Google Sheets versions (for the online site)
   source "csv"    -> reads data/csv/*.csv (optional) */
(function () {
  const cfg = window.SITE_CONFIG;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const clean = (rows) => rows
    .map((r) => { const o = {}; for (const k in r) o[String(k).trim()] = (r[k] ?? "").toString().trim(); return o; })
    .filter((r) => Object.values(r).some((v) => v !== ""));

  // ---- Excel mode: each workbook is downloaded once per page load ----
  const books = {};
  let xlsxLib;
  // The Excel reader (≈900 KB) is loaded only when the site reads Excel files, not in Google Sheets mode.
  function loadXlsxLib() {
    if (window.XLSX) return Promise.resolve();
    return xlsxLib ||= new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = "js/vendor/xlsx.full.min.js";
      s.onload = ok; s.onerror = () => fail(new Error("Could not load js/vendor/xlsx.full.min.js"));
      document.head.appendChild(s);
    });
  }
  function workbook(book) {
    const file = book === "pub" ? cfg.excel.publications : cfg.excel.profile;
    return books[book] ||= loadXlsxLib().then(() => fetch(`${file}?_=${Date.now()}`, { cache: "no-store" }))
      .then((r) => { if (!r.ok) throw new Error(`Could not open ${file} (HTTP ${r.status}).`); return r.arrayBuffer(); })
      .then((buf) => XLSX.read(buf, { type: "array" }));
  }
  async function loadExcelTab(book, tab) {
    const wb = await workbook(book);
    const ws = wb.Sheets[tab];
    if (!ws) throw new Error(`Tab "${tab}" not found in the Excel file.`);
    return clean(XLSX.utils.sheet_to_json(ws, { defval: "", raw: true }));
  }

  // ---- Google Sheets / CSV modes ----
  function urlFor(book, tab) {
    if (cfg.source === "sheets") {
      const id = book === "pub" ? cfg.sheets.publicationsId : cfg.sheets.profileId;
      return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}&_=${Date.now()}`;
    }
    return `data/csv/${book}-${slug(tab)}.csv`;
  }

  // Google Sheets returns the FIRST tab when a requested tab does not exist.
  // We read each book's first tab (README) once and treat an identical answer as "tab missing".
  const firstTab = {};
  async function sheetCsv(book, tab) {
    const res = await fetch(urlFor(book, tab), { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load "${tab}" (HTTP ${res.status}).`);
    return res.text();
  }
  async function loadTab(book, tab) {
    if (cfg.source === "excel") return loadExcelTab(book, tab);
    const text = await sheetCsv(book, tab);
    if (cfg.source === "sheets") {
      firstTab[book] ||= sheetCsv(book, "README").catch(() => "");
      const readme = await firstTab[book];
      const firstLine = (s) => s.split("\n", 1)[0].trim();
      if (readme && firstLine(text) === firstLine(readme)) return []; // tab not in this Sheet
    }
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
    return clean(parsed.data);
  }

  const isShown = (r) => !("Show" in r) || r.Show === "" || /^y/i.test(r.Show);
  const isPubShown = (r) => !("Show on Site" in r) || r["Show on Site"] === "" || /^y/i.test(r["Show on Site"]);
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const byOrder = (a, b) => (num(a.Order) ?? 999) - (num(b.Order) ?? 999);
  // Newest first; rows without a year go last, keeping their Order
  function byYear(col) {
    return (a, b) => {
      const ya = /present/i.test(a[col]) ? 9999 : num(a[col]), yb = /present/i.test(b[col]) ? 9999 : num(b[col]);
      if (ya === null && yb === null) return byOrder(a, b);
      if (ya === null) return 1;
      if (yb === null) return -1;
      return yb - ya || byOrder(a, b);
    };
  }
  const YEAR_COL = { "Experience": "Start Year", "Education": "Year", "Honours": "Year", "Editorial & Scholarly": "Year", "Grants": "Year", "Patents": "Year" };

  async function loadAll() {
    const profileTabs = ["About", "Executive Profile", "Impact at a Glance", "Quality & Accreditation", "Experience", "Current Roles", "Education",
      "Honours", "Editorial & Scholarly", "Research Themes", "Grants", "Patents", "Research Leadership", "Teaching", "Metrics", "Languages", "Links", "References", "Emails", "Citations by Year"];
    const [themesRaw, ...profile] = await Promise.all([
      loadTab("pub", "Themes"),
      ...profileTabs.map((t) => loadTab("profile", t).catch((e) => { console.warn(e); return []; }))
    ]);
    const P = {};
    profileTabs.forEach((t, i) => {
      const rows = t === "About" ? profile[i] : profile[i].filter(isShown);
      P[t] = rows.slice().sort(YEAR_COL[t] ? byYear(YEAR_COL[t]) : byOrder);
    });

    const themes = themesRaw.filter((t) => t.Code && t.Tab).sort(byOrder);
    const lists = await Promise.all(themes.map((t) => loadTab("pub", t.Tab).catch((e) => { console.warn(e); return []; })));
    const pubs = [];
    themes.forEach((t, i) => {
      t.papers = lists[i].filter((r) => r.Title && isPubShown(r)).map((r) => ({
        year: parseInt(r.Year, 10) || null,
        title: r.Title,
        authors: r.Authors || "",
        journal: r.Journal || "",
        volume: r.Volume || "", issue: r.Issue || "", pages: r.Pages || "",
        doi: (r.DOI || "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""),
        type: r.Type || "Journal article",
        cites: parseInt(r.Citations, 10) || 0,
        theme: t.Code
      }));
      // newest first; papers without a year go last
      t.papers.sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || a.title.localeCompare(b.title));
      t.citeSum = t.papers.reduce((s, p) => s + p.cites, 0);
      pubs.push(...t.papers);
    });
    return { themes, pubs, P };
  }

  window.SiteData = { loadAll };
})();
