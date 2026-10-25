/* Renders every section from the sheet data. */
(function () {
  const cfg = window.SITE_CONFIG;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n).toLocaleString("en-US");

  const ICONS = {
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="M5 12h3l2-3 3 6 2-3h4"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19 14 10"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1Z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    accessibility: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8l7 1.5L19 8M12 9.5V14l-3 6M12 14l3 6"/>',
    droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
    virus: '<circle cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>',
    pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.2 8 5.6 8"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    dna: '<path d="M7 3c0 6 10 6 10 12s-10 3-10 6M17 3c0 6-10 6-10 12s10 3 10 6"/><path d="M8.5 7h7M8.5 17h7"/>',
    wheat: '<path d="M12 21V8"/><path d="M12 8c-2-1-3-3-3-5 2 0 3 1 3 3 0-2 1-3 3-3 0 2-1 4-3 5ZM12 13c-2.2-.4-4-2-4.5-4.2 2.2.1 3.8 1.5 4.5 3.2.7-1.7 2.3-3.1 4.5-3.2-.5 2.2-2.3 3.8-4.5 4.2ZM12 18c-2.2-.4-4-2-4.5-4.2 2.2.1 3.8 1.5 4.5 3.2.7-1.7 2.3-3.1 4.5-3.2-.5 2.2-2.3 3.8-4.5 4.2Z"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    arrow: '<path d="M7 17 17 7M9 7h8v8"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.flask}</svg>`;

  let DATA = null;
  let photoOk = false;
  const themeByCode = {};

  /* ---------- helpers ---------- */
  const about = (field) => (DATA.P.About.find((r) => r.Field === field) || {}).Value || "";
  const highlight = (authors) => esc(authors).replace(cfg.highlightAuthor, "<b>$1</b>");
  const years = (a, b) => [a, b].filter(Boolean).join(" – ") || "";
  function pubLink(p) {
    return p.doi ? `https://doi.org/${p.doi}` : `https://scholar.google.com/scholar?q=${encodeURIComponent('"' + p.title + '"')}`;
  }
  function venue(p) {
    let v = p.journal ? `<i>${esc(p.journal)}</i>` : "";
    const vi = [p.volume, p.issue ? `(${esc(p.issue)})` : ""].join("");
    if (vi) v += `, ${esc(p.volume)}${p.issue ? `(${esc(p.issue)})` : ""}`;
    if (p.pages) v += `: ${esc(p.pages)}`;
    return v;
  }
  function shortAuthors(a) {
    const parts = a.split(/,\s*/);
    if (parts.length <= 8) return a;
    const idx = parts.findIndex((x) => /asdaq/i.test(x));
    const head = parts.slice(0, 6);
    if (idx >= 6) head.push("…", parts[idx]);
    return head.join(", ") + (/et al/i.test(a) ? "" : ", et al.");
  }
  function pubItem(p, showTheme) {
    const t = themeByCode[p.theme];
    return `<li class="pub">
      <div class="pub-year">${p.year || ""}</div>
      <div style="min-width:0">
        <a class="pub-title" href="${pubLink(p)}" target="_blank" rel="noopener">${esc(p.title)}</a>
        ${p.authors ? `<div class="pub-authors">${highlight(shortAuthors(p.authors))}</div>` : ""}
        <div class="pub-venue">${venue(p)}</div>
        <div class="pub-meta">
          ${p.doi ? `<a class="doi" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>` : `<a class="doi none" href="${pubLink(p)}" target="_blank" rel="noopener">No DOI · find on Scholar</a>`}
          ${p.cites ? `<span class="cites">${fmt(p.cites)} citations</span>` : ""}
          ${p.type && p.type !== "Journal article" ? `<span class="pub-tag">${esc(p.type)}</span>` : ""}
          ${showTheme && t ? `<span class="pub-tag">${esc(t.Tab)}</span>` : ""}
        </div>
      </div>
    </li>`;
  }

  /* ---------- hero, about ---------- */
  const boldLead = (t) => { const m = String(t).match(/^([^:]{3,80}):\s+([\s\S]*)$/); return m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(t); };
  function renderHero() {
    const name = about("Name");
    if (name) $("#hero-name").innerHTML = `<span class="honorific">Professor</span>${esc(name.replace(/^Prof\.?\s*/i, ""))}`;
    const photo = about("Photo");
    if (photo) {
      const img = new Image();
      img.alt = name || "Portrait";
      img.onload = () => { photoOk = true; $("#portrait").innerHTML = ""; $("#portrait").appendChild(img); };
      img.src = photo;
    }
    const roles = DATA.P["Current Roles"].slice(0, 2);
    if (roles.length) $("#hero-roles").innerHTML = roles.map((r) => `<div><strong>${esc(r.Role)}</strong>, ${esc(r.Organisation)}</div>`).join("");
    const imp = DATA.P["Impact at a Glance"];
    const tiles = imp.filter((r) => r.Value !== "*");
    const foot = imp.find((r) => r.Value === "*");
    const strip = $("#metric-strip");
    strip.classList.toggle("six", tiles.length > 4);
    // Google Scholar figures come from the Metrics tab (one place to update; the Scholar script writes there too)
    const gs = (k) => DATA.P.Metrics.find((m) => m.Source === "Google Scholar" && m.Metric === k && m.Value !== "");
    const gsCit = gs("Citations"), gsH = gs("h-index");
    const valueFor = (r) => {
      if (/google scholar citations/i.test(r.Label) && gsCit) return fmt(gsCit.Value);
      if (/google scholar h-index/i.test(r.Label) && gsH) return gsH.Value;
      return r.Value;
    };
    strip.innerHTML = tiles.map((r) => `<div class="metric"><span class="metric-value">${esc(valueFor(r))}</span><span class="metric-label">${esc(r.Label)}</span></div>`).join("");
    const asOf = gsCit && gsCit["As of"] ? `Citation and h-index values from Google Scholar as of ${gsCit["As of"]}.` : (foot ? foot.Label : "");
    strip.parentElement.querySelector(".metric-foot")?.remove();
    if (asOf) strip.insertAdjacentHTML("afterend", `<p class="metric-foot">*${esc(asOf)}</p>`);
  }

  function renderAbout() {
    $("#about-text").innerHTML = DATA.P["Executive Profile"].map((r) => `<p>${esc(r.Paragraph)}</p>`).join("");
    const edu = DATA.P.Education.find((e) => /ph\.?d/i.test(e.Degree));
    const positions = (about("Position") || DATA.P["Current Roles"][0]?.Role || "").split(/\s*;\s*/).filter(Boolean);
    const facts = [
      ["Institution", "AlMaarefa University, Riyadh"],
      ["Doctorate", edu ? edu.Text.replace(/\s*\(Awarded.*\)$/, "") : ""],
      ["Publications", `${fmt(DATA.pubs.length)} listed across ${DATA.themes.length} themes`],
    ].filter(([, v]) => v);
    $("#facts").innerHTML = (positions.length ? `<div class="fact"><dt>Position</dt><dd class="positions">${positions.map((p) => `<strong>${esc(p)}</strong>`).join("")}</dd></div>` : "") +
      facts.map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
  }

  /* ---------- education & experience ---------- */
  function renderEducation() {
    $("#edu-list").innerHTML = DATA.P.Education.map((e) => `<li class="tl-item">
      <div class="tl-years">${esc(e["Years Shown"] || e.Year) || "&nbsp;"}</div>
      <div class="tl-title">${esc(e.Degree)}</div>
      <div class="tl-sub">${esc(e.Text)}</div>
    </li>`).join("");
  }

  function renderExperience() {
    const cur = DATA.P["Current Roles"];
    $("#current-roles").innerHTML = cur.slice(0, 2).map((r) => `<article class="role-card">
      <div class="since"><span class="live-dot"></span>${r.Since ? `Since ${esc(r.Since)}` : "Current"}</div>
      <h3>${esc(r.Role)}</h3>
      <div class="org">${esc(r.Organisation)}</div>
      ${r.Details ? `<p>${esc(r.Details)}</p>` : ""}
    </article>`).join("");
    $("#other-roles").innerHTML = cur.slice(2).map((r) => `<span class="chip teal">${esc(r.Role)}${r.Since ? ` · since ${esc(r.Since)}` : ""}</span>`).join("");

    // group by organisation, keeping newest-first order
    const groups = [];
    DATA.P.Experience.forEach((x) => {
      let g = groups.find((g) => g.org === x.Organisation);
      if (!g) { g = { org: x.Organisation, loc: x.Location, rows: [] }; groups.push(g); }
      g.rows.push(x);
    });
    $("#exp-groups").innerHTML = groups.map((g) => {
      const ys = g.rows.flatMap((r) => [r["Start Year"], r["End Year"]]).filter((y) => /^\d{4}$/.test(y)).map(Number);
      const present = g.rows.some((r) => /present/i.test(r["End Year"]) || /present/i.test(r.Period));
      const span = ys.length ? `${Math.min(...ys)} – ${present ? "Present" : Math.max(...ys)}` : "";
      return `<div class="org-group">
        <div><div class="org-name">${esc(g.org)}</div><div class="org-loc">${esc(g.loc)}</div><div class="tl-years" style="margin-top:6px">${span}</div></div>
        <ol class="ladder">${g.rows.map((r) => {
          const det = (r["Details (one per line)"] || "").split(/\n+/).filter(Boolean);
          return `<li class="rung"><span class="tl-years">${esc(r.Period) || "&nbsp;"}</span><div><div class="rung-title">${esc(r.Role)}</div>${det.length ? `<div class="rung-detail"><ul>${det.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>` : ""}</div></li>`;
        }).join("")}</ol>
      </div>`;
    }).join("");
  }

  /* ---------- leadership ---------- */
  function renderLeadership() {
    $("#qa-list").innerHTML = DATA.P["Quality & Accreditation"].map((r) => `<li>${r.Heading ? `<span class="h">${esc(r.Heading)}</span>` : ""}<span class="t">${esc(r.Text)}</span></li>`).join("");
    $("#editorial").innerHTML = DATA.P["Editorial & Scholarly"].map((r) => `<li>${r.Year ? `<span class="when">${esc(r.Year)}</span>` : ""}<span class="detail">${esc(r.Text)}</span></li>`).join("");
    $("#res-lead").innerHTML = DATA.P["Research Leadership"].map((r) => `<li>${r.Heading ? `<span class="what"><b>${esc(r.Heading)}</b></span>` : ""}<span class="detail">${esc(r.Text)}</span></li>`).join("");
    $("#teaching").textContent = (DATA.P.Teaching[0] || {}).Text || "";
    $("#expertise").innerHTML = DATA.P["Research Themes"].map((r) => `<li>${esc(r.Text)}</li>`).join("");
  }

  /* ---------- research tiles + lightbox ---------- */
  function renderTiles() {
    $("#tiles").innerHTML = DATA.themes.map((t, i) => `<button class="tile" type="button" data-i="${i}" aria-label="Open ${esc(t["Display Name"])}">
      <span class="tile-icon">${icon(t.Icon)}</span>
      <span class="tile-open">${icon("arrow")}</span>
      <h3>${esc(t["Display Name"])}</h3>
      <p>${esc(t.Description)}</p>
      <span class="tile-meta"><span><b>${t.papers.length}</b> papers</span><span><b>${fmt(t.citeSum)}</b> citations</span></span>
    </button>`).join("");
    $("#tiles").addEventListener("click", (e) => {
      const b = e.target.closest(".tile"); if (b) openTheme(+b.dataset.i);
    });
  }

  const lb = $("#lightbox");
  let lbIndex = 0;
  function openTheme(i) {
    lbIndex = (i + DATA.themes.length) % DATA.themes.length;
    const t = DATA.themes[lbIndex];
    $("#lb-shell").innerHTML = `<div class="lb-panel" role="document">
      <div class="lb-head">
        <span class="tile-icon">${icon(t.Icon)}</span>
        <div><h3>${esc(t["Display Name"])}</h3><p>${esc(t.Description)}</p></div>
        <button class="icon-btn" type="button" data-act="close" aria-label="Close">${icon("close")}</button>
      </div>
      <div class="lb-tools">
        <label class="field" for="lb-search">${icon("search")}<input id="lb-search" type="search" placeholder="Search within this theme" autocomplete="off"></label>
        <span class="lb-count" id="lb-count"></span>
        <div class="lb-nav">
          <button class="icon-btn" type="button" data-act="prev" aria-label="Previous theme">${icon("prev")}</button>
          <button class="icon-btn" type="button" data-act="next" aria-label="Next theme">${icon("next")}</button>
        </div>
      </div>
      <div class="lb-list"><ul class="pubs" id="lb-pubs"></ul></div>
    </div>`;
    const draw = () => {
      const q = $("#lb-search").value.trim().toLowerCase();
      const list = t.papers.filter((p) => !q || `${p.title} ${p.journal} ${p.authors}`.toLowerCase().includes(q));
      $("#lb-pubs").innerHTML = list.map((p) => pubItem(p, false)).join("") || `<li class="empty">No papers match “${esc(q)}”.</li>`;
      $("#lb-count").textContent = `${list.length} of ${t.papers.length} papers`;
    };
    $("#lb-search").addEventListener("input", draw);
    draw();
    if (!lb.open) lb.showModal();
    document.body.style.overflow = "hidden";
  }
  function openPhoto() {
    const src = about("Photo");
    $("#lb-shell").innerHTML = `<div class="lb-photo">${src && photoOk ? `<img src="${esc(src)}" alt="${esc(about("Name"))}">` : `<div class="portrait" style="width:min(320px,80vw)"><span class="monogram">SA</span></div>`}<button class="icon-btn" type="button" data-act="close" aria-label="Close">${icon("close")}</button></div>`;
    lbIndex = -1;
    if (!lb.open) lb.showModal();
    document.body.style.overflow = "hidden";
  }
  function closeLb() { lb.close(); }
  lb.addEventListener("close", () => { document.body.style.overflow = ""; });
  lb.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") closeLb();
    else if (act === "prev") openTheme(lbIndex - 1);
    else if (act === "next") openTheme(lbIndex + 1);
    else if (e.target.id === "lb-shell") closeLb();
  });
  document.addEventListener("keydown", (e) => {
    if (!lb.open || lbIndex < 0 || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") openTheme(lbIndex + 1);
    if (e.key === "ArrowLeft") openTheme(lbIndex - 1);
  });
  $("#portrait").addEventListener("click", openPhoto);

  /* ---------- publications list ---------- */
  let shown = cfg.pageSize;
  function initPubFilters() {
    $("#pub-theme").insertAdjacentHTML("beforeend", DATA.themes.map((t) => `<option value="${esc(t.Code)}">${esc(t.Tab)}</option>`).join(""));
    const types = [...new Set(DATA.pubs.map((p) => p.type))].sort();
    $("#pub-type").insertAdjacentHTML("beforeend", types.map((t) => `<option>${esc(t)}</option>`).join(""));
    const ys = [...new Set(DATA.pubs.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a);
    $("#pub-year").insertAdjacentHTML("beforeend", ys.map((y) => `<option>${y}</option>`).join(""));
    ["pub-search", "pub-theme", "pub-type", "pub-year", "pub-sort"].forEach((id) => $("#" + id).addEventListener("input", () => { shown = cfg.pageSize; drawPubs(); }));
    $("#pub-more").addEventListener("click", () => { shown += cfg.pageSize; drawPubs(); });
  }
  function drawPubs() {
    const q = $("#pub-search").value.trim().toLowerCase();
    const th = $("#pub-theme").value, ty = $("#pub-type").value, yr = $("#pub-year").value, so = $("#pub-sort").value;
    let list = DATA.pubs.filter((p) => (!th || p.theme === th) && (!ty || p.type === ty) && (!yr || String(p.year) === yr) &&
      (!q || `${p.title} ${p.journal} ${p.authors}`.toLowerCase().includes(q)));
    list = list.slice().sort(so === "cites" ? (a, b) => b.cites - a.cites : (a, b) => (b.year ?? -1) - (a.year ?? -1) || a.title.localeCompare(b.title));
    const withDoi = list.filter((p) => p.doi).length;
    $("#pub-summary").textContent = `${fmt(list.length)} publications · ${fmt(withDoi)} with DOI`;
    $("#pub-list").innerHTML = list.slice(0, shown).map((p) => pubItem(p, true)).join("") || `<li class="empty">No publications match these filters.</li>`;
    $("#pub-more").hidden = list.length <= shown;
    $("#pub-more").textContent = `Show more (${fmt(list.length - shown)} remaining)`;
  }

  /* ---------- activities ---------- */
  function renderActivities() {
    $("#honours").innerHTML = DATA.P.Honours.map((h) => `<li>${h.Year ? `<span class="when">${esc(h.Year)}</span>` : ""}<span class="what" style="font-weight:400">${boldLead(h.Text)}</span></li>`).join("");
    $("#grants").innerHTML = DATA.P.Grants.map((g) => `<li>${g.Year ? `<span class="when">${esc(g.Year)}</span>` : ""}<span class="what">${esc(g.Funder)}</span><span class="role">${esc(g.Role)}</span><span class="detail">${esc(g.Details)}</span></li>`).join("");
    $("#patents").innerHTML = DATA.P.Patents.map((p) => `<div class="patent">
      <div class="row">${p.Year ? `<span class="chip">${esc(p.Year)}</span>` : ""}<span class="chip ${/grant/i.test(p.Status) ? "saffron" : "teal"}">${esc(p.Status)}</span><span class="chip">${esc(p.Type)} · ${esc(p.Country)}</span></div>
      <div class="what">${esc(p.Title)}</div>
      <div class="ref">Reference: ${esc(p.Reference)}</div>
      ${p.Link ? `<a href="${esc(p.Link)}" target="_blank" rel="noopener">View patent record →</a>` : ""}
    </div>`).join("");
  }

  /* ---------- analytics ---------- */
  const OPENALEX_AUTHOR = "A5028700323";
  function renderMetricSources(live) {
    const by = {};
    DATA.P.Metrics.forEach((m) => { (by[m.Source] ||= []).push({ ...m }); });
    if (live && by.OpenAlex) {
      const map = { "Works indexed": live.works_count, "Citations": live.cited_by_count, "h-index": live.summary_stats?.h_index, "i10-index": live.summary_stats?.i10_index };
      by.OpenAlex.forEach((m) => { if (map[m.Metric] != null) m.Value = map[m.Metric]; });
    }
    $("#metric-sources").innerHTML = Object.entries(by).map(([src, rows]) => {
      const isLive = live && src === "OpenAlex";
      return `<article class="src-card">
        <header><h3>${esc(src)}</h3>${isLive ? `<span class="live-badge"><span class="live-dot"></span>Live</span>` : (rows[0]["As of"] ? `<span class="asof">Updated ${esc(rows[0]["As of"])}</span>` : "")}</header>
        <div class="src-stats">${rows.map((r) => `<div class="src-stat"><div class="v">${r.Value !== "" ? fmt(r.Value) : "—"}</div><div class="l">${esc(r.Metric)}</div></div>`).join("")}</div>
        ${rows[0].Link ? `<a href="${esc(rows[0].Link)}" target="_blank" rel="noopener">Open profile →</a>` : ""}
      </article>`;
    }).join("");
  }
  async function fetchLiveMetrics() {
    try {
      // OpenAlex profile ID comes from the Link of the OpenAlex rows in the Metrics tab (e.g. https://openalex.org/A5028700323)
      const link = (DATA.P.Metrics.find((m) => m.Source === "OpenAlex" && m.Link) || {}).Link || "";
      const id = (link.match(/A\d{5,}/) || [OPENALEX_AUTHOR])[0];
      const r = await fetch(`https://api.openalex.org/authors/${id}?select=works_count,cited_by_count,summary_stats`);
      if (!r.ok) throw new Error(r.status);
      renderMetricSources(await r.json());
    } catch (e) { console.warn("Live OpenAlex metrics unavailable; showing sheet values.", e); }
  }

  const charts = [];
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function renderCharts() {
    if (!window.Chart) return;
    charts.forEach((c) => c.destroy()); charts.length = 0;
    const ink = css("--ink-soft"), line = css("--line"), teal = css("--teal"), saffron = css("--saffron");
    Chart.defaults.font.family = css("--font-body");
    Chart.defaults.color = ink;
    const grid = { color: line, drawTicks: false };
    const counts = {};
    DATA.pubs.forEach((p) => { if (p.year) counts[p.year] = (counts[p.year] || 0) + 1; });
    const ys = Object.keys(counts).map(Number);
    const labels = []; for (let y = Math.min(...ys); y <= Math.max(...ys); y++) labels.push(y);
    charts.push(new Chart($("#chart-years"), {
      type: "bar",
      data: { labels, datasets: [{ data: labels.map((y) => counts[y] || 0), backgroundColor: teal, hoverBackgroundColor: saffron, borderRadius: 3 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} papers` } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid, border: { display: false }, ticks: { precision: 0, padding: 6 } } } }
    }));
    const cy = (DATA.P["Citations by Year"] || []).filter((r) => /^\d{4}$/.test(r.Year) && r.Citations !== "").sort((a, b) => a.Year - b.Year);
    $("#scholar-year-card").hidden = !cy.length;
    if (cy.length) {
      $("#scholar-year-note").textContent = "";
      charts.push(new Chart($("#chart-scholar-years"), {
        type: "bar",
        data: { labels: cy.map((r) => r.Year), datasets: [{ data: cy.map((r) => +r.Citations), backgroundColor: saffron, hoverBackgroundColor: teal, borderRadius: 3 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmt(c.raw)} citations` } } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid, border: { display: false }, ticks: { padding: 6 } } } }
      }));
    }
    const T = DATA.themes.slice().sort((a, b) => b.papers.length - a.papers.length);
    const hbar = (el, vals, color, unit) => new Chart(el, {
      type: "bar",
      data: { labels: T.map((t) => t.Tab), datasets: [{ data: vals, backgroundColor: color, hoverBackgroundColor: saffron, borderRadius: 3 }] },
      options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmt(c.raw)} ${unit}` } } },
        onClick: (_e, els) => { if (els[0]) openTheme(DATA.themes.indexOf(T[els[0].index])); },
        scales: { x: { beginAtZero: true, grid, border: { display: false }, ticks: { padding: 6 } }, y: { grid: { display: false } } } }
    });
    charts.push(hbar($("#chart-themes"), T.map((t) => t.papers.length), teal, "papers"));
    charts.push(hbar($("#chart-cites"), T.map((t) => t.citeSum), saffron, "citations"));
  }

  /* ---------- contact ---------- */
  function renderContact() {
    const emails = DATA.P.Emails.length ? DATA.P.Emails : (about("Email") ? [{ Label: "Email", Email: about("Email") }] : []);
    $("#emails").innerHTML = emails.map((e, i) => `<div class="email-row"><span class="lbl">${esc(e.Label)}</span><span class="addr" id="email-${i}">${esc(e.Email)}</span><button class="btn btn-ghost" type="button" data-copy="${i}">Copy</button></div>`).join("");
    $("#emails").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-copy]"); if (!b) return;
      const el = $("#email-" + b.dataset.copy), text = el.textContent;
      try { navigator.clipboard.writeText(text).then(() => toast("Email copied"), () => { selectText(el); toast("Press Ctrl+C to copy"); }); }
      catch { selectText(el); toast("Press Ctrl+C to copy"); }
    });
    $("#location").textContent = about("Location");
    $("#langs").innerHTML = DATA.P.Languages.length ? `<span class="langs-label">Languages</span>` + DATA.P.Languages.map((l) => { const n = l["Note (shown in brackets, optional)"] || ""; return `<span class="chip">${esc(l.Language)}${n ? ` (${esc(n)})` : ""}</span>`; }).join("") : "";
    $("#refs").innerHTML = DATA.P.References.length ? `<h3 class="sub-h" style="font-size:1.2rem">References</h3><ul class="list">${DATA.P.References.map((r) => `<li><span class="what">${esc(r.Name)}</span><span class="detail">${esc(r.Position)}</span></li>`).join("")}</ul>` : "";
    $("#links").innerHTML = DATA.P.Links.map((l) => `<a class="link-card" href="${esc(l.URL)}" target="_blank" rel="noopener">${icon("link")}${esc(l.Label)}</a>`).join("");
  }
  function selectText(el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  let tt; function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }

  /* ---------- nav, theme ---------- */
  const nav = $("#nav");
  $("#menu-btn").addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    $("#menu-btn").setAttribute("aria-expanded", open);
  });
  $("#nav-links").addEventListener("click", (e) => { if (e.target.tagName === "A") { nav.classList.remove("open"); $("#menu-btn").setAttribute("aria-expanded", "false"); } });
  document.addEventListener("click", (e) => { if (nav.classList.contains("open") && !nav.contains(e.target)) nav.classList.remove("open"); });

  const sections = [...document.querySelectorAll("main section[id]")];
  const linkFor = (id) => document.querySelector(`.nav-links a[href="#${id}"]`);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { document.querySelectorAll(".nav-links a").forEach((a) => a.classList.remove("active")); linkFor(en.target.id)?.classList.add("active"); } });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));

  const root = document.documentElement;
  try { const saved = localStorage.getItem("theme"); if (saved) root.dataset.theme = saved; } catch {}
  $("#theme-btn").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch {}
    if (DATA) renderCharts();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (DATA) renderCharts(); });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- boot ---------- */
  SiteData.loadAll().then((d) => {
    DATA = d;
    d.themes.forEach((t) => { themeByCode[t.Code] = t; });
    renderHero(); renderAbout(); renderEducation(); renderExperience();
    renderLeadership(); renderTiles(); initPubFilters(); drawPubs(); renderActivities();
    renderMetricSources(); renderCharts(); renderContact(); fetchLiveMetrics();
  }).catch((err) => {
    console.error(err);
    const msg = `<p class="load-error">The site could not load its data. ${esc(err.message)} If you opened index.html directly from a folder, start a local server instead (see README). If you switched to Google Sheets, check the sheet IDs in js/config.js and that each sheet is shared as “Anyone with the link”.</p>`;
    $("#tiles").innerHTML = msg; $("#about-text").innerHTML = msg;
  });
})();
