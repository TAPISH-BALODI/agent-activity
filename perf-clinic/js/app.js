const { pageSize, tickerIntervalMs, tickerVisibleRows, storageKey } = window.APP_CONFIG;

const grid = document.getElementById('agents');
const searchInput = document.getElementById('search');
const resultsList = document.getElementById('results');
const resultsCount = document.getElementById('results-count');
const topbar = document.querySelector('.topbar');
const backToTop = document.getElementById('back-to-top');
const progress = document.getElementById('read-progress');
const tickerToggle = document.getElementById('ticker-toggle');
const preview = document.getElementById('row-preview');
const scrollContext = document.getElementById('scroll-context');

const minCardHeight = 220;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' });
}

function countByAgent(events) {
  const counts = {};
  events.forEach((event) => {
    counts[event.agent] = (counts[event.agent] || 0) + 1;
  });
  return counts;
}

function renderAgents() {
  const counts = countByAgent(window.ACTIVITY);
  grid.innerHTML = window.AGENTS.map((agent, index) => {
    const image = 'assets/agents/agent-' + String((index % 12) + 1).padStart(2, '0') + '.png';
    return (
      '<article class="agent-card">' +
      '<img class="agent-avatar" src="' + image + '" alt="">' +
      '<h3>' + escapeHtml(agent.name) + '</h3>' +
      '<p class="agent-owner">' + escapeHtml(agent.owner) + '</p>' +
      '<p class="agent-description">' + escapeHtml(agent.description) + '</p>' +
      '<p class="agent-count">' + (counts[agent.name] || 0).toLocaleString() + ' calls today</p>' +
      '</article>'
    );
  }).join('');
  grid.querySelectorAll('img').forEach((img) => img.addEventListener('load', equalizeCardHeights));
}

function equalizeCardHeights() {
  const cards = Array.from(grid.querySelectorAll('.agent-card'));

  // Reset heights (write), then batch-read all positions in one pass.
  cards.forEach((card) => { card.style.height = ''; });

  // Read phase: collect offsetTop and offsetHeight for every card at once.
  const metrics = cards.map((card) => ({
    card,
    top: card.offsetTop,
    height: card.offsetHeight,
  }));

  // Compute tallest per row using only the already-read metrics (no extra layout).
  const rowTallest = new Map();
  metrics.forEach(({ top, height }) => {
    rowTallest.set(top, Math.max(rowTallest.get(top) ?? minCardHeight, height));
  });

  // Write phase: apply heights all at once.
  metrics.forEach(({ card, top }) => {
    card.style.height = rowTallest.get(top) + 'px';
  });
}

function debounce(fn, ms) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

function loadViewed() {
  return JSON.parse(localStorage.getItem(storageKey) || '[]');
}

function rememberViewed(items) {
  const viewed = loadViewed();
  let changed = false;
  for (const item of items) {
    if (!viewed.includes(item.id)) {
      viewed.push(item.id);
      changed = true;
    }
  }
  // Single write after accumulating all IDs — was 200 writes in the original.
  if (changed) localStorage.setItem(storageKey, JSON.stringify(viewed));
}

// Pre-compute a single lowercase searchable string per event at startup.
// Avoids JSON.stringify(100K events) on every keystroke.
const searchIndex = window.ACTIVITY.map((event) => ({
  event,
  haystack: [event.agent, event.tool, event.status, event.summary].join(' ').toLowerCase(),
}));

function search(query) {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? searchIndex.filter(({ haystack }) => haystack.includes(needle)).map(({ event }) => event)
    : window.ACTIVITY.slice();
  return matches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function renderResults(query) {
  const matches = search(query);
  const page = matches.slice(0, pageSize);
  const viewed = loadViewed();
  resultsCount.textContent = matches.length.toLocaleString() + ' matching tool calls';
  resultsList.innerHTML = page.map((event) => {
    const isNew = !viewed.includes(event.id);
    return (
      '<li class="result-row status-' + event.status + '" data-id="' + event.id + '" data-minute="' + event.timestamp.slice(11, 16) + '">' +
      '<span class="result-time">' + formatTime(event.timestamp) + '</span>' +
      '<span class="result-agent">' + escapeHtml(event.agent) + '</span>' +
      '<span class="result-tool">' + escapeHtml(event.tool) + '</span>' +
      '<span class="result-status">' + event.status + '</span>' +
      '<span class="result-latency">' + event.latencyMs + ' ms</span>' +
      '<span class="result-summary">' + escapeHtml(event.summary) + '</span>' +
      (isNew ? '<span class="badge-new">New</span>' : '') +
      '</li>'
    );
  }).join('');
  fitSummaries();
  rememberViewed(page);
}

// fitSummaries was a read/write thrash loop (200 cells × N forced layouts each resize).
// The .result-summary class already has overflow:hidden + white-space:nowrap +
// text-overflow:ellipsis in app.css — CSS handles truncation for free.
function fitSummaries() { /* removed — handled by CSS text-overflow:ellipsis */ }

// Pre-build a minute → count Map once instead of filtering 100K events on every scroll.
const minuteCounts = new Map();
window.ACTIVITY.forEach((event) => {
  const minute = event.timestamp.slice(11, 16);
  minuteCounts.set(minute, (minuteCounts.get(minute) || 0) + 1);
});

let scrollRafId = null;

function onScroll() {
  // Coalesce scroll events — only one RAF callback per frame.
  if (scrollRafId !== null) return;
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = null;
    const scrolled = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + '%';
    topbar.classList.toggle('topbar-raised', scrolled > 8);
    topbar.style.paddingBlock = Math.max(6, 12 - scrolled / 20) + 'px';
    backToTop.classList.toggle('visible', scrolled > window.innerHeight);

    // Batch: read all rects first, then write classList.
    // Find the single row whose top edge is closest to the viewport midpoint (45%).
    const rows = Array.from(resultsList.querySelectorAll('.result-row'));
    const mid = window.innerHeight * 0.45;
    const rects = rows.map((row) => row.getBoundingClientRect());
    let closestIdx = -1;
    let closestDist = Infinity;
    rects.forEach((rect, i) => {
      if (rect.top < 0 || rect.bottom > window.innerHeight) return; // off screen
      const dist = Math.abs(rect.top - mid);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    // Single write pass — only one row gets in-focus at a time
    let focusedRow = null;
    rows.forEach((row, i) => {
      const inFocus = i === closestIdx;
      row.classList.toggle('in-focus', inFocus);
      if (inFocus) focusedRow = row;
    });

    if (focusedRow) {
      const minute = focusedRow.dataset.minute;
      const sameMinute = minuteCounts.get(minute) || 0;
      scrollContext.textContent = minute + ' UTC · ' + sameMinute + ' calls that minute';
    } else {
      scrollContext.textContent = '';
    }
  });
}

function hidePreview() {
  preview.hidden = true;
}

function showPreview(event) {
  const row = event.target.closest('.result-row');
  if (!row) return;
  const item = window.ACTIVITY.find((candidate) => candidate.id === row.dataset.id);
  if (!item) return;
  preview.textContent = item.summary;
  preview.style.top = event.clientY + 12 + 'px';
  preview.style.left = event.clientX + 12 + 'px';
  preview.hidden = false;
}

const renderedTickerRows = new Map();
let tickerPanel = null;

function tickerRow(event) {
  if (renderedTickerRows.has(event.id)) {
    return renderedTickerRows.get(event.id).cloneNode(true);
  }
  const row = document.createElement('li');
  row.className = 'ticker-row status-' + event.status;
  row.innerHTML =
    '<span class="ticker-time">' + formatTime(event.timestamp) + '</span>' +
    '<span class="ticker-agent">' + escapeHtml(event.agent) + '</span>' +
    '<span class="ticker-tool">' + escapeHtml(event.tool) + '</span>';
  renderedTickerRows.set(event.id, row);
  return row.cloneNode(true);
}

function positionTicker() {
  if (!tickerPanel) return;
  tickerPanel.style.maxHeight = window.innerHeight - 120 + 'px';
}

function openTicker() {
  const panel = document.createElement('aside');
  panel.className = 'ticker';
  panel.innerHTML = '<header class="ticker-header">Live tool calls</header><ul class="ticker-list"></ul>';
  document.body.appendChild(panel);
  tickerPanel = panel;
  const list = panel.querySelector('.ticker-list');

  setInterval(() => {
    const event = window.ACTIVITY[Math.floor(Math.random() * window.ACTIVITY.length)];
    list.prepend(tickerRow(event));
    while (list.children.length > tickerVisibleRows) {
      list.lastElementChild.remove();
    }
  }, tickerIntervalMs);

  window.addEventListener('resize', positionTicker);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTicker();
  });
  positionTicker();
  tickerToggle.setAttribute('aria-pressed', 'true');
  tickerToggle.textContent = 'Hide live calls';
}

function closeTicker() {
  if (!tickerPanel) return;
  tickerPanel.remove();
  tickerPanel = null;
  tickerToggle.setAttribute('aria-pressed', 'false');
  tickerToggle.textContent = 'Show live calls';
}

searchInput.addEventListener('input', debounce(() => renderResults(searchInput.value), 200));
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', debounce(equalizeCardHeights, 100));
window.addEventListener('resize', debounce(fitSummaries, 100));
resultsList.addEventListener('mousemove', showPreview);
resultsList.addEventListener('mouseleave', hidePreview);
resultsList.addEventListener('wheel', hidePreview);
resultsList.addEventListener('touchstart', hidePreview);
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
tickerToggle.addEventListener('click', () => (tickerPanel ? closeTicker() : openTicker()));

renderAgents();
equalizeCardHeights();
renderResults('');
