/* ─── Global state ───────────────────────────────────── */
let parsedData = [];
let columns    = [];
let colMap     = {};
const chartInstances = {};

/* ─── Chart.js defaults ──────────────────────────────── */
Chart.defaults.color        = ‘#5a5a78’;
Chart.defaults.borderColor  = ‘#222235’;
Chart.defaults.font.family  = “‘Space Mono’, monospace”;
Chart.defaults.font.size    = 11;
Chart.defaults.plugins.legend.display = false;

const PALETTE = [’#c8ff00’,’#ff5f5f’,’#5f9fff’,’#ffac5f’,’#b05fff’,’#5fffd4’,’#ffda5f’,’#ff5fd4’,’#5fffa0’,’#ff9a5f’];

/* ─── Field definitions ──────────────────────────────── */
const FIELDS = [
{ key:‘alter’,       label:‘🎂 Alter’,                   hints:[‘alter’,‘age’,‘jahrgang’] },
{ key:‘geschlecht’,  label:‘👤 Geschlecht’,               hints:[‘geschlecht’,‘gender’,‘sex’] },
{ key:‘medien’,      label:‘📱 Genutzte Medien’,          hints:[‘medien’,‘medium’,‘plattform’,‘platform’,‘app’] },
{ key:‘stunden’,     label:‘⏱ Stunden täglich’,          hints:[‘stunden’,‘stunde’,‘hours’,‘dauer’,‘h_tag’,‘täglich’] },
{ key:‘tageszeit’,   label:‘🕐 Wann genutzt’,             hints:[‘tageszeit’,‘uhrzeit’,‘wann’,‘when’] },
{ key:‘ort’,         label:‘📍 Wo genutzt’,               hints:[‘ort’,‘wo’,‘where’,‘location’,‘platz’] },
{ key:‘zweck’,       label:‘🎯 Nutzungszweck’,            hints:[‘zweck’,‘wozu’,‘warum’,‘grund’,‘purpose’] },
{ key:‘aktuell’,     label:‘📰 Aktuell informieren via’,  hints:[‘aktuell’,‘nachrichten’,‘informier’,‘news’] },
{ key:‘beziehung’,   label:‘💛 Beziehungsstatus’,         hints:[‘beziehung’,‘partner’,‘status’,‘relationship’] },
{ key:‘abhaengig’,   label:‘🔄 Abhängig / Doomscrolling’, hints:[‘abhängig’,‘abhaengig’,‘doomscroll’,‘sucht’,‘addict’] },
{ key:‘beruflich’,   label:‘💼 Beruflich genutzt’,        hints:[‘beruflich’,‘beruf’,‘job’,‘work’] },
{ key:‘ki’,          label:‘🤖 KI-Inhalte konsumiert’,    hints:[‘ki’,‘ai’,‘künstlich’,‘generie’,‘artificial’] },
{ key:‘hobby’,       label:‘🎮 Hobby beeinflusst Konsum’, hints:[‘hobby’,‘freizeit’,‘leisure’] },
{ key:‘bezahlt’,     label:‘💳 Bezahlt für Medien’,       hints:[‘bezahlt’,‘pay’,‘abo’,‘subscription’] },
{ key:‘ueberschritt’,label:‘📊 Medienzeit überschritten’, hints:[‘überschritt’,‘ueberschritt’,‘limit’,‘mehr_als’] },
{ key:‘reduziert’,   label:‘📉 Versucht zu reduzieren’,   hints:[‘reduziert’,‘reduz’,‘weniger’,‘cut’] },
];

/* ─── Auto-mapping ───────────────────────────────────── */
function autoMap(col) {
const lower = col.toLowerCase().replace(/[^a-zäöü0-9]/g, ‘’);
for (const f of FIELDS) {
if (f.hints.some(h => lower.includes(h.replace(/[^a-zäöü0-9]/g, ‘’)))) return f.key;
}
return ‘’;
}

/* ─── Sample data ────────────────────────────────────── */
const SAMPLE_ROWS = [
[‘Alter’,‘Geschlecht’,‘Medien’,‘Stunden_täglich’,‘Tageszeit’,‘Ort’,‘Zweck’,‘Aktuell’,‘Beziehung’,‘Abhängig’,‘Beruflich’,‘KI_Inhalte’,‘Hobby’,‘Bezahlt’,‘Überschritten’,‘Reduziert’],
[‘22’,‘weiblich’,‘Instagram; TikTok’,‘3’,‘morgens; abends’,‘zu Hause; in Bus&Bahn’,‘Unterhaltung; Inspiration’,‘Instagram’,‘Single’,‘ja’,‘nein’,‘ja’,‘Ja’,‘Nein’,‘2-4 std’,‘ja’],
[‘34’,‘männlich’,‘YouTube; Podcasts; Zeitung’,‘2’,‘vormittags; abends’,‘zu Hause; Arbeit/Hochschule’,‘Bildung; Nachrichten’,‘Zeitung’,‘Vergeben’,‘nein’,‘ja’,‘nein’,‘Nein’,‘Ja’,‘1-2 std’,‘nein’],
[‘19’,‘weiblich’,‘TikTok; Instagram; YouTube’,‘5’,‘morgens; mittags; abends’,‘zu Hause; in Bus&Bahn’,‘Unterhaltung; Musik’,‘TikTok’,‘Single’,‘ja’,‘nein’,‘ja’,‘Ja’,‘Nein’,‘4-6 std’,‘nein’],
[‘27’,‘divers’,‘Twitter; YouTube; Podcasts’,‘3’,‘vormittags; abends’,‘Arbeit/Hochschule; zu Hause’,‘Nachrichten; Bildung’,‘Twitter’,‘Es ist kompliziert’,‘ja’,‘ja’,‘ja’,‘Nein’,‘Nein’,‘2-4 std’,‘ja’],
[‘45’,‘männlich’,‘Zeitung; TV; Radio’,‘2’,‘morgens; abends’,‘zu Hause; am Schreibtisch’,‘Nachrichten; Unterhaltung’,‘Zeitung; TV’,‘Vergeben’,‘nein’,‘nein’,‘nein’,‘Nein’,‘Ja’,‘0-1 std’,‘nein’],
[‘23’,‘weiblich’,‘Instagram; Pinterest’,‘4’,‘morgens; abends’,‘zu Hause; in Bus&Bahn’,‘Inspiration; Unterhaltung’,‘Instagram’,‘Single’,‘ja’,‘nein’,‘ja’,‘Ja’,‘Nein’,‘2-4 std’,‘ja’],
[‘31’,‘männlich’,‘LinkedIn; YouTube; Podcasts’,‘2’,‘vormittags; abends’,‘Arbeit/Hochschule’,‘Bildung; Beruf’,‘LinkedIn’,‘Vergeben’,‘nein’,‘ja’,‘nein’,‘Nein’,‘Ja’,‘1-2 std’,‘nein’],
[‘20’,‘weiblich’,‘TikTok; YouTube’,‘6’,‘durchgängig’,‘zu Hause; auf der Couch’,‘Unterhaltung; Musik’,‘TikTok’,‘Single’,‘ja’,‘nein’,‘ja’,‘Ja’,‘Nein’,‘mehr als 6 std’,‘nein’],
[‘38’,‘männlich’,‘Zeitung; Podcasts; Radio’,‘1’,‘morgens’,‘am Schreibtisch’,‘Nachrichten’,‘Zeitung’,‘Vergeben’,‘nein’,‘ja’,‘nein’,‘Nein’,‘Ja’,‘0-1 std’,‘ja’],
[‘25’,‘weiblich’,‘Instagram; YouTube; Netflix’,‘4’,‘abends’,‘zu Hause; auf der Couch’,‘Unterhaltung; Entspannung’,‘Instagram’,‘Single’,‘ja’,‘nein’,‘ja’,‘Ja’,‘Nein’,‘4-6 std’,‘ja’],
[‘29’,‘männlich’,‘Twitter; YouTube’,‘3’,‘abends’,‘zu Hause’,‘Unterhaltung; Nachrichten’,‘Twitter’,‘Es ist kompliziert’,‘nein’,‘ja’,‘ja’,‘Nein’,‘Nein’,‘2-4 std’,‘nein’],
[‘18’,‘weiblich’,‘TikTok; Instagram’,‘7’,‘morgens; mittags; abends; durchgängig’,‘in Bus&Bahn; zu Hause’,‘Unterhaltung; Musik’,‘TikTok’,‘Single’,‘ja’,‘nein’,‘ja’,‘Ja’,‘Nein’,‘mehr als 6 std’,‘nein’],
[‘52’,‘männlich’,‘TV; Zeitung’,‘2’,‘abends; morgens’,‘zu Hause’,‘Nachrichten; Unterhaltung’,‘TV’,‘Vergeben’,‘nein’,‘nein’,‘nein’,‘Nein’,‘Ja’,‘0-1 std’,‘nein’],
[‘24’,‘divers’,‘Instagram; TikTok; Podcasts’,‘4’,‘abends; morgens’,‘zu Hause; in Bus&Bahn’,‘Unterhaltung; Bildung’,‘Instagram’,‘Single’,‘ja’,‘nein’,‘ja’,‘Ja’,‘Nein’,‘2-4 std’,‘ja’],
[‘36’,‘weiblich’,‘YouTube; Podcasts’,‘2’,‘vormittags’,‘Arbeit/Hochschule; zu Hause’,‘Bildung; Inspiration’,‘YouTube’,‘Vergeben’,‘nein’,‘ja’,‘nein’,‘Nein’,‘Nein’,‘1-2 std’,‘ja’],
[‘21’,‘männlich’,‘TikTok; Twitch; YouTube’,‘5’,‘abends; nachts’,‘zu Hause; auf der Couch’,‘Unterhaltung; Gaming’,‘YouTube’,‘Single’,‘ja’,‘nein’,‘ja’,‘Nein’,‘Nein’,‘4-6 std’,‘nein’],
[‘33’,‘weiblich’,‘Instagram; Pinterest; Netflix’,‘3’,‘abends’,‘zu Hause’,‘Inspiration; Unterhaltung’,‘Instagram’,‘Vergeben’,‘ja’,‘nein’,‘nein’,‘Ja’,‘Nein’,‘2-4 std’,‘ja’],
[‘40’,‘männlich’,‘LinkedIn; Zeitung; Podcasts’,‘2’,‘morgens; vormittags’,‘am Schreibtisch; Arbeit/Hochschule’,‘Beruf; Nachrichten; Bildung’,‘Zeitung; LinkedIn’,‘Vergeben’,‘nein’,‘ja’,‘nein’,‘Nein’,‘Ja’,‘0-1 std’,‘nein’],
[‘26’,‘weiblich’,‘Instagram; TikTok; Spotify’,‘4’,‘morgens; abends’,‘in Bus&Bahn; zu Hause’,‘Musik; Unterhaltung; Inspiration’,‘Instagram’,‘Single’,‘ja’,‘nein’,‘ja’,‘Nein’,‘Nein’,‘2-4 std’,‘ja’],
[‘30’,‘divers’,‘YouTube; Twitter; Podcasts’,‘3’,‘vormittags; abends’,‘Arbeit/Hochschule’,‘Bildung; Nachrichten’,‘Twitter; YouTube’,‘Es ist kompliziert’,‘nein’,‘ja’,‘ja’,‘Nein’,‘Nein’,‘1-2 std’,‘ja’],
];

function loadSampleData() {
const headers = SAMPLE_ROWS[0];
parsedData = SAMPLE_ROWS.slice(1).map(row => {
const obj = {};
headers.forEach((h, i) => obj[h] = row[i] ?? ‘’);
return obj;
});
columns = headers;
buildMapper();
}

/* ─── CSV upload ─────────────────────────────────────── */
document.getElementById(‘csv-input’).addEventListener(‘change’, function (e) {
const file = e.target.files[0];
if (!file) return;
Papa.parse(file, {
header: true,
skipEmptyLines: true,
complete(res) {
parsedData = res.data;
columns    = res.meta.fields;
buildMapper();
},
});
});

document.getElementById(‘demo-btn’).addEventListener(‘click’, function (e) {
e.stopPropagation();
loadSampleData();
});

// Drag & drop
const uploadZone = document.getElementById(‘upload-zone’);
uploadZone.addEventListener(‘dragover’,  e => { e.preventDefault(); uploadZone.classList.add(‘drag-over’); });
uploadZone.addEventListener(‘dragleave’, ()  => uploadZone.classList.remove(‘drag-over’));
uploadZone.addEventListener(‘drop’, e => {
e.preventDefault();
uploadZone.classList.remove(‘drag-over’);
const file = e.dataTransfer.files[0];
if (!file) return;
Papa.parse(file, {
header: true, skipEmptyLines: true,
complete(res) { parsedData = res.data; columns = res.meta.fields; buildMapper(); },
});
});

/* ─── Build mapper UI ────────────────────────────────── */
function buildMapper() {
colMap = {};
document.getElementById(‘upload-section’).classList.add(‘hidden’);
document.getElementById(‘mapper-section’).classList.remove(‘hidden’);

const grid = document.getElementById(‘mapper-grid’);
grid.innerHTML = ‘’;

// pre-fill colMap with auto-detected matches
FIELDS.forEach(f => {
const match = columns.find(c => autoMap(c) === f.key) || ‘’;
colMap[f.key] = match;
});

FIELDS.forEach(f => {
const auto = colMap[f.key];
const row  = document.createElement(‘div’);
row.className = ‘mapper-row’;
row.innerHTML = `<label>${f.label}</label> <select data-field="${f.key}"> <option value="">— nicht zugeordnet —</option> ${columns.map(c =>`<option value=”${c}”${c === auto ? ’ selected’ : ‘’}>${c}</option>`).join('')} </select> ${auto ? `<span class="auto-tag">✓ Auto-erkannt</span>`: ''}`;
row.querySelector(‘select’).addEventListener(‘change’, function () {
colMap[this.dataset.field] = this.value;
});
grid.appendChild(row);
});

document.getElementById(‘stat-total’).textContent = parsedData.length;
document.getElementById(‘stat-cols’).textContent  = columns.length;

document.getElementById(‘render-btn’).addEventListener(‘click’, renderDashboard);
}

/* ─── Helpers ────────────────────────────────────────── */
function getCol(key) { return colMap[key] || ‘’; }

/** Collect values for a column (splits multi-value cells by ;) */
function getValues(key, multi = false) {
const col = getCol(key);
if (!col) return [];
return parsedData.flatMap(row => {
const val = (row[col] || ‘’).trim();
if (!val) return [];
return multi ? val.split(’;’).map(v => v.trim()).filter(Boolean) : [val];
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
const card = document.createElement(‘div’);
card.className = `chart-card ${spanClass}`;
card.innerHTML = `<div class="card-label">${labelText}</div> <div class="card-title">${titleText}</div> <div class="chart-wrap"><canvas></canvas></div>`;
return card;
}

/** Destroy old chart if any */
function newChart(canvas, type, data, options = {}) {
const existing = Chart.getChart(canvas);
if (existing) existing.destroy();
return new Chart(canvas, { type, data, options });
}

/* ─── Chart factory functions ────────────────────────── */

function chartDonut(canvas, labels, counts, color = ‘#c8ff00’) {
const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
return newChart(canvas, ‘doughnut’, {
labels,
datasets: [{ data: counts, backgroundColor: colors, borderWidth: 2, borderColor: ‘#0c0c18’, hoverOffset: 6 }],
}, {
cutout: ‘65%’,
plugins: {
legend: {
display: true,
position: ‘right’,
labels: { color: ‘#5a5a78’, boxWidth: 10, padding: 12, font: { size: 10 } },
},
tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } },
},
});
}

function chartBar(canvas, labels, counts, color = ‘#c8ff00’, horizontal = false) {
return newChart(canvas, ‘bar’, {
labels,
datasets: [{
data: counts,
backgroundColor: labels.map((*, i) => PALETTE[i % PALETTE.length] + ‘cc’),
borderColor:     labels.map((*, i) => PALETTE[i % PALETTE.length]),
borderWidth: 1,
borderRadius: 4,
}],
}, {
indexAxis: horizontal ? ‘y’ : ‘x’,
plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}` } } },
scales: {
x: { grid: { color: ‘#222235’ }, ticks: { color: ‘#5a5a78’, maxRotation: 30 } },
y: { grid: { color: ‘#222235’ }, ticks: { color: ‘#5a5a78’ }, beginAtZero: true },
},
});
}

function chartLine(canvas, labels, counts) {
return newChart(canvas, ‘line’, {
labels,
datasets: [{
data: counts,
borderColor: ‘#c8ff00’,
backgroundColor: ‘rgba(200,255,0,.08)’,
pointBackgroundColor: ‘#c8ff00’,
pointRadius: 4,
tension: 0.4,
fill: true,
}],
}, {
plugins: { legend: { display: false } },
scales: {
x: { grid: { color: ‘#222235’ }, ticks: { color: ‘#5a5a78’ } },
y: { grid: { color: ‘#222235’ }, ticks: { color: ‘#5a5a78’ }, beginAtZero: true },
},
});
}

/* ─── Render dashboard ───────────────────────────────── */
function renderDashboard() {
document.getElementById(‘mapper-section’).classList.add(‘hidden’);
document.getElementById(‘dashboard’).classList.remove(‘hidden’);

renderKPIs();
renderDemoCharts();
renderMediaCharts();
renderContextCharts();
renderRawTable();
}

/* ── KPIs ── */
function renderKPIs() {
const kpiRow = document.getElementById(‘kpi-row’);
kpiRow.innerHTML = ‘’;

const n = parsedData.length;

// Durchschnittsalter
const alterCol = getCol(‘alter’);
let avgAge = ‘—’;
if (alterCol) {
const ages = parsedData.map(r => parseFloat(r[alterCol])).filter(v => !isNaN(v));
if (ages.length) avgAge = Math.round(ages.reduce((a,b) => a+b,0) / ages.length);
}

// Ø Stunden
const stCol = getCol(‘stunden’);
let avgH = ‘—’;
if (stCol) {
const hrs = parsedData.map(r => parseFloat(r[stCol])).filter(v => !isNaN(v));
if (hrs.length) avgH = (hrs.reduce((a,b) => a+b,0) / hrs.length).toFixed(1);
}

// Abhängig %
const abCol = getCol(‘abhaengig’);
let pctAbh = ‘—’;
if (abCol) {
const vals = parsedData.map(r => (r[abCol]||’’).toLowerCase());
const ja   = vals.filter(v => v.startsWith(‘j’)).length;
pctAbh = Math.round(ja / n * 100) + ‘%’;
}

// Bezahlt %
const bezCol = getCol(‘bezahlt’);
let pctBez = ‘—’;
if (bezCol) {
const vals = parsedData.map(r => (r[bezCol]||’’).toLowerCase());
const ja   = vals.filter(v => v.startsWith(‘j’)).length;
pctBez = Math.round(ja / n * 100) + ‘%’;
}

const kpis = [
{ value: n,      label: ‘Teilnehmer’ },
{ value: avgAge, label: ‘Ø Alter’ },
{ value: avgH,   label: ‘Ø Std. tägl.’ },
{ value: pctAbh, label: ‘Fühlen sich abhängig’ },
{ value: pctBez, label: ‘Zahlen für Medien’ },
];

kpis.forEach(k => {
const card = document.createElement(‘div’);
card.className = ‘kpi-card’;
card.innerHTML = `<div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div>`;
kpiRow.appendChild(card);
});
}

/* ── Demografics ── */
function renderDemoCharts() {
const container = document.getElementById(‘demo-charts’);
container.innerHTML = ‘’;

// Geschlecht
addChart(container, ‘span-4’, ‘Demografie’, ‘Geschlecht’, () => {
const { labels, counts } = sortedCounts(getValues(‘geschlecht’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// Alter – histogram buckets
addChart(container, ‘span-8’, ‘Demografie’, ‘Altersverteilung’, () => {
const alterCol = getCol(‘alter’);
if (!alterCol) return false;
const ages = parsedData.map(r => parseFloat(r[alterCol])).filter(v => !isNaN(v));
if (!ages.length) return false;
const buckets = {’<20’:0,‘20-25’:0,‘26-30’:0,‘31-40’:0,‘41-50’:0,‘50+’:0};
ages.forEach(a => {
if      (a < 20) buckets[’<20’]++;
else if (a <= 25) buckets[‘20-25’]++;
else if (a <= 30) buckets[‘26-30’]++;
else if (a <= 40) buckets[‘31-40’]++;
else if (a <= 50) buckets[‘41-50’]++;
else              buckets[‘50+’]++;
});
const labels = Object.keys(buckets);
const counts = Object.values(buckets);
return canvas => chartBar(canvas, labels, counts);
});

// Beziehungsstatus
addChart(container, ‘span-4’, ‘Persönlich’, ‘Beziehungsstatus’, () => {
const { labels, counts } = sortedCounts(getValues(‘beziehung’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// Beruflich
addChart(container, ‘span-4’, ‘Kontext’, ‘Berufliche Nutzung’, () => {
const { labels, counts } = sortedCounts(getValues(‘beruflich’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// Bezahlt
addChart(container, ‘span-4’, ‘Finanzen’, ‘Bezahlt für Medien’, () => {
const { labels, counts } = sortedCounts(getValues(‘bezahlt’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});
}

/* ── Media behavior ── */
function renderMediaCharts() {
const container = document.getElementById(‘media-charts’);
container.innerHTML = ‘’;

// Top-Medien
addChart(container, ‘span-8’, ‘Reichweite’, ‘Meist genutzte Medien’, () => {
const { labels, counts } = sortedCounts(getValues(‘medien’, true), 12);
if (!labels.length) return false;
return canvas => chartBar(canvas, labels, counts, ‘#c8ff00’, true);
});

// Stunden täglich
addChart(container, ‘span-4’, ‘Zeitaufwand’, ‘Stunden täglich’, () => {
const stCol = getCol(‘stunden’);
if (!stCol) return false;
// bucket by integer hours
const vals = parsedData.map(r => parseFloat(r[stCol])).filter(v => !isNaN(v));
if (!vals.length) return false;
const map = {};
vals.forEach(v => { const k = `${Math.floor(v)}h`; map[k] = (map[k]||0)+1; });
const sorted = Object.entries(map).sort((a,b) => parseFloat(a[0])-parseFloat(b[0]));
return canvas => chartBar(canvas, sorted.map(e=>e[0]), sorted.map(e=>e[1]));
});

// Zweck
addChart(container, ‘span-6’, ‘Motivation’, ‘Nutzungszweck’, () => {
const { labels, counts } = sortedCounts(getValues(‘zweck’, true), 10);
if (!labels.length) return false;
return canvas => chartBar(canvas, labels, counts, ‘#5f9fff’, true);
});

// Aktuell informiert via
addChart(container, ‘span-6’, ‘Nachrichten’, ‘Politisch informieren via’, () => {
const { labels, counts } = sortedCounts(getValues(‘aktuell’, true), 10);
if (!labels.length) return false;
return canvas => chartBar(canvas, labels, counts, ‘#ffac5f’, true);
});
}

/* ── Context & habits ── */
function renderContextCharts() {
const container = document.getElementById(‘context-charts’);
container.innerHTML = ‘’;

// Tageszeit
addChart(container, ‘span-6’, ‘Rhythmus’, ‘Wann werden Medien genutzt?’, () => {
const { labels, counts } = sortedCounts(getValues(‘tageszeit’, true));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// Ort
addChart(container, ‘span-6’, ‘Location’, ‘Wo werden Medien genutzt?’, () => {
const { labels, counts } = sortedCounts(getValues(‘ort’, true));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// Abhängig
addChart(container, ‘span-4’, ‘Verhalten’, ‘Abhängig / Doomscrolling’, () => {
const { labels, counts } = sortedCounts(getValues(‘abhaengig’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// KI-Inhalte
addChart(container, ‘span-4’, ‘Konsum’, ‘KI-Inhalte bewusst konsumiert’, () => {
const { labels, counts } = sortedCounts(getValues(‘ki’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// Medienzeit überschritten
addChart(container, ‘span-4’, ‘Selbstwahrnehmung’, ‘Medienzeit überschritten’, () => {
const { labels, counts } = sortedCounts(getValues(‘ueberschritt’));
if (!labels.length) return false;
return canvas => chartBar(canvas, labels, counts);
});

// Reduziert
addChart(container, ‘span-4’, ‘Selbstregulation’, ‘Versucht zu reduzieren’, () => {
const { labels, counts } = sortedCounts(getValues(‘reduziert’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});

// Hobby
addChart(container, ‘span-4’, ‘Einfluss’, ‘Hobby beeinflusst Medienkonsum’, () => {
const { labels, counts } = sortedCounts(getValues(‘hobby’));
if (!labels.length) return false;
return canvas => chartDonut(canvas, labels, counts);
});
}

/* ── Generic card + chart helper ── */
function addChart(container, spanClass, labelText, titleText, builderFn) {
const builder = builderFn();
if (!builder) return; // no data for this field

const card    = makeCard(spanClass, labelText, titleText);
container.appendChild(card);
const canvas  = card.querySelector(‘canvas’);
builder(canvas);
}

/* ── Raw table ── */
function renderRawTable() {
const wrap = document.getElementById(‘raw-table’);
document.getElementById(‘raw-count’).textContent = `${parsedData.length} Antworten`;

const visibleCols = columns.slice(0, 12); // cap at 12 columns for readability

const table = document.createElement(‘table’);
const thead = document.createElement(‘thead’);
thead.innerHTML = `<tr>${visibleCols.map(c => `<th>${c}</th>`).join('')}</tr>`;
table.appendChild(thead);

const tbody = document.createElement(‘tbody’);
parsedData.forEach(row => {
const tr = document.createElement(‘tr’);
tr.innerHTML = visibleCols.map(c => {
const val = (row[c] || ‘’).toString().slice(0, 60);
return `<td>${val || '—'}</td>`;
}).join(’’);
tbody.appendChild(tr);
});
table.appendChild(tbody);

wrap.innerHTML = ‘’;
wrap.appendChild(table);
}