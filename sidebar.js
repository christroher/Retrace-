// ===== Retrace · Sidebar Logic =====

// ---- State ----
let allData = [];
let calRangeStart = null, calRangeEnd = null;
let filterStart = null, filterEnd = null;
let calYear, calMonth;
let loadedStart = null; // 实际已加载的数据范围（用于按需追加）

// 监听 background 消息，刷新历史记录
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'tab-closed' || message.type === 'history-updated') {
    // 延迟刷新，确保历史记录已更新（关闭标签页后需要更长时间）
    setTimeout(() => {
      initHistoryData();
    }, 5000);
  }
});

// ===== History API =====
async function fetchHistory(startTime, endTime, maxResults = 1000) {
  return new Promise((resolve) => {
    chrome.history.search({
      text: '',
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      maxResults
    }, (results) => {
      resolve(results.map(item => ({
        title: item.title || '(无标题)',
        url: item.url,
        domain: extractDomain(item.url),
        dt: new Date(item.lastVisitTime)
      })));
    });
  });
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    const parts = u.hostname.replace('www.', '').split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return 'Unknown';
  }
}

async function initHistoryData() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 180);
  loadedStart = new Date(start);

  // Try cache first (last 7 days for instant render)
  const cached = await new Promise(resolve => chrome.storage.local.get('retrace_cache', r => resolve(r.retrace_cache)));
  let hasCache = false;
  if (cached && cached.data && cached.time) {
    const cacheAge = now.getTime() - cached.time;
    if (cacheAge < 3600000) { // Cache valid for 1 hour
      allData = cached.data.map(i => ({ ...i, dt: new Date(i.dt) }));
      hasCache = true;
      render(getSearchValue());
      updateStickyDate();
    }
  }

  // Always fetch fresh data in background
  const freshData = await fetchHistory(start, now, 5000);
  const seen = new Map();
  freshData.forEach(item => {
    const existing = seen.get(item.url);
    if (!existing || item.dt > existing.dt) seen.set(item.url, item);
  });
  allData = Array.from(seen.values()).sort((a, b) => b.dt - a.dt);

  // Save cache (compress: only keep last 7 days)
  const cacheCutoff = new Date(now);
  cacheCutoff.setDate(cacheCutoff.getDate() - 7);
  const cacheData = allData.filter(i => i.dt >= cacheCutoff);
  chrome.storage.local.set({ retrace_cache: { data: cacheData, time: now.getTime() } });

  if (filterStart && filterEnd) {
    const fmt = (d) => `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
    showFilterTag(`${fmt(filterStart)} ~ ${fmt(filterEnd)}`);
    syncQuickButtons();
  }
  render(getSearchValue());
  updateStickyDate();
  
  // 等待浏览器完成布局后再检查引导
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      checkOnboarding();
    });
  });
}

/**
 * 按需加载某个月份的数据，合并到 allData
 * 如果该月数据已在 loadedStart 范围内则跳过
 */
async function ensureMonthData(year, month) {
  const monthStart = new Date(year, month, 1);
  if (loadedStart && monthStart >= loadedStart) return; // 已加载

  // 显示加载指示
  const calTitle = document.getElementById('calTitle');
  if (calTitle && !calTitle.textContent.includes('加载')) {
    calTitle.dataset.originText = calTitle.textContent;
    calTitle.textContent = `${year}年${month + 1}月 · 加载中…`;
  }

  // 拉取该月整月数据
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  const newItems = await fetchHistory(monthStart, monthEnd, 5000);

  // 检查是否被截断——如果满 5000 条，做一次分片补救
  if (newItems.length >= 5000) {
    // 按周拆分为 4 片重新拉取，去重合并
    const allParts = [];
    for (let day = 1; day <= monthEnd.getDate(); day += 7) {
      const ps = new Date(year, month, day);
      const pe = new Date(year, month, Math.min(day + 6, monthEnd.getDate()), 23, 59, 59);
      allParts.push(...await fetchHistory(ps, pe, 5000));
    }
    newItems.length = 0;
    newItems.push(...allParts);
  }

  // 去重合并
  const urlMap = new Map();
  allData.forEach(i => {
    const e = urlMap.get(i.url);
    if (!e || i.dt > e.dt) urlMap.set(i.url, i);
  });
  newItems.forEach(i => {
    const e = urlMap.get(i.url);
    if (!e || i.dt > e.dt) urlMap.set(i.url, i);
  });
  allData = Array.from(urlMap.values()).sort((a, b) => b.dt - a.dt);

  // 更新已加载范围
  if (!loadedStart || monthStart < loadedStart) loadedStart = new Date(monthStart);

  // 恢复标题
  if (calTitle && calTitle.dataset.originText) {
    calTitle.textContent = calTitle.dataset.originText;
    delete calTitle.dataset.originText;
  }
}

function getSearchValue() {
  return document.getElementById('searchInput')?.value || '';
}

// ===== Helpers =====
const websiteColors = {
  'GitHub':'#3a3a3a','知乎':'#7a8a9a','Chrome':'#7a9aba','掘金':'#7a9a8a',
  'Arc':'#b8a88a','CSS-Tricks':'#8a9a8a','少数派':'#b8a898',
  'Microsoft':'#7a8aaa','YouTube':'#c48a8a','Google':'#8a9aba',
  'Twitter':'#8aaaba','X':'#8aaaba','Bilibili':'#c48a9a','B站':'#c48a9a',
  'Stack':'#c4a080','Medium':'#8a9a8a','Notion':'#3a3a3a',
  'Figma':'#c48a8a','Vercel':'#3a3a3a','Linear':'#9a8aaa',
  'Personal':'#9a9a9a',
};
const colorPalette = [
  '#c4a0a4','#9aab9a','#8fa8b8','#c4b8a8','#a99ab8',
  '#b89a8a','#8aa8a0','#b0a8a0','#c49aa0','#a0a88a',
];
function getColor(n) {
  const lower = n.toLowerCase();
  for (const [k, v] of Object.entries(websiteColors)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  // Fallback: hash-based color for any domain
  let hash = 0;
  for (let i = 0; i < lower.length; i++) { hash = ((hash << 5) - hash) + lower.charCodeAt(i); hash |= 0; }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}
function getInitial(n) { return n.trim()[0]?.toUpperCase() || '?'; }
function pad(n) { return String(n).padStart(2, '0'); }
function l12(h) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${pad(h === 0 ? 12 : h > 12 ? h - 12 : h)}:00 ${ampm}`;
}
function formatTime(d) {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${pad(h === 0 ? 12 : h > 12 ? h - 12 : h)}:${pad(m)} ${ampm}`;
}
function formatDateSep(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  if (diff <= 1) return diff === 0
    ? `今天 · ${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`
    : `昨天 · ${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
}
function groupByDate(items) {
  const map = {};
  items.forEach(i => {
    const key = `${i.dt.getFullYear()}-${i.dt.getMonth()}-${i.dt.getDate()}`;
    if (!map[key]) map[key] = { date: new Date(i.dt.getFullYear(), i.dt.getMonth(), i.dt.getDate()), items: [] };
    map[key].items.push(i);
  });
  return Object.values(map).sort((a, b) => b.date - a.date);
}

// ===== Favicon Lazy Load (Chrome native API) =====

async function loadFavicon(pageUrl, el) {
  if (!pageUrl || !el) return;
  try {
    const iconUrl = await chrome.favicon.getFavicon({ pageUrl, size: 16 });
    if (!iconUrl) return;
    el.style.background = `url("${iconUrl}") center/contain no-repeat, ${getComputedStyle(el).backgroundColor || '#9ca3af'}`;
    el.textContent = '';
  } catch {
    // Keep colored initial as fallback
  }
}

// Batch load favicons for visible cards
function loadCardFavicons() {
  const cards = document.querySelectorAll('.favicon-color');
  const queue = [];
  cards.forEach(el => {
    const wrapper = el.closest('.card-wrapper');
    if (wrapper && wrapper.dataset.url) {
      // Skip if already loaded (no text content = favicon applied)
      if (el.textContent === '') return;
      queue.push({ el, url: wrapper.dataset.url });
    }
  });
  if (queue.length === 0) return;
  let i = 0;
  const batchSize = 5;
  function processBatch() {
    const batch = queue.slice(i, i + batchSize);
    if (batch.length === 0) return;
    batch.forEach(({ url, el }) => loadFavicon(url, el));
    i += batchSize;
    setTimeout(processBatch, 80);
  }
  setTimeout(processBatch, 300);
}

// ===== Calendar =====
function renderCalendar() {
  if (!calYear) { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); }
  const dim = new Date(calYear, calMonth + 1, 0).getDate();
  const first = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();
  let html = '', row = '<tr>';
  for (let i = 0; i < first; i++) row += '<td></td>';
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(calYear, calMonth, d);
    const isT = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d;
    let cls = '';
    if (isT) cls = ' today';
    if (calRangeStart && calRangeEnd) {
      const s = new Date(calRangeStart), e = new Date(calRangeEnd);
      if (dt >= s && dt <= e) {
        cls = ' in-range';
        if (+dt === +s) cls = ' range-start';
        if (+dt === +e) cls = ' range-end';
      }
    } else if (calRangeStart && +dt === +calRangeStart) {
      cls = ' range-start';
    }
    row += `<td class="${cls}" data-day="${d}">${d}</td>`;
    if ((first + d) % 7 === 0 || d === dim) { row += '</tr>'; html += row; row = '<tr>'; }
  }
  document.getElementById('calBody').innerHTML = html;
  document.getElementById('calTitle').textContent = `${calYear}年${calMonth + 1}月`;

  const st = document.getElementById('calTagStart');
  const en = document.getElementById('calTagEnd');
  const se = document.querySelector('.cal-tag-sep');
  const no = document.getElementById('calTagNone');
  const fm = (d) => `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;

  if (calRangeStart && calRangeEnd) {
    document.getElementById('calTagStartText').textContent = fm(calRangeStart);
    document.getElementById('calTagEndText').textContent = fm(calRangeEnd);
    st.classList.remove('hidden'); en.classList.remove('hidden');
    if (se) se.classList.remove('hidden');
    if (no) no.style.display = 'none';
  } else if (calRangeStart) {
    document.getElementById('calTagStartText').textContent = fm(calRangeStart);
    st.classList.remove('hidden'); en.classList.add('hidden');
    if (se) se.classList.add('hidden');
    if (no) no.style.display = 'none';
  } else {
    st.classList.add('hidden'); en.classList.add('hidden');
    if (se) se.classList.add('hidden');
    if (no) no.style.display = '';
  }
}

async function navMonth(d) {
  calMonth += d;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  // 如果翻到未加载的月份，按需拉取
  await ensureMonthData(calYear, calMonth);
  renderCalendar();
  // 如果当前有活跃筛选，重新渲染以包含新数据
  if (filterStart || filterEnd) render(getSearchValue());
  saveState();
}

async function navYear(d) {
  calYear += d;
  // 仅按需拉取当前显示的月份，其他月份等用户翻到再加载
  await ensureMonthData(calYear, calMonth);
  renderCalendar();
  if (filterStart || filterEnd) render(getSearchValue());
  saveState();
}

async function sCalDay(day) {
  const dt = new Date(calYear, calMonth, day);
  // 确保该月数据已加载
  await ensureMonthData(calYear, calMonth);
  if (!calRangeStart) {
    calRangeStart = dt; calRangeEnd = null;
    renderCalendar();
  } else if (!calRangeEnd) {
    if (+dt === +calRangeStart) {
      calRangeEnd = dt;
      renderCalendar();
      applyFilter();
    } else {
      if (dt < calRangeStart) { calRangeEnd = calRangeStart; calRangeStart = dt; }
      else calRangeEnd = dt;
      renderCalendar();
      applyFilter();
    }
  } else {
    calRangeStart = dt; calRangeEnd = null;
    renderCalendar();
  }
}

function applyFilter() {
  if (calRangeStart && calRangeEnd) {
    filterStart = new Date(calRangeStart); filterEnd = new Date(calRangeEnd);
  } else if (calRangeStart) {
    filterStart = new Date(calRangeStart); filterEnd = new Date(calRangeStart);
  } else {
    filterStart = null; filterEnd = null;
  }
  syncQuickButtons();
  render(getSearchValue());
  const fmt = (d) => `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
  if (calRangeStart && calRangeEnd) showFilterTag(`${fmt(calRangeStart)} ~ ${fmt(calRangeEnd)}`);
  else if (calRangeStart) showFilterTag(fmt(calRangeStart));
  else hideFilterTag();
  document.getElementById('calendarPanel').classList.remove('open');
  saveState();
}

function syncQuickButtons() {
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
  if (!filterStart || !filterEnd) return;
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const today = new Date(y, m, d);
  const s = +filterStart, e = +filterEnd;
  if (s === +today && e === +today) { el('[data-filter="today"]')?.classList.add('active'); return; }
  const yd = new Date(today); yd.setDate(yd.getDate() - 1);
  if (s === +yd && e === +yd) { el('[data-filter="yesterday"]')?.classList.add('active'); return; }
  const ws = new Date(today); ws.setDate(ws.getDate() - ((today.getDay() + 6) % 7));
  if (s === +ws && e === +today) { el('[data-filter="week"]')?.classList.add('active'); return; }
  const ms = new Date(y, m, 1);
  if (s === +ms && e === +today) { el('[data-filter="month"]')?.classList.add('active'); return; }
}
const el = (s) => document.querySelector(s);

function removeTag(which) {
  if (which === 'start') {
    if (calRangeEnd) { calRangeStart = calRangeEnd; calRangeEnd = null; }
    else calRangeStart = null;
  } else {
    calRangeEnd = null;
  }
  renderCalendar();
  applyFilter();
  if (!calRangeStart) document.querySelector('.sidebar-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleCalendar() {
  document.getElementById('calendarPanel').classList.toggle('open');
  if (document.getElementById('calendarPanel').classList.contains('open')) renderCalendar();
}

function showFilterTag(text) {
  document.getElementById('filterTagText').textContent = text;
  document.getElementById('filterTagRow').classList.add('show');
}

function hideFilterTag() {
  document.getElementById('filterTagRow').classList.remove('show');
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
}

// ===== Empty State =====
function emptyStateHTML() {
  return '<div class="empty-state">' +
    '<div class="empty-brand">Retrace</div>' +
    '<div class="empty-tagline">回溯足迹</div>' +
    '<div class="empty-icon"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 3"/><path d="M4.5 4.5l2-2M15.5 4.5l-2-2"/></svg></div>' +
    '<div class="empty-title">输入关键词开始搜索</div>' +
    '<div class="empty-desc">或通过<em>日历</em>筛选时间范围</div>' +
    '</div>';
}

// ===== Render =====
const RENDER_LIMIT = 200;

function render(search) {
  const list = document.getElementById('historyList');
  let items = allData;

  if (filterStart && filterEnd) {
    const fs = new Date(filterStart.getFullYear(), filterStart.getMonth(), filterStart.getDate());
    const fe = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), filterEnd.getDate());
    fe.setDate(fe.getDate() + 1);
    items = items.filter(i => i.dt >= fs && i.dt < fe);
  }

  if (search) {
    try { const re = new RegExp(search, 'i'); items = items.filter(i => re.test(i.title) || re.test(i.url)); }
    catch {
      const s = search.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(s) || i.url.toLowerCase().includes(s));
    }
  }

  const groups = groupByDate(items);
  let totalCards = 0, cardCount = 0, limited = false;
  for (const g of groups) { for (const i of g.items) totalCards++; }

  let html = '';
  for (const g of groups) {
    if (cardCount >= RENDER_LIMIT) { limited = true; break; }
    const dk = `${g.date.getFullYear()}-${pad(g.date.getMonth()+1)}-${pad(g.date.getDate())}`;
    html += `<div class="date-sep" data-date="${dk}"><span class="date-label">${formatDateSep(g.date)}</span></div>`;
    const byHour = {};
    g.items.forEach(i => { const h = i.dt.getHours(); if (!byHour[h]) byHour[h] = []; byHour[h].push(i); });
    const hours = Object.keys(byHour).map(Number).sort((a, b) => b - a);
    for (const h of hours) {
      if (cardCount >= RENDER_LIMIT) { limited = true; break; }
      html += `<div class="hour-tick-row"><span class="tick-label">${l12(h)}</span><span class="tick-line"></span></div>`;
      for (const item of byHour[h]) {
        if (cardCount >= RENDER_LIMIT) { limited = true; break; }
        cardCount++;
        const c = getColor(item.domain), init = getInitial(item.domain);
        html += `<div class="card-wrapper" data-title="${item.title}" data-url="${item.url}">
          <div class="history-card">
            <div class="card-favicon">
              <span class="favicon-color" style="background:${c}">${c === '#24292f' ? '<span style="color:#fff">'+init+'</span>' : init}</span>
            </div>
            <div class="card-body">
              <div class="card-body-row">
                <div class="card-title">${item.title}</div>
                <div class="card-time">${formatTime(item.dt)}</div>
                <span class="card-del">X</span>
              </div>
              <div class="card-url">${item.url}</div>
            </div>
          </div>
        </div>`;
      }
      if (limited) break;
    }
    if (limited) break;
  }

  if (limited) {
    const remaining = totalCards - RENDER_LIMIT;
    html += '<div class="load-more-bar" id="loadMoreBar">还有 ' + remaining + ' 条记录 · <span class="load-more-link" id="loadMoreLink">显示全部</span></div>';
  } else if (!html) {
    html = emptyStateHTML();
  }
  list.innerHTML = html;
  updateStickyDate();
  loadCardFavicons();

  const link = document.getElementById('loadMoreLink');
  if (link) link.addEventListener('click', () => renderAll(search));
}

function renderAll(search) {
  const list = document.getElementById('historyList');
  let items = allData;
  if (filterStart && filterEnd) {
    const fs = new Date(filterStart.getFullYear(), filterStart.getMonth(), filterStart.getDate());
    const fe = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), filterEnd.getDate());
    fe.setDate(fe.getDate() + 1);
    items = items.filter(i => i.dt >= fs && i.dt < fe);
  }
  if (search) {
    try { const re = new RegExp(search, 'i'); items = items.filter(i => re.test(i.title) || re.test(i.url)); }
    catch {
      const s = search.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(s) || i.url.toLowerCase().includes(s));
    }
  }
  const groups = groupByDate(items);
  let html = '';
  groups.forEach(g => {
    const dk = `${g.date.getFullYear()}-${pad(g.date.getMonth()+1)}-${pad(g.date.getDate())}`;
    html += `<div class="date-sep" data-date="${dk}"><span class="date-label">${formatDateSep(g.date)}</span></div>`;
    const byHour = {};
    g.items.forEach(i => { const h = i.dt.getHours(); if (!byHour[h]) byHour[h] = []; byHour[h].push(i); });
    const hours = Object.keys(byHour).map(Number).sort((a, b) => b - a);
    hours.forEach(h => {
      html += '<div class="hour-tick-row"><span class="tick-label">'+l12(h)+'</span><span class="tick-line"></span></div>';
      byHour[h].forEach(item => {
        const c = getColor(item.domain), init = getInitial(item.domain);
        html += '<div class="card-wrapper" data-title="'+item.title+'" data-url="'+item.url+'">'+
          '<div class="history-card" style="border-left-color:'+c+'">'+
            '<div class="card-favicon"><span class="favicon-color" style="background:'+c+'">'+
              (c==='#24292f'?'<span style="color:#fff">'+init+'</span>':init)+
            '</span></div>'+
            '<div class="card-body">'+
              '<div class="card-body-row">'+
                '<div class="card-title">'+item.title+'</div>'+
                '<div class="card-time">'+formatTime(item.dt)+'</div>'+
                '<span class="card-del">X</span>'+
              '</div>'+
              '<div class="card-url">'+item.url+'</div>'+
            '</div>'+
          '</div>'+
        '</div>';
      });
    });
  });
  if (!html) {
    html = emptyStateHTML();
  }
  list.innerHTML = html;
  updateStickyDate();
  loadCardFavicons();
}

function handleSearch(v) {
  render(v);
  saveState();
  // Search extension: if no results and we have data older than loaded range, fetch more
  const items = getFilteredItems(v);
  if (items.length === 0 && v && loadedStart) {
    // Try to fetch even older data
    const olderEnd = new Date(loadedStart);
    const olderStart = new Date(olderEnd);
    olderStart.setDate(olderStart.getDate() - 90);
    fetchHistory(olderStart, olderEnd, 5000).then(newItems => {
      if (newItems.length === 0) return;
      const urlMap = new Map();
      allData.forEach(i => { const e = urlMap.get(i.url); if (!e || i.dt > e.dt) urlMap.set(i.url, i); });
      newItems.forEach(i => { const e = urlMap.get(i.url); if (!e || i.dt > e.dt) urlMap.set(i.url, i); });
      allData = Array.from(urlMap.values()).sort((a, b) => b.dt - a.dt);
      if (!loadedStart || olderStart < loadedStart) loadedStart = new Date(olderStart);
      render(v);
      saveState();
    });
  }
}

function getFilteredItems(search) {
  let items = allData;
  if (filterStart && filterEnd) {
    const fs = new Date(filterStart.getFullYear(), filterStart.getMonth(), filterStart.getDate());
    const fe = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), filterEnd.getDate());
    fe.setDate(fe.getDate() + 1);
    items = items.filter(i => i.dt >= fs && i.dt < fe);
  }
  if (search) {
    try { const re = new RegExp(search, 'i'); items = items.filter(i => re.test(i.title) || re.test(i.url)); }
    catch {
      const s = search.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(s) || i.url.toLowerCase().includes(s));
    }
  }
  return items;
}

function openSettings() {
  chrome.tabs.create({ url: 'chrome://history' });
}

function closeSidebar() {
  document.getElementById('sidebarScroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function quickFilter(r) {
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
  el(`[data-filter="${r}"]`)?.classList.add('active');
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const today = new Date(y, m, d);
  let start, end;
  switch (r) {
    case 'today': start = new Date(today); end = new Date(today); break;
    case 'yesterday': start = new Date(today); start.setDate(start.getDate() - 1); end = new Date(start); break;
    case 'week': start=new Date(today); const wd=today.getDay(); start.setDate(start.getDate()-(wd===0?6:wd-1)); end=new Date(today); break;
    case 'month': start = new Date(y, m, 1); end = new Date(today); break;
  }
  calRangeStart = start; calRangeEnd = end;
  filterStart = new Date(start); filterEnd = new Date(end);
  const t = { today: '今天', yesterday: '昨天', week: '本周', month: '本月' };
  showFilterTag(t[r]);

  // 周/月需要全量渲染以确保目标日期在 DOM 中
  if (r === 'week' || r === 'month') {
    renderAll(getSearchValue());
    scrollToDate(start);
  } else {
    render(getSearchValue());
  }

  document.getElementById('calendarPanel').classList.remove('open');
  saveState();
}

function clearFilter() {
  calRangeStart = null; calRangeEnd = null;
  filterStart = null; filterEnd = null;
  hideFilterTag();
  render(getSearchValue());
  saveState();
}

function scrollToDate(targetDate) {
  setTimeout(() => {
    const key = `${targetDate.getFullYear()}-${pad(targetDate.getMonth()+1)}-${pad(targetDate.getDate())}`;
    const sep = document.querySelector(`.date-sep[data-date="${key}"]`);
    if (sep) sep.scrollIntoView({ block: 'start', behavior: 'smooth' });
    else console.log('Retrace: no section found for', key);
  }, 300);
}

function openPage(url) {
  if (!url) return;
  chrome.tabs.create({ url });
}

function deleteCard(el) {
  const wrapper = el.closest('.card-wrapper');
  const title = wrapper?.dataset.title || '该页面';
  const url = wrapper?.dataset.url;
  if (!url) return;

  chrome.history.deleteUrl({ url });

  window._dcStack = window._dcStack || [];
  window._dcStack.push({ w: wrapper, p: wrapper.parentNode, ns: wrapper.nextSibling, t: title });
  wrapper.style.opacity = '0';
  wrapper.style.transform = 'translateX(-12px)';
  setTimeout(() => wrapper.style.display = 'none', 180);

  const t = document.getElementById('toast');
  const cnt = window._dcStack.length;
  document.getElementById('toastText').textContent = `已删除 · ${title}${cnt > 1 ? `（共${cnt}条）` : ''}`;
  t.classList.add('show');
  if (window._tt) clearTimeout(window._tt);
  window._tt = setTimeout(() => { t.classList.remove('show'); window._dcStack = []; }, 3500);
}

function undoDelete() {
  if (!window._dcStack || !window._dcStack.length) return;
  const item = window._dcStack.pop();
  const { w, p, ns, t } = item;
  w.style.display = '';
  w.style.opacity = '';
  w.style.transform = '';
  ns ? p.insertBefore(w, ns) : p.appendChild(w);
  const url = w.dataset.url;
  if (url) chrome.history.addUrl({ url });

  const toast = document.getElementById('toast');
  if (window._tt) clearTimeout(window._tt);

  if (window._dcStack.length > 0) {
    // Still have items — update toast with new count
    const nxt = window._dcStack[window._dcStack.length - 1];
    const cnt = window._dcStack.length;
    document.getElementById('toastText').textContent = `已删除 · ${nxt.t}${cnt > 1 ? `（共${cnt}条）` : ''}`;
    window._tt = setTimeout(() => { toast.classList.remove('show'); window._dcStack = []; }, 3500);
  } else {
    toast.classList.remove('show');
    window._dcStack = [];
  }
}

// ===== Sticky Date Header (JS controlled) =====
let _stickyWidth = null;
function updateStickyDate() {
  const seps = document.querySelectorAll('.date-sep');
  const scrollEl = document.getElementById('sidebarScroll');
  const sticky = document.getElementById('stickyDate');
  if (!seps.length || !scrollEl || !sticky) return;

  const scrollRect = scrollEl.getBoundingClientRect();
  const containerTop = scrollRect.top;

  // Find current date-sep (the last one whose top is at or above scroll container top)
  let current = seps[0];
  for (const s of seps) {
    const r = s.getBoundingClientRect();
    if (r.top <= containerTop + 28) current = s;
    else break;
  }

  // Update label
  const label = current.querySelector('.date-label');
  if (label) document.getElementById('stickyDateLabel').textContent = label.textContent;

  // Show/hide: show when first date-sep has scrolled past the top of the scroll container
  const firstSep = seps[0];
  if (firstSep) {
    const firstRect = firstSep.getBoundingClientRect();
    if (firstRect.top < containerTop) {
      sticky.classList.remove('hidden');
      sticky.classList.add('js-date-fixed');
      // Match width of scroll container
      const w = scrollEl.getBoundingClientRect().width;
      if (w !== _stickyWidth) {
        _stickyWidth = w;
        sticky.style.width = w + 'px';
      }
      sticky.style.top = containerTop + 'px';
    } else {
      sticky.classList.add('hidden');
      sticky.classList.remove('js-date-fixed');
    }
  }
}

// Handle resize for fixed width
window.addEventListener('resize', () => {
  _stickyWidth = null;
  updateStickyDate();
});

// ===== State Persistence =====
function saveState() {
  const state = {
    filterStart: filterStart ? filterStart.toISOString() : null,
    filterEnd: filterEnd ? filterEnd.toISOString() : null,
    searchInput: getSearchValue(),
    calYear,
    calMonth,
  };
  chrome.storage.local.set({ retrace_state: state });
}

// ===== Event Setup (no inline handlers) =====
function setupEvents() {

  // Search input
  const searchInput = document.getElementById('searchInput');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => handleSearch(searchInput.value), 200);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch(searchInput.value);
  });

  // Buttons
  document.getElementById('btnCalendar').addEventListener('click', toggleCalendar);
  document.getElementById('btnSettings').addEventListener('click', openSettings);
  document.getElementById('btnClose').addEventListener('click', closeSidebar);
  document.getElementById('btnUndo').addEventListener('click', undoDelete);

  // Filter tag clear
  document.getElementById('filterTagX').addEventListener('click', clearFilter);

  // Calendar nav
  document.getElementById('calPrev').addEventListener('click', () => navMonth(-1));
  document.getElementById('calNext').addEventListener('click', () => navMonth(1));
  document.getElementById('calYearPrev').addEventListener('click', () => navYear(-1));
  document.getElementById('calYearNext').addEventListener('click', () => navYear(1));

  // Calendar tag removes
  document.getElementById('calTagStart').addEventListener('click', () => removeTag('start'));
  document.getElementById('calTagEnd').addEventListener('click', () => removeTag('end'));

  // Quick filter delegation
  document.getElementById('quickRow').addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-btn');
    if (btn) quickFilter(btn.dataset.filter);
  });

  // Calendar cell delegation
  document.getElementById('calBody').addEventListener('click', (e) => {
    const td = e.target.closest('td[data-day]');
    if (td) sCalDay(parseInt(td.dataset.day));
  });

  // Card delegation (click = new tab, card-del = delete)
  document.getElementById('historyList').addEventListener('click', (e) => {
    const del = e.target.closest('.card-del');
    if (del) { deleteCard(del); return; }
    const card = e.target.closest('.history-card');
    if (card) {
      const wrapper = card.closest('.card-wrapper');
      openPage(wrapper?.dataset.url);
    }
  });

  // Click outside calendar to close
  document.addEventListener('mousedown', function(e) {
    const panel = document.getElementById('calendarPanel');
    const btn = document.getElementById('btnCalendar');
    if (panel.classList.contains('open') && !panel.contains(e.target) && !btn?.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  // ===== Keyboard Shortcuts =====
  document.addEventListener('keydown', (e) => {
    const searchInput = document.getElementById('searchInput');
    const scrollEl = document.getElementById('sidebarScroll');
    // Ctrl+F or / → focus search
    if ((e.ctrlKey && e.key === 'f') || (!e.ctrlKey && !e.metaKey && e.key === '/' && document.activeElement !== searchInput)) {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
      return;
    }
    // Escape → clear search / close calendar
    if (e.key === 'Escape') {
      if (searchInput?.value) {
        searchInput.value = '';
        handleSearch('');
        searchInput.blur();
        return;
      }
      const cal = document.getElementById('calendarPanel');
      if (cal?.classList.contains('open')) { cal.classList.remove('open'); return; }
    }
    // J / K → scroll
    if (!e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
      if (e.key === 'j') { scrollEl?.scrollBy({ top: 80, behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'k') { scrollEl?.scrollBy({ top: -80, behavior: 'smooth' }); e.preventDefault(); }
    }
    // D → delete focused card (requires card to be hovered/clicked first)
    if (!e.ctrlKey && !e.metaKey && e.key === 'd' && document.activeElement?.tagName !== 'INPUT') {
      const hovered = document.querySelector('.history-card:hover');
      if (hovered) {
        const del = hovered.querySelector('.card-del');
        if (del) { deleteCard(del); e.preventDefault(); }
      }
    }
  });
}

// ===== Onboarding =====
const ONB_STEPS = [
  {
    target: '#searchInput',
    text: '支持正则表达式搜索，例如 <code>github.*repo</code> 可以匹配标题或 URL',
    position: 'bottom'
  },
  {
    target: '#btnCalendar',
    text: '点击选择日期范围，精准筛选某段时间的浏览记录',
    position: 'bottom'
  },
  {
    target: '#historyList',
    text: '鼠标悬停后点击 × 删除，删除后 3.5 秒内可撤销',
    position: 'center',
    emptyText: '暂无历史记录，有浏览记录后可使用删除功能',
    clipToViewport: true
  }
];

let onbStep = 0;

function startOnboarding() {
  onbStep = 0;
  const overlay = document.getElementById('onbOverlay');
  overlay.classList.add('active');
  document.getElementById('onbMask').classList.add('active');
  showOnbStep(0);
}

function showOnbStep(step) {
  const highlight = document.getElementById('onbHighlight');
  const tooltip = document.getElementById('onbTooltip');
  const modal = document.getElementById('onbModal');
  const stepIndicator = document.getElementById('onbStepIndicator');
  const text = document.getElementById('onbText');
  const nextBtn = document.getElementById('onbNext');

  // 隐藏所有 + 清除残留定位样式
  highlight.style.display = 'none';
  tooltip.style.display = 'none';
  modal.classList.remove('active');

  // 恢复上一步被高亮元素的 z-index
  const prevHighlighted = document.querySelectorAll('[style*="z-index: 1001"]');
  prevHighlighted.forEach(el => {
    el.style.position = '';
    el.style.zIndex = '';
  });
  
  // 恢复粘性标题和搜索图标的 z-index
  let stickyDate = document.querySelector('.sticky-date');
  if (stickyDate) stickyDate.style.zIndex = '';
  let searchIcon = document.querySelector('.search-icon');
  if (searchIcon) searchIcon.style.zIndex = '';

  // 重置定位属性，防止上一步残留导致 transition 动画异常
  highlight.style.cssText = 'display:none';
  tooltip.style.cssText = 'display:none';

  if (step >= ONB_STEPS.length) {
    modal.classList.add('active');
    return;
  }

  const s = ONB_STEPS[step];
  const el = document.querySelector(s.target);

  if (!el) {
    completeOnboarding();
    return;
  }

  // 更新步骤指示器
  stepIndicator.textContent = (step + 1) + ' / ' + (ONB_STEPS.length + 1);
  nextBtn.textContent = '下一步';

  // 检查目标是否有内容
  const hasContent = el.children.length > 0;

  if (!hasContent && s.emptyText) {
    tooltip.style.display = '';
    text.innerHTML = s.emptyText;
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.bottom = '';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.width = '';
    tooltip.style.maxWidth = '';
    return;
  }

  // 显示高亮和提示
  highlight.style.display = '';
  tooltip.style.display = '';
  text.innerHTML = s.text;

  // 给被高亮的元素设置更高的 z-index，让它显示在遮罩层之上
  // 如果目标是容器（如 #historyList），只给单个卡片设置 z-index
  if (el.id === 'historyList') {
    const firstCard = el.querySelector('.card-wrapper');
    if (firstCard) {
      firstCard.style.position = 'relative';
      firstCard.style.zIndex = '1001';
    }
  } else {
    el.style.position = 'relative';
    el.style.zIndex = '1001';
  }
  
  // 搜索图标也提升到遮罩之上（第一步需要）
  searchIcon = document.querySelector('.search-icon');
  if (searchIcon) searchIcon.style.zIndex = '1003';

  // 滚动到目标元素
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 定位高亮和提示
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const sidebar = document.querySelector('.sidebar');
      const sidebarScroll = document.getElementById('sidebarScroll');
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };

      // 获取目标元素的 viewport 坐标
      let viewportRect;
      if (s.clipToViewport && sidebarScroll) {
        // Use sidebarScroll as the visible area source AND coordinate reference
        const scrollRect = sidebarScroll.getBoundingClientRect();
        viewportRect = {
          top: scrollRect.top,
          left: scrollRect.left,
          width: scrollRect.width,
          height: scrollRect.height
        };
      } else {
        viewportRect = el.getBoundingClientRect();
      }

      // 转换为 overlay 相对坐标（overlay 是 absolute，基准是 .sidebar）
      const rect = {
        top: viewportRect.top - sidebarRect.top,
        left: viewportRect.left - sidebarRect.left,
        width: viewportRect.width,
        height: viewportRect.height,
        bottom: viewportRect.bottom - sidebarRect.top
      };
      const pad = 6;

      // 高亮定位 — 覆盖可见滚动区域
      highlight.style.top = rect.top + 'px';
      highlight.style.left = rect.left + 'px';
      highlight.style.width = rect.width + 'px';
      highlight.style.height = rect.height + 'px';

      // 气泡定位 — 居中在可见区域
      const tipW = 240;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const tipLeft = Math.max(8, Math.min(centerX - tipW / 2, sidebarRect.width - tipW - 8));
      tooltip.style.left = tipLeft + 'px';
      tooltip.style.width = tipW + 'px';
      tooltip.style.maxWidth = tipW + 'px';

      if (s.position === 'bottom') {
        tooltip.style.top = (rect.bottom + pad + 10) + 'px';
        tooltip.style.bottom = '';
        tooltip.style.transform = '';
      } else if (s.position === 'center') {
        tooltip.style.top = centerY + 'px';
        tooltip.style.bottom = '';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.left = centerX + 'px';
      } else {
        tooltip.style.top = (rect.top - pad - 10) + 'px';
        tooltip.style.bottom = '';
        tooltip.style.transform = 'translateY(-100%)';
      }
    });
  });
}

function nextOnbStep() {
  onbStep++;
  if (onbStep > ONB_STEPS.length) {
    completeOnboarding();
  } else {
    showOnbStep(onbStep);
  }
}

function completeOnboarding() {
  document.getElementById('onbOverlay').classList.remove('active');
  document.getElementById('onbMask').classList.remove('active');
  chrome.storage.local.set({ retrace_onboarding_done: true });
  
  // 恢复被高亮元素的 z-index
  const highlightedElements = document.querySelectorAll('[style*="z-index: 1001"]');
  highlightedElements.forEach(el => {
    el.style.position = '';
    el.style.zIndex = '';
  });
  
  // 恢复粘性标题和搜索图标的 z-index
  const stickyDate = document.querySelector('.sticky-date');
  if (stickyDate) stickyDate.style.zIndex = '';
  const searchIcon = document.querySelector('.search-icon');
  if (searchIcon) searchIcon.style.zIndex = '';
}

function checkOnboarding() {
  chrome.storage.local.get('retrace_onboarding_done', (result) => {
    if (!result.retrace_onboarding_done) {
      setTimeout(() => startOnboarding(), 600);
    }
  });
}

// ===== Init =====
// Notify background that sidebar is open
const _bgPort = chrome.runtime.connect({ name: 'sidebar' });

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();

  // Ensure sidebar has keyboard focus
  document.body.setAttribute('tabindex', '-1');
  document.body.focus();

  setupEvents();

  // Load state first, then fetch history
  chrome.storage.local.get('retrace_state', (result) => {
    const state = result.retrace_state;
    if (state) {
      if (state.filterStart) {
        filterStart = new Date(state.filterStart);
        filterEnd = new Date(state.filterEnd);
        calRangeStart = new Date(state.filterStart);
        calRangeEnd = new Date(state.filterEnd);
      }
      if (state.searchInput) {
        document.getElementById('searchInput').value = state.searchInput;
      }
      if (state.calYear !== undefined) {
        calYear = state.calYear; calMonth = state.calMonth;
      }
    }
    initHistoryData();
  });

  // Scroll listener (debounced)
  let _stickyTimer;
  document.getElementById('sidebarScroll').addEventListener('scroll', function() {
    clearTimeout(_stickyTimer);
    _stickyTimer = setTimeout(updateStickyDate, 80);
  });

  // Onboarding buttons
  document.getElementById('onbNext').addEventListener('click', nextOnbStep);
  document.getElementById('onbSkip').addEventListener('click', completeOnboarding);
  document.getElementById('onbFinish').addEventListener('click', completeOnboarding);
  document.getElementById('stickyHelp').addEventListener('click', startOnboarding);

  // initHistoryData 完成后会自动调用 checkOnboarding
});
