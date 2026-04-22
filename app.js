/* ─── Global state ───────────────────────────────────── */
let parsedData = [];
let columns    = [];
let colMap     = {};
const chartInstances = {};
let renderBtnBound = false;

/* ─── Chart.js defaults ──────────────────────────────── */
Chart.defaults.color        = '#5a5a78';
Chart.defaults.borderColor  = '#222235';
Chart.defaults.font.family  = "'Poppins', sans-serif";
Chart.defaults.font.size    = 11;
Chart.defaults.plugins.legend.display = false;

const PALETTE = ['#c8ff00','#ff5f5f','#5f9fff','#ffac5f','#b05fff','#5fffd4','#ffda5f','#ff5fd4','#5fffa0','#ff9a5f'];

/* ─── Field definitions ──────────────────────────────── */
const FIELDS = [
{ key:'alter',                label:'🎂 Alter',                        hints:['alter','age','jahrgang','wie alt'] },
{ key:'geschlecht',           label:'👤 Geschlecht',                    hints:['geschlecht','gender','sex','fühlst du dich zugehörig','fuehlst du dich zugehörig'] },
{ key:'familienstand',        label:'💍 Familienstand',                 hints:['familienstand','beziehungsstatus','wie ist dein familienstand'] },
{ key:'beschaeftigung',       label:'🏢 Beschäftigungsstatus',          hints:['beschäftigungsstatus','beschaeftigungsstatus','employment','wie ist dein beschäftigungsstatus','wie ist dein beschaeftigungsstatus'] },
{ key:'nebenjob',             label:'💶 Nebenjob / Nebenverdienst',      hints:['nebenjob','nebenverdienst','zusatzjob','hast du aktuell einen nebenjob'] },
{ key:'medien',               label:'📱 Genutzte Medien',               hints:['welche medien nutzt du regelmäßig','medien nutzt du regelmäßig','welche medien nutzt du','medium','plattform','platform'] },
{ key:'stunden',              label:'⏱ Stunden täglich',               hints:['wie viel zeit verbringst du täglich','täglich mit den von dir','stunden','stunde','hours','h_tag'] },
{ key:'stunden_woche',        label:'🗓 Stunden wöchentlich',           hints:['wie viel zeit verbringst du wöchentlich','wöchentlich mit den von dir','woechentlich','woche'] },
{ key:'tageszeit',            label:'🕐 Wann genutzt',                  hints:['wann nutzt du','tageszeit','uhrzeit','wann','when'] },
{ key:'ort',                  label:'📍 Wo genutzt',                    hints:['wo nutzt du','ort','wo','where','location','platz'] },
{ key:'zweck',                label:'🎯 Nutzungszweck',                 hints:['wozu nutzt du','zweck','wozu','warum','grund','purpose','hauptsächlich'] },
{ key:'aktuell',              label:'📰 Aktuell informieren via',       hints:['tagesaktuell zu informieren','aktuell','tagesaktuell','nachrichten','informier','news'] },
{ key:'politisch',            label:'🏛 Politisch informieren via',      hints:['politisch zu informieren','politisch','politik'] },
{ key:'beziehung',            label:'💛 Beziehungsstatus',              hints:['beziehung','partner','relationship'] },
{ key:'abhaengig',            label:'🔄 Abhängig / Doomscrolling',      hints:['würdest du behaupten','abhängig','abhaengig','doomscroll','sucht','addict'] },
{ key:'beruflich',            label:'💼 Beruflich genutzt',             hints:['nutzt du medien beruflich','beruflich','beruf'] },
{ key:'ki',                   label:'🤖 KI-Inhalte konsumiert',         hints:['ki-generierte','konsumierst du ki','ki','ai','künstlich','generie','artificial'] },
{ key:'hobby',                label:'🎮 Hobby beeinflusst Konsum',      hints:['beeinflusst dein hobby','hobby','freizeit','leisure'] },
{ key:'kommunikation_leidet', label:'🗣 Kommunikation leidet',          hints:['direkte kommunikation','kommunikation','mitmenschen','leidet'] },
{ key:'interessen',           label:'🌱 Interessen/Hobbys',             hints:['welche interessen','interessen','hobbys'] },
{ key:'inhalte',              label:'🧩 Überwiegend konsumierte Inhalte',hints:['inhalte konsumierst du','inhalte','überwiegend','content'] },
{ key:'negativ',              label:'⚠ Negative Erfahrungen',           hints:['negative erfahrungen','schon negative','fake news','fomo','hate','cybermobbing'] },
{ key:'bezahlt',              label:'💳 Bezahlt für Medien',            hints:['bezahlst du','bezahlt','pay','abo','subscription'] },
{ key:'ueberschritt',         label:'📊 Medienzeit überschritten',      hints:['um wie viel überschreitest','überschritt','ueberschritt','limit','mehr_als'] },
{ key:'gefuehl',              label:'🧠 Gefühl nach Scrollen',          hints:['wie fühlst du dich nach','wie fuehlst du dich nach','nach dem scrollen','gefühl'] },
{ key:'vertrauen',            label:'✅ Medienvertrauen',               hints:['welchen medien vertraust','vertrauen'] },
{ key:'reduziert',            label:'📉 Versucht zu reduzieren',        hints:['versucht zu reduzieren','reduziert','reduz','weniger','cut'] },
];

/* ─── CSV broken-header fix ─────────────────────────── */
function fixBrokenHeader(text) {
  const lines = text.split('\n');
  const out   = [];

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const trimmed = line.trim();

    const isDataRow = /^"20\d\d\//.test(trimmed) || /^\d{4}\//.test(trimmed);
    const headerDone = out.some(l => /^"20\d\d\//.test(l.trim()) || /^\d{4}\//.test(l.trim()));

    if (!headerDone && out.length > 0 && !isDataRow && trimmed.length > 0) {
      out[out.length - 1] = out[out.length - 1].replace(/\r?$/, '') + ' ' + trimmed;
    } else {
      out.push(line);
    }
  }

  return out.join('\n');
}

function setImportProgress(percent, label = '') {
  const progress = document.getElementById('import-progress');
  const fill = document.getElementById('import-progress-fill');
  const labelEl = document.getElementById('import-progress-label');
  if (!progress || !fill || !labelEl) return;
  progress.classList.remove('hidden');
  fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (label) labelEl.textContent = label;
}

function hideImportProgress() {
  const progress = document.getElementById('import-progress');
  if (!progress) return;
  setTimeout(() => progress.classList.add('hidden'), 450);
}

/* ─── Parse helper shared by upload + drop ──────────── */
function parseCSVFile(file) {
  const reader = new FileReader();
  setImportProgress(5, 'Datei wird gelesen …');
  reader.onprogress = function (evt) {
    if (!evt.lengthComputable) return;
    const readRatio = evt.loaded / evt.total;
    setImportProgress(5 + (readRatio * 70), `Datei wird gelesen … ${Math.round(readRatio * 100)}%`);
  };
  reader.onload = function (evt) {
    const fixed  = fixBrokenHeader(evt.target.result);
    setImportProgress(82, 'CSV wird verarbeitet …');
    const result = Papa.parse(fixed, { header: true, skipEmptyLines: true });
    if (result.errors?.length) {
      console.warn('CSV parse warnings:', result.errors);
    }
    parsedData   = result.data;
    columns      = result.meta.fields || [];
    setImportProgress(100, `Import abgeschlossen (${parsedData.length} Zeilen)`);
    hideImportProgress();
    buildMapper();
  };
  reader.onerror = function () {
    setImportProgress(100, 'Import fehlgeschlagen. Bitte Datei prüfen.');
  };
  reader.readAsText(file);
}

/* ─── Auto-mapping ───────────────────────────────────── */
function autoMap(col) {
  const lower = col.toLowerCase();
  const stripped = lower.replace(/[^a-zäöüß0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  for (const f of FIELDS) {
    for (const h of f.hints) {
      const hNorm = h.toLowerCase().replace(/[^a-zäöüß0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (stripped.includes(hNorm)) return f.key;
    }
  }
  return '';
}

/* ─── Sample data ────────────────────────────────────── */
const SAMPLE_ROWS = [
['Alter','Geschlecht','Medien','Stunden_täglich','Tageszeit','Ort','Zweck','Aktuell','Beziehung','Abhängig','Beruflich','KI_Inhalte','Hobby','Bezahlt','Überschritten','Reduziert'],
['22','weiblich','Instagram; TikTok','3','morgens; abends','zu Hause; in Bus&Bahn','Unterhaltung; Inspiration','Instagram','Single','ja','nein','ja','Ja','Nein','2-4 std','ja'],
['34','männlich','YouTube; Podcasts; Zeitung','2','vormittags; abends','zu Hause; Arbeit/Hochschule','Bildung; Nachrichten','Zeitung','Vergeben','nein','ja','nein','Nein','Ja','1-2 std','nein'],
['19','weiblich','TikTok; Instagram; YouTube','5','morgens; mittags; abends','zu Hause; in Bus&Bahn','Unterhaltung; Musik','TikTok','Single','ja','nein','ja','Ja','Nein','4-6 std','nein'],
['27','divers','Twitter; YouTube; Podcasts','3','vormittags; abends','Arbeit/Hochschule; zu Hause','Nachrichten; Bildung','Twitter','Es ist kompliziert','ja','ja','ja','Nein','Nein','2-4 std','ja'],
['45','männlich','Zeitung; TV; Radio','2','morgens; abends','zu Hause; am Schreibtisch','Nachrichten; Unterhaltung','Zeitung; TV','Vergeben','nein','nein','nein','Nein','Ja','0-1 std','nein'],
['23','weiblich','Instagram; Pinterest','4','morgens; abends','zu Hause; in Bus&Bahn','Inspiration; Unterhaltung','Instagram','Single','ja','nein','ja','Ja','Nein','2-4 std','ja'],
['31','männlich','LinkedIn; YouTube; Podcasts','2','vormittags; abends','Arbeit/Hochschule','Bildung; Beruf','LinkedIn','Vergeben','nein','ja','nein','Nein','Ja','1-2 std','nein'],
['20','weiblich','TikTok; YouTube','6','durchgängig','zu Hause; auf der Couch','Unterhaltung; Musik','TikTok','Single','ja','nein','ja','Ja','Nein','mehr als 6 std','nein'],
['38','männlich','Zeitung; Podcasts; Radio','1','morgens','am Schreibtisch','Nachrichten','Zeitung','Vergeben','nein','ja','nein','Nein','Ja','0-1 std','ja'],
['25','weiblich','Instagram; YouTube; Netflix','4','abends','zu Hause; auf der Couch','Unterhaltung; Entspannung','Instagram','Single','ja','nein','ja','Ja','Nein','4-6 std','ja'],
['29','männlich','Twitter; YouTube','3','abends','zu Hause','Unterhaltung; Nachrichten','Twitter','Es ist kompliziert','nein','ja','ja','Nein','Nein','2-4 std','nein'],
['18','weiblich','TikTok; Instagram','7','morgens; mittags; abends; durchgängig','in Bus&Bahn; zu Hause','Unterhaltung; Musik','TikTok','Single','ja','nein','ja','Ja','Nein','mehr als 6 std','nein'],
['52','männlich','TV; Zeitung','2','abends; morgens','zu Hause','Nachrichten; Unterhaltung','TV','Vergeben','nein','nein','nein','Nein','Ja','0-1 std','nein'],
['24','divers','Instagram; TikTok; Podcasts','4','abends; morgens','zu Hause; in Bus&Bahn','Unterhaltung; Bildung','Instagram','Single','ja','nein','ja','Ja','Nein','2-4 std','ja'],
['36','weiblich','YouTube; Podcasts','2','vormittags','Arbeit/Hochschule; zu Hause','Bildung; Inspiration','YouTube','Vergeben','nein','ja','nein','Nein','Nein','1-2 std','ja'],
['21','männlich','TikTok; Twitch; YouTube','5','abends; nachts','zu Hause; auf der Couch','Unterhaltung; Gaming','YouTube','Single','ja','nein','ja','Nein','Nein','4-6 std','nein'],
['33','weiblich','Instagram; Pinterest; Netflix','3','abends','zu Hause','Inspiration; Unterhaltung','Instagram','Vergeben','ja','nein','nein','Ja','Nein','2-4 std','ja'],
['40','männlich','LinkedIn; Zeitung; Podcasts','2','morgens; vormittags','am Schreibtisch; Arbeit/Hochschule','Beruf; Nachrichten; Bildung','Zeitung; LinkedIn','Vergeben','nein','ja','nein','Nein','Ja','0-1 std','nein'],
['26','weiblich','Instagram; TikTok; Spotify','4','morgens; abends','in Bus&Bahn; zu Hause','Musik; Unterhaltung; Inspiration','Instagram','Single','ja','nein','ja','Nein','Nein','2-4 std','ja'],
['30','divers','YouTube; Twitter; Podcasts','3','vormittags; abends','Arbeit/Hochschule','Bildung; Nachrichten','Twitter; YouTube','Es ist kompliziert','nein','ja','ja','Nein','Nein','1-2 std','ja'],
];

function loadSampleData() {
  const headers = SAMPLE_ROWS[0];
  parsedData = SAMPLE_ROWS.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] ?? '');
    return obj;
  });
  columns = headers;
  buildMapper();
}

/* ─── CSV upload ─────────────────────────────────────── */
document.getElementById('csv-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  parseCSVFile(file);
});

document.getElementById('demo-btn').addEventListener('click', function (e) {
  e.stopPropagation();
  loadSampleData();
});

// Drag & drop
const uploadZone = document.getElementById('upload-zone');
uploadZone.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', ()  => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  parseCSVFile(file);
});

/* ─── Build mapper UI ────────────────────────────────── */
function buildMapper() {
  colMap = {};
  document.getElementById('upload-section').classList.add('hidden');
  document.getElementById('mapper-section').classList.remove('hidden');

  const grid = document.getElementById('mapper-grid');
  grid.innerHTML = '';

  FIELDS.forEach(f => {
    const match = columns.find(c => autoMap(c) === f.key) || '';
    colMap[f.key] = match;
  });

  FIELDS.forEach(f => {
    const auto = colMap[f.key];
    const row  = document.createElement('div');
    row.className = 'mapper-row';
    row.innerHTML = `<label>${f.label}</label>
      <select data-field="${f.key}">
        <option value="">— nicht zugeordnet —</option>
        ${columns.map(c => `<option value="${c}"${c === auto ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
      ${auto ? `<span class="auto-tag">✓ Auto-erkannt</span>` : ''}`;
    row.querySelector('select').addEventListener('change', function () {
      colMap[this.dataset.field] = this.value;
    });
    grid.appendChild(row);
  });

  document.getElementById('stat-total').textContent = parsedData.length;
  document.getElementById('stat-cols').textContent  = columns.length;

  if (!renderBtnBound) {
    document.getElementById('render-btn').addEventListener('click', renderDashboard);
    renderBtnBound = true;
  }
}

/* ─── Helpers ────────────────────────────────────────── */
function getCol(key) { return colMap[key] || ''; }
function fieldLabel(key) {
  const field = FIELDS.find(f => f.key === key);
  return field ? field.label.replace(/^[^\s]+\s/, '') : key;
}

function getCellValue(row, key) {
  const col = getCol(key);
  if (!col) return '';
  return (row[col] || '').toString().trim();
}

/**
 * Split multi-value cells.
 * Only ; | and newline are treated as separators.
 * Slashes and commas are NOT separators — they appear inside answer texts
 * like "Laptop / Desktop-PC" or "z.B. Spiegel, Zeit, FAZ".
 */
function splitMultiValue(val) {
  const raw = (val || '').toString().trim();
  if (!raw) return [];
  return raw
    .split(/\s*(?:;|\||\n)\s*/g)
    .map(v => v.trim())
    .filter(Boolean);
}

function parseNumeric(raw) {
  if (!raw) return null;
  const normalized = raw.toString().replace(',', '.');
  const matches = normalized.match(/\d+(?:\.\d+)?/g);
  if (!matches || !matches.length) return null;
  const nums = matches.map(Number).filter(n => !isNaN(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Collect values for a column (splits multi-value cells by ;) */
function getValues(key, multi = false) {
  const col = getCol(key);
  if (!col) return [];
  return parsedData.flatMap(row => {
    const val = (row[col] || '').trim();
    if (!val) return [];
    return multi ? splitMultiValue(val) : [val];
  });
}

/** Count occurrences */
function countMap(values) {
  const map = {};
  values.forEach(v => { map[v] = (map[v] || 0) + 1; });
  return map;
}

/** Sort count map descending, return {labels, counts} */
function sortedCounts(values, limit = 20) {
  const map = countMap(values);
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit);
  return { labels: entries.map(e => e[0]), counts: entries.map(e => e[1]) };
}

/** Create a chart card DOM element */
function makeCard(spanClass, labelText, titleText) {
  const card = document.createElement('div');
  card.className = `chart-card ${spanClass}`;
  card.innerHTML = `<div class="card-label">${labelText}</div>
    <div class="card-title">${titleText}</div>
    <div class="chart-wrap"><canvas></canvas></div>`;
  return card;
}

/** Destroy old chart if any */
function newChart(canvas, type, data, options = {}) {
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  return new Chart(canvas, { type, data, options });
}

/* ─── Chart factory functions ────────────────────────── */

function chartDonut(canvas, labels, counts) {
  const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
  return newChart(canvas, 'doughnut', {
    labels,
    datasets: [{ data: counts, backgroundColor: colors, borderWidth: 2, borderColor: '#0c0c18', hoverOffset: 6 }],
  }, {
    cutout: '65%',
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: { color: '#5a5a78', boxWidth: 10, padding: 12, font: { size: 10 } },
      },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } },
    },
  });
}

function chartBar(canvas, labels, counts, color = '#c8ff00', horizontal = false) {
  return newChart(canvas, 'bar', {
    labels,
    datasets: [{
      data: counts,
      backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
      borderColor:     labels.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 1,
      borderRadius: 4,
    }],
  }, {
    indexAxis: horizontal ? 'y' : 'x',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}` } } },
    scales: {
      x: { grid: { color: '#222235' }, ticks: { color: '#5a5a78', maxRotation: 30 } },
      y: { grid: { color: '#222235' }, ticks: { color: '#5a5a78' }, beginAtZero: true },
    },
  });
}

function chartLine(canvas, labels, counts) {
  return newChart(canvas, 'line', {
    labels,
    datasets: [{
      data: counts,
      borderColor: '#c8ff00',
      backgroundColor: 'rgba(200,255,0,.08)',
      pointBackgroundColor: '#c8ff00',
      pointRadius: 4,
      tension: 0.4,
      fill: true,
    }],
  }, {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#222235' }, ticks: { color: '#5a5a78' } },
      y: { grid: { color: '#222235' }, ticks: { color: '#5a5a78' }, beginAtZero: true },
    },
  });
}

/* ─── Render dashboard ───────────────────────────────── */
function renderDashboard() {
  document.getElementById('mapper-section').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  renderKPIs();
  renderDemoCharts();
  renderMediaCharts();
  renderContextCharts();
  initRelationExplorer();
  renderInterestingRelations();
  renderRawTable();
}

/* ── KPIs ── */
function renderKPIs() {
  const kpiRow = document.getElementById('kpi-row');
  kpiRow.innerHTML = '';

  const n = parsedData.length;

  const alterCol = getCol('alter');
  let avgAge = '—';
  if (alterCol) {
    const ages = parsedData.map(r => parseFloat(r[alterCol])).filter(v => !isNaN(v));
    if (ages.length) avgAge = Math.round(ages.reduce((a,b) => a+b,0) / ages.length);
  }

  const stCol = getCol('stunden');
  let avgH = '—';
  if (stCol) {
    const hrs = parsedData.map(r => parseFloat(r[stCol])).filter(v => !isNaN(v));
    if (hrs.length) avgH = (hrs.reduce((a,b) => a+b,0) / hrs.length).toFixed(1);
  }

  const abCol = getCol('abhaengig');
  let pctAbh = '—';
  if (abCol) {
    const vals = parsedData.map(r => (r[abCol]||'').toLowerCase());
    const ja   = vals.filter(v => v.startsWith('j')).length;
    pctAbh = Math.round(ja / n * 100) + '%';
  }

  const bezCol = getCol('bezahlt');
  let pctBez = '—';
  if (bezCol) {
    const vals = parsedData.map(r => (r[bezCol]||'').toLowerCase());
    const ja   = vals.filter(v => v.startsWith('j')).length;
    pctBez = Math.round(ja / n * 100) + '%';
  }

  const kpis = [
    { value: n,      label: 'Teilnehmer' },
    { value: avgAge, label: 'Ø Alter' },
    { value: avgH,   label: 'Ø Std. tägl.' },
    { value: pctAbh, label: 'Fühlen sich abhängig' },
    { value: pctBez, label: 'Zahlen für Medien' },
  ];

  kpis.forEach(k => {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.innerHTML = `<div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div>`;
    kpiRow.appendChild(card);
  });
}

/* ── Demografics ── */
function renderDemoCharts() {
  const container = document.getElementById('demo-charts');
  container.innerHTML = '';

  addChart(container, 'span-4', 'Demografie', 'Geschlecht', () => {
    const { labels, counts } = sortedCounts(getValues('geschlecht'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-8', 'Demografie', 'Altersverteilung', () => {
    const alterCol = getCol('alter');
    if (!alterCol) return false;
    const rawVals = parsedData.map(r => (r[alterCol] || '').trim()).filter(Boolean);
    if (!rawVals.length) return false;

    const numericAges = rawVals.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (numericAges.length > rawVals.length * 0.5) {
      const buckets = {'<20':0,'20-25':0,'26-30':0,'31-40':0,'41-50':0,'50+':0};
      numericAges.forEach(a => {
        if      (a < 20) buckets['<20']++;
        else if (a <= 25) buckets['20-25']++;
        else if (a <= 30) buckets['26-30']++;
        else if (a <= 40) buckets['31-40']++;
        else if (a <= 50) buckets['41-50']++;
        else              buckets['50+']++;
      });
      const labels = Object.keys(buckets);
      const counts = Object.values(buckets);
      return canvas => chartBar(canvas, labels, counts);
    } else {
      const { labels, counts } = sortedCounts(rawVals);
      const sorted = labels
        .map((l, i) => ({ l, c: counts[i], n: parseInt(l) || 999 }))
        .sort((a, b) => a.n - b.n);
      return canvas => chartBar(canvas, sorted.map(e => e.l), sorted.map(e => e.c));
    }
  });

  addChart(container, 'span-4', 'Persönlich', 'Familienstand', () => {
    const { labels, counts } = sortedCounts(getValues('familienstand'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Kontext', 'Berufliche Nutzung', () => {
    const { labels, counts } = sortedCounts(getValues('beruflich'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Finanzen', 'Bezahlt für Medien', () => {
    const { labels, counts } = sortedCounts(getValues('bezahlt'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Status', 'Beschäftigungsstatus', () => {
    const { labels, counts } = sortedCounts(getValues('beschaeftigung'));
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts, '#ffda5f', true);
  });
}

/* ── Media behavior ── */
function renderMediaCharts() {
  const container = document.getElementById('media-charts');
  container.innerHTML = '';

  addChart(container, 'span-8', 'Reichweite', 'Meist genutzte Medien', () => {
    const { labels, counts } = sortedCounts(getValues('medien', true), 12);
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts, '#c8ff00', true);
  });

  addChart(container, 'span-4', 'Zeitaufwand', 'Stunden täglich', () => {
    const stCol = getCol('stunden');
    if (!stCol) return false;
    const vals = parsedData.map(r => parseFloat(r[stCol])).filter(v => !isNaN(v));
    if (!vals.length) return false;
    const map = {};
    vals.forEach(v => { const k = `${Math.floor(v)}h`; map[k] = (map[k]||0)+1; });
    const sorted = Object.entries(map).sort((a,b) => parseFloat(a[0])-parseFloat(b[0]));
    return canvas => chartBar(canvas, sorted.map(e=>e[0]), sorted.map(e=>e[1]));
  });

  addChart(container, 'span-6', 'Motivation', 'Nutzungszweck', () => {
    const { labels, counts } = sortedCounts(getValues('zweck', true), 10);
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts, '#5f9fff', true);
  });

  addChart(container, 'span-6', 'Nachrichten', 'Tagesaktuell informieren via', () => {
    const { labels, counts } = sortedCounts(getValues('aktuell', true), 10);
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts, '#ffac5f', true);
  });

  addChart(container, 'span-6', 'Politik', 'Politische Informationsquellen', () => {
    const { labels, counts } = sortedCounts(getValues('politisch', true), 10);
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts, '#ff5f5f', true);
  });
}

/* ── Context & habits ── */
function renderContextCharts() {
  const container = document.getElementById('context-charts');
  container.innerHTML = '';

  addChart(container, 'span-6', 'Rhythmus', 'Wann werden Medien genutzt?', () => {
    const { labels, counts } = sortedCounts(getValues('tageszeit', true));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-6', 'Location', 'Wo werden Medien genutzt?', () => {
    const { labels, counts } = sortedCounts(getValues('ort', true));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Verhalten', 'Abhängig / Doomscrolling', () => {
    const { labels, counts } = sortedCounts(getValues('abhaengig'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Konsum', 'KI-Inhalte bewusst konsumiert', () => {
    const { labels, counts } = sortedCounts(getValues('ki'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Selbstwahrnehmung', 'Medienzeit überschritten', () => {
    const { labels, counts } = sortedCounts(getValues('ueberschritt'));
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Selbstregulation', 'Versucht zu reduzieren', () => {
    const { labels, counts } = sortedCounts(getValues('reduziert'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Einfluss', 'Hobby beeinflusst Medienkonsum', () => {
    const { labels, counts } = sortedCounts(getValues('hobby'));
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });

  addChart(container, 'span-4', 'Wirkung', 'Gefühl nach dem Scrollen', () => {
    const { labels, counts } = sortedCounts(getValues('gefuehl', true), 10);
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts, '#b05fff', true);
  });

  addChart(container, 'span-4', 'Risiken', 'Negative Erfahrungen', () => {
    const { labels, counts } = sortedCounts(getValues('negativ', true), 10);
    if (!labels.length) return false;
    return canvas => chartBar(canvas, labels, counts, '#ff5f5f', true);
  });

  addChart(container, 'span-4', 'Vertrauen', 'Welchen Medien wird vertraut?', () => {
    const { labels, counts } = sortedCounts(getValues('vertrauen', true), 10);
    if (!labels.length) return false;
    return canvas => chartDonut(canvas, labels, counts);
  });
}

/* ── Generic card + chart helper ── */
function addChart(container, spanClass, labelText, titleText, builderFn) {
  const builder = builderFn();
  if (!builder) return;

  const card   = makeCard(spanClass, labelText, titleText);
  container.appendChild(card);
  const canvas = card.querySelector('canvas');
  builder(canvas);
}

/* ── Relation explorer ── */
function initRelationExplorer() {
  const groupSel = document.getElementById('relation-group');
  const valueSel = document.getElementById('relation-value');
  const modeSel  = document.getElementById('relation-mode');
  const runBtn   = document.getElementById('relation-run');

  if (!groupSel || !valueSel || !modeSel || !runBtn) return;

  const mappedFields = FIELDS.filter(f => getCol(f.key));
  groupSel.innerHTML = mappedFields.map(f => `<option value="${f.key}">${fieldLabel(f.key)}</option>`).join('');
  valueSel.innerHTML = mappedFields.map(f => `<option value="${f.key}">${fieldLabel(f.key)}</option>`).join('');

  if (!mappedFields.length) return;

  groupSel.value = mappedFields.find(f => f.key === 'alter')?.key   || mappedFields[0].key;
  valueSel.value = mappedFields.find(f => f.key === 'stunden')?.key || mappedFields[Math.min(1, mappedFields.length - 1)].key;

  runBtn.onclick    = renderRelation;
  groupSel.onchange = renderRelation;
  valueSel.onchange = renderRelation;
  modeSel.onchange  = renderRelation;
  renderRelation();
}

function renderRelation() {
  const groupKey = document.getElementById('relation-group')?.value;
  const valueKey = document.getElementById('relation-value')?.value;
  const mode     = document.getElementById('relation-mode')?.value || 'count';
  const hintEl   = document.getElementById('relation-hint');
  const tableEl  = document.getElementById('relation-table');
  const canvas   = document.getElementById('relation-canvas');
  if (!groupKey || !valueKey || !canvas || !tableEl || !hintEl) return;

  if (mode === 'avg') {
    renderRelationAverage(groupKey, valueKey, canvas, tableEl, hintEl);
  } else {
    renderRelationDistribution(groupKey, valueKey, canvas, tableEl, hintEl);
  }
}

function normalizeYesNo(val) {
  const lower = (val || '').toString().trim().toLowerCase();
  if (!lower) return '';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('nein')) return 'nein';
  return lower;
}

function renderInterestingRelations() {
  const box = document.getElementById('relation-insights');
  if (!box) return;

  const insights = [];
  const sampleSize = parsedData.length;
  if (!sampleSize) { box.innerHTML = ''; return; }

  const stCol = getCol('stunden');
  const abCol = getCol('abhaengig');
  if (stCol && abCol) {
    let high = 0, highDep = 0, low = 0, lowDep = 0;
    parsedData.forEach(row => {
      const h   = parseNumeric(row[stCol]);
      const dep = normalizeYesNo(row[abCol]) === 'ja';
      if (h === null) return;
      if (h >= 5) { high++; if (dep) highDep++; }
      if (h <= 3) { low++;  if (dep) lowDep++;  }
    });
    if (high && low) {
      insights.push(`Bei hoher Nutzung (≥5h/Tag) geben ${Math.round((highDep / high) * 100)}% Abhängigkeit an; bei niedriger Nutzung (≤3h/Tag) sind es ${Math.round((lowDep / low) * 100)}%.`);
    }
  }

  const negCol = getCol('negativ');
  if (negCol) {
    let fakeNewsCount = 0;
    let hateCount     = 0;
    parsedData.forEach(row => {
      const vals = splitMultiValue(row[negCol] || '').map(v => v.toLowerCase());
      if (vals.some(v => v.includes('fake'))) fakeNewsCount++;
      if (vals.some(v => v.includes('hate'))) hateCount++;
    });
    if (fakeNewsCount) insights.push(`${Math.round((fakeNewsCount / sampleSize) * 100)}% berichten von Fake-News/Desinformation als negativer Erfahrung.`);
    if (hateCount)     insights.push(`${Math.round((hateCount     / sampleSize) * 100)}% nennen Hate als negative Erfahrung.`);
  }

  const feelCol = getCol('gefuehl');
  if (feelCol) {
    let depressed = 0, motivated = 0;
    parsedData.forEach(row => {
      const vals = splitMultiValue(row[feelCol] || '').map(v => v.toLowerCase());
      if (vals.some(v => v.includes('deprim'))) depressed++;
      if (vals.some(v => v.includes('motiv')))  motivated++;
    });
    if (depressed || motivated) {
      insights.push(`Nach dem Scrollen nennen ${Math.round((depressed / sampleSize) * 100)}% „deprimiert", aber auch ${Math.round((motivated / sampleSize) * 100)}% „motiviert" – ein ambivalenter Effekt.`);
    }
  }

  const mediaVals = getValues('medien', true);
  if (mediaVals.length) {
    const top = sortedCounts(mediaVals, 1);
    if (top.labels.length) insights.push(`Häufigstes genutztes Medium: ${top.labels[0]} (${top.counts[0]} Nennungen).`);
  }

  if (!insights.length) {
    box.innerHTML = '<h3>Top-Relationen (automatisch)</h3><p>Für automatische Insights fehlen aktuell passende Spaltenzuordnungen.</p>';
    return;
  }

  box.innerHTML = `<h3>Top-Relationen (automatisch)</h3><ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

function renderRelationAverage(groupKey, valueKey, canvas, tableEl, hintEl) {
  const groups = {};
  parsedData.forEach(row => {
    const groupVals = splitMultiValue(getCellValue(row, groupKey));
    const rawVal   = getCellValue(row, valueKey);
    if (!groupVals.length) return;
    const num = parseNumeric(rawVal);
    if (num === null) return;
    groupVals.forEach(groupVal => {
      if (!groups[groupVal]) groups[groupVal] = [];
      groups[groupVal].push(num);
    });
  });

  const entries = Object.entries(groups)
    .map(([label, nums]) => ({
      label,
      count: nums.length,
      avg: nums.reduce((a, b) => a + b, 0) / nums.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  if (!entries.length) {
    tableEl.innerHTML = '<table><tbody><tr><td>Keine numerischen Werte für diese Kombination gefunden.</td></tr></tbody></table>';
    hintEl.textContent = 'Tipp: Für "Ø numerischer Wert" sollte das zweite Feld Zahlen enthalten (z. B. Stunden).';
    newChart(canvas, 'bar', { labels: [], datasets: [{ data: [] }] });
    return;
  }

  chartBar(canvas, entries.map(e => e.label), entries.map(e => Number(e.avg.toFixed(2))));

  const top = entries[0];
  hintEl.textContent = `Ø ${fieldLabel(valueKey)} je ${fieldLabel(groupKey)}. Höchster Mittelwert aktuell bei "${top.label}" (${top.avg.toFixed(2)}).`;
  tableEl.innerHTML = `<table>
    <thead><tr><th>${fieldLabel(groupKey)}</th><th>Ø ${fieldLabel(valueKey)}</th><th>n</th></tr></thead>
    <tbody>${entries.map(e => `<tr><td>${e.label}</td><td>${e.avg.toFixed(2)}</td><td>${e.count}</td></tr>`).join('')}</tbody>
  </table>`;
}

function renderRelationDistribution(groupKey, valueKey, canvas, tableEl, hintEl) {
  const matrix = {};
  parsedData.forEach(row => {
    const groupVals = splitMultiValue(getCellValue(row, groupKey));
    const valueRaw = getCellValue(row, valueKey);
    if (!groupVals.length || !valueRaw) return;
    const values = splitMultiValue(valueRaw);
    if (!values.length) return;
    groupVals.forEach(groupVal => {
      if (!matrix[groupVal]) matrix[groupVal] = {};
      values.forEach(v => {
        matrix[groupVal][v] = (matrix[groupVal][v] || 0) + 1;
      });
    });
  });

  const groupEntries = Object.entries(matrix).sort((a, b) => {
    const aTotal = Object.values(a[1]).reduce((x, y) => x + y, 0);
    const bTotal = Object.values(b[1]).reduce((x, y) => x + y, 0);
    return bTotal - aTotal;
  }).slice(0, 12);

  const allValues = {};
  groupEntries.forEach(([, m]) => Object.entries(m).forEach(([k, v]) => { allValues[k] = (allValues[k] || 0) + v; }));
  const topValues = Object.entries(allValues).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);

  if (!groupEntries.length || !topValues.length) {
    tableEl.innerHTML = '<table><tbody><tr><td>Keine Werte für diese Kombination gefunden.</td></tr></tbody></table>';
    hintEl.textContent = 'Bitte zwei Felder mit vorhandenen Antworten wählen.';
    newChart(canvas, 'bar', { labels: [], datasets: [{ data: [] }] });
    return;
  }

  const labels   = groupEntries.map(e => e[0]);
  const datasets = topValues.map((val, i) => ({
    label: val,
    data: groupEntries.map(([, groupMap]) => groupMap[val] || 0),
    backgroundColor: PALETTE[i % PALETTE.length] + 'cc',
    borderColor:     PALETTE[i % PALETTE.length],
    borderWidth: 1,
    borderRadius: 4,
  }));

  newChart(canvas, 'bar', { labels, datasets }, {
    plugins: { legend: { display: true, position: 'bottom' } },
    responsive: true,
    scales: {
      x: { stacked: true, grid: { color: '#222235' }, ticks: { color: '#5a5a78' } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#222235' }, ticks: { color: '#5a5a78' } },
    },
  });

  hintEl.textContent = `${fieldLabel(valueKey)} nach ${fieldLabel(groupKey)} (gestapelt, Top-${topValues.length} Ausprägungen).`;
  tableEl.innerHTML = `<table>
    <thead><tr><th>${fieldLabel(groupKey)}</th>${topValues.map(v => `<th>${v}</th>`).join('')}</tr></thead>
    <tbody>
      ${groupEntries.map(([groupLabel, groupMap]) => `
        <tr><td>${groupLabel}</td>${topValues.map(v => `<td>${groupMap[v] || 0}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  </table>`;
}

/* ── Raw table ── */
function renderRawTable() {
  const wrap = document.getElementById('raw-table');
  document.getElementById('raw-count').textContent = `${parsedData.length} Antworten`;

  const visibleCols = columns.slice(0, 12);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>${visibleCols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  parsedData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = visibleCols.map(c => {
      const val = (row[c] || '').toString().slice(0, 60);
      return `<td>${val || '—'}</td>`;
    }).join('');
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.innerHTML = '';
  wrap.appendChild(table);
}
