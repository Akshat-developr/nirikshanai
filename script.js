const BACKEND_URL = '/api/v1';

/* Default fallback project dataset */
let PROJECTS = [
  { id: 'NK-2026-01', name: 'Smart Drainage & Sewerage Network Ph-2', state: 'Maharashtra', district: 'Pune', agency: 'PWD', contractor: 'Apex Infra Ltd', outlay: 42.50, phys: 32.0, fin: 78.0, cost: 18.0, gap: 46.0, bidders: 1, uc: 'Overdue', score: 88, status: 'Under review' },
  { id: 'NK-2026-02', name: 'Inter-District Highway Bypass & Overbridge', state: 'Karnataka', district: 'Mysuru', agency: 'NHAI', contractor: 'Vanguard Buildcon', outlay: 85.00, phys: 45.0, fin: 82.0, cost: 12.0, gap: 37.0, bidders: 1, uc: 'Overdue', score: 82, status: 'Under review' },
  { id: 'NK-2026-03', name: 'Sub-District Multi-Specialty Hospital', state: 'Uttar Pradesh', district: 'Varanasi', agency: 'H&FW', contractor: 'Sunrise Engineering', outlay: 54.00, phys: 22.0, fin: 68.0, cost: 25.0, gap: 46.0, bidders: 1, uc: 'Overdue', score: 91, status: 'Under review' },
  { id: 'NK-2026-04', name: 'Rural Piped Drinking Water Supply Grid', state: 'Rajasthan', district: 'Barmer', agency: 'PHED', contractor: 'Marwar Civil Works', outlay: 31.20, phys: 50.0, fin: 85.0, cost: 8.0, gap: 35.0, bidders: 2, uc: 'Overdue', score: 74, status: 'Under review' },
  { id: 'NK-2026-05', name: 'High-Capacity Grain Silo & Logistics Hub', state: 'Punjab', district: 'Ludhiana', agency: 'FCI', contractor: 'Kisan Infra Logistics', outlay: 62.00, phys: 60.0, fin: 88.0, cost: 5.0, gap: 28.0, bidders: 1, uc: 'Filed', score: 63, status: 'Under review' }
];

let currentLiveId = 'NK-2026-01';

const DIS = {
  'Maharashtra': ['Pune', 'Nashik', 'Nagpur', 'Mumbai'],
  'Karnataka': ['Mysuru', 'Bengaluru', 'Hubballi', 'Belagavi'],
  'Uttar Pradesh': ['Varanasi', 'Lucknow', 'Kanpur', 'Prayagraj'],
  'Rajasthan': ['Barmer', 'Jaipur', 'Jodhpur', 'Kota'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Patiala'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Gujarat': ['Surat', 'Ahmedabad', 'Vadodara'],
  'Himachal Pradesh': ['Mandi', 'Shimla', 'Kangra'],
  'Odisha': ['Mayurbhanj', 'Bhubaneswar', 'Cuttack'],
  'West Bengal': ['Howrah', 'Kolkata', 'Siliguri'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior'],
  'Haryana': ['Panipat', 'Gurugram', 'Faridabad'],
  'Bihar': ['Gaya', 'Patna', 'Muzaffarpur'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode']
};

const SUGGESTIONS = [
  { q: 'NK-2026-01', label: 'Work Code: NK-2026-01', tag: 'Case File' },
  { q: 'High Risk', label: 'High Priority Works', tag: 'Alert' },
  { q: 'Overdue', label: 'Pending UC Submissions', tag: 'Audit' },
  { q: 'Apex Infra Ltd', label: 'Works by Apex Infra Ltd', tag: 'Contractor' },
  { q: 'Maharashtra', label: 'Active Works in Maharashtra', tag: 'State' }
];

let SEARCH_HISTORY = ['NK-2026-01', 'High Risk', 'Apex Infra Ltd'];

const band = s => s >= 70 ? 'High' : s >= 45 ? 'Medium' : 'Low';
const bcol = s => s >= 70 ? 'var(--red)' : s >= 45 ? 'var(--amber)' : 'var(--green)';
const bcls = s => s >= 70 ? 'b-red' : s >= 45 ? 'b-amber' : 'b-green';

/* ---------------- OFFICER AUTHENTICATION ENGINE ---------------- */
let currentOfficer = null;

function getAuthToken() {
  return localStorage.getItem('nirikshanai_jwt_token');
}

function checkStoredSession() {
  const token = getAuthToken();
  const storedUser = localStorage.getItem('nirikshanai_officer_data');
  if (token && storedUser) {
    try {
      currentOfficer = JSON.parse(storedUser);
    } catch (e) {
      logoutOfficer();
      return;
    }
  }
  renderAuthNav();
}

function renderAuthNav() {
  const slot = document.getElementById('authNavSlot');
  if (!slot) return;

  if (currentOfficer) {
    slot.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge b-green" style="font-size:12px;padding:6px 10px">
          ● ${currentOfficer.id} (${currentOfficer.department})
        </span>
        <button class="btn ghost" style="padding:7px 12px;font-size:12px" onclick="logoutOfficer()">Logout</button>
      </div>
    `;
  } else {
    slot.innerHTML = `<button class="btn" onclick="openLoginModal()">Administrative Login</button>`;
  }
}

function openLoginModal() {
  const ov = document.getElementById('authOverlay');
  const err = document.getElementById('authError');
  if (err) err.textContent = '';
  if (ov) {
    ov.classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('auth_id')?.focus(), 100);
  }
}

function closeLoginModal() {
  const ov = document.getElementById('authOverlay');
  if (ov) {
    ov.classList.remove('on');
    document.body.style.overflow = '';
  }
}

async function handleOfficerLogin(e) {
  e.preventDefault();
  const id = document.getElementById('auth_id').value.trim();
  const dept = document.getElementById('auth_dept').value;
  const pin = document.getElementById('auth_pin').value;
  const errBox = document.getElementById('authError');
  const submitBtn = document.getElementById('btnLoginSubmit');

  if (!id || !pin) {
    errBox.textContent = 'Please fill out all credentials.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Validating...';
  errBox.textContent = '';

  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officerId: id, password: pin, department: dept })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Authentication rejected by security gateway');
    }

    localStorage.setItem('nirikshanai_jwt_token', data.token);
    localStorage.setItem('nirikshanai_officer_data', JSON.stringify(data.officer));
    currentOfficer = data.officer;

    closeLoginModal();
    renderAuthNav();
    toast(`Session active: Logged in as ${data.officer.id}`);
  } catch (err) {
    errBox.textContent = err.message || 'Connection to authentication service failed.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Verify & Enter';
  }
}

function logoutOfficer() {
  localStorage.removeItem('nirikshanai_jwt_token');
  localStorage.removeItem('nirikshanai_officer_data');
  currentOfficer = null;
  renderAuthNav();
  toast('Officer session terminated.');
}

/* ---------------- STATE PORTFOLIO CARDS ---------------- */
let currentStatePage = 1;
const STATE_PAGE_SIZE = 3;

function changeStatePage(delta) {
  currentStatePage += delta;
  const val = document.getElementById('stateSearchInput')?.value || '';
  renderStateCards(val, false);
}

function renderStateCards(filterText = '', resetPage = true) {
  if (resetPage) currentStatePage = 1;

  const term = filterText.toLowerCase().trim();
  const stateAgg = {};

  PROJECTS.forEach(p => {
    if (!stateAgg[p.state]) {
      stateAgg[p.state] = { name: p.state, count: 0, outlay: 0, exceptions: 0 };
    }
    stateAgg[p.state].count++;
    stateAgg[p.state].outlay += p.outlay;
    if (p.score >= 70) stateAgg[p.state].exceptions++;
  });

  const stateList = Object.values(stateAgg).filter(s => s.name.toLowerCase().includes(term));
  const grid = document.getElementById('stateGrid');
  const countEl = document.getElementById('stateMatchCount');
  const pageInfo = document.getElementById('statePageInfo');
  const indicator = document.getElementById('statePageIndicator');
  const btnPrev = document.getElementById('btnPrevState');
  const btnNext = document.getElementById('btnNextState');

  const totalStates = stateList.length;
  const totalPages = Math.ceil(totalStates / STATE_PAGE_SIZE) || 1;

  if (currentStatePage > totalPages) currentStatePage = totalPages;
  if (currentStatePage < 1) currentStatePage = 1;

  if (countEl) countEl.textContent = `Total: ${totalStates} Jurisdictions`;
  if (!grid) return;

  if (!totalStates) {
    grid.innerHTML = '<div class="card" style="grid-column: 1 / -1; text-align:center; padding:32px; color:var(--mute)">No State matched your search query.</div>';
    if (pageInfo) pageInfo.textContent = 'Showing 0';
    if (indicator) indicator.textContent = 'Page 0 of 0';
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
    return;
  }

  const startIndex = (currentStatePage - 1) * STATE_PAGE_SIZE;
  const pageSlice = stateList.slice(startIndex, startIndex + STATE_PAGE_SIZE);

  grid.innerHTML = pageSlice.map(s => `
   <div class="card reveal in" style="cursor:pointer" onclick="filterByState('${s.name}')">
      <h3>${s.name}</h3>
      <p style="margin-top:6px"><b>${s.count}</b> Active Works · ₹${s.outlay.toFixed(1)} Cr Allocated</p>
      <div class="foot">
        <span>${s.exceptions} Priority Cases</span>
        <span class="badge ${s.exceptions > 1 ? 'b-red' : s.exceptions === 1 ? 'b-amber' : 'b-green'}">${s.exceptions > 1 ? 'Needs Review' : 'Monitored'}</span>
      </div>
   </div>`).join('');

  const endNum = Math.min(startIndex + STATE_PAGE_SIZE, totalStates);
  if (pageInfo) pageInfo.textContent = `Showing ${startIndex + 1}–${endNum} of ${totalStates} States`;
  if (indicator) indicator.textContent = `Page ${currentStatePage} of ${totalPages}`;
  if (btnPrev) btnPrev.disabled = (currentStatePage === 1);
  if (btnNext) btnNext.disabled = (currentStatePage >= totalPages);
}

function filterStateCards() {
  const val = document.getElementById('stateSearchInput')?.value || '';
  renderStateCards(val, true);
}

/* ---------------- FETCH DATA FROM MYSQL BACKEND ---------------- */
async function fetchProjectsFromBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/projects?limit=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      PROJECTS = result.data.map(p => ({
        ...p,
        outlay: parseFloat(p.outlay) || 0,
        phys: parseFloat(p.phys) || 0,
        fin: parseFloat(p.fin) || 0,
        cost: parseFloat(p.cost) || 0,
        gap: parseFloat(p.gap) || 0,
        score: parseInt(p.score, 10) || 0,
        bidders: parseInt(p.bidders, 10) || 1
      }));
      if (!PROJECTS.some(x => x.id === currentLiveId)) {
        currentLiveId = PROJECTS[0].id;
      }
    }
  } catch (err) {
    console.warn('Notice: Backend not reachable. Using memory cache.', err);
  } finally {
    updateUiWithProjects();
  }
}

function updateUiWithProjects() {
  refreshStateOptions();
  refreshQuickPills();
  renderStateCards('', false);
  renderLiveMonitoring();
  renderTable(false);
  updateHeroStats();
}

function updateHeroStats() {
  const statWorks = document.getElementById('stat_works');
  const statOutlay = document.getElementById('stat_outlay');
  const statFlagged = document.getElementById('stat_flagged');
  const statStates = document.getElementById('stat_states');

  if (statWorks) statWorks.textContent = PROJECTS.length;
  if (statOutlay) {
    const totalOutlay = PROJECTS.reduce((acc, p) => acc + p.outlay, 0);
    statOutlay.textContent = Math.round(totalOutlay);
  }
  if (statFlagged) {
    statFlagged.textContent = PROJECTS.filter(p => p.score >= 70).length;
  }
  if (statStates) {
    statStates.textContent = new Set(PROJECTS.map(p => p.state)).size;
  }
}

function refreshStateOptions() {
  const fs = document.getElementById('fstate');
  if (!fs) return;
  const states = [...new Set(PROJECTS.map(p => p.state))].sort();
  fs.innerHTML = '<option value="">All States &amp; UTs</option>' + states.map(s => `<option value="${s}">${s}</option>`).join('');

  const lps = document.getElementById('liveProjectSelect');
  if (lps) {
    lps.innerHTML = PROJECTS.map(p => `<option value="${p.id}" ${p.id === currentLiveId ? 'selected' : ''}>${p.id} — ${p.name} (${p.district || p.state})</option>`).join('');
  }
}

function refreshQuickPills() {
  const container = document.getElementById('quickPillsContainer');
  if (!container) return;
  const samplePills = PROJECTS.slice(0, 4);
  container.innerHTML = `<span>Quick Select:</span>` + samplePills.map(p => `
    <button class="live-pill ${p.id === currentLiveId ? 'active' : ''}" onclick="switchLiveProject('${p.id}')">${p.id}</button>
  `).join('');
}

/* ---------------- TABLE RENDERING & PAGINATION ---------------- */
let sortKey = 'updated_at', sortDir = -1;
let currentPage = 1;
const PAGE_SIZE = 5;

function sortBy(k) {
  sortDir = (sortKey === k) ? -sortDir : -1;
  sortKey = k;
  renderTable(false);
}

function changePage(delta) {
  currentPage += delta;
  renderTable(false);
}

function renderTable(resetPage = true) {
  if (resetPage) currentPage = 1;

  const fqEl = document.getElementById('fq');
  const fsEl = document.getElementById('fstate');
  const friskEl = document.getElementById('frisk');
  const fstatusEl = document.getElementById('fstatus');
  if (!fqEl || !fsEl || !friskEl || !fstatusEl) return;

  const q = fqEl.value.toLowerCase().trim();
  const st = fsEl.value, rb = friskEl.value, sv = fstatusEl.value;

  let filtered = PROJECTS.filter(p =>
    (!st || p.state === st) &&
    (!rb || band(p.score) === rb) &&
    (!sv || p.status === sv) &&
    (!q || [p.id, p.name, p.agency, p.contractor, p.district, p.state].join(' ').toLowerCase().includes(q))
  );

  filtered.sort((a, b) => {
    const x = a[sortKey] !== undefined ? a[sortKey] : '';
    const y = b[sortKey] !== undefined ? b[sortKey] : '';
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sortDir;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const rowsEl = document.getElementById('rows');
  if (rowsEl) {
    rowsEl.innerHTML = pageRows.length ? pageRows.map(p => `
      <tr onclick="openTwin('${p.id}')">
        <td class="mono"><strong>${p.id}</strong></td>
        <td><b>${p.name}</b><br><small style="color:var(--mute)">${p.district || 'General'} · ${p.agency || 'PWD'}</small></td>
        <td>${p.state}</td>
        <td class="mono">₹${Number(p.outlay).toFixed(1)} Cr</td>
        <td>${p.phys}%<div class="meter"><i style="width:${p.phys}%;background:var(--navy)"></i></div></td>
        <td>${p.fin}%<div class="meter"><i style="width:${p.fin}%;background:var(--red)"></i></div></td>
        <td><span class="score" style="color:${bcol(p.score)}">${p.score}/100</span> <span class="badge ${bcls(p.score)}">${band(p.score)}</span></td>
        <td><span class="badge ${p.status === 'Confirmed' || p.status === 'Escalated' ? 'b-red' : p.status === 'Dismissed' ? 'b-navy' : p.status === 'Resolved' ? 'b-green' : 'b-blue'}">${p.status}</span></td>
      </tr>`).join('') : '<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--mute)">No sanctioned works match the selected filters.</td></tr>';
  }

  const tcountEl = document.getElementById('tcount');
  if (tcountEl) {
    const startNum = filtered.length ? startIndex + 1 : 0;
    const endNum = Math.min(startIndex + PAGE_SIZE, filtered.length);
    tcountEl.textContent = `Showing ${startNum}–${endNum} of ${filtered.length} monitored works`;
  }

  const pageIndicator = document.getElementById('pageIndicator');
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');

  if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  if (btnPrev) btnPrev.disabled = (currentPage === 1);
  if (btnNext) btnNext.disabled = (currentPage >= totalPages);
}

function filterByState(stateName) {
  const fsEl = document.getElementById('fstate');
  if (fsEl) {
    fsEl.value = stateName;
    document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
    renderTable();
  }
}

function filterByStat(type) {
  const friskEl = document.getElementById('frisk');
  const fqEl = document.getElementById('fq');
  const fsEl = document.getElementById('fstate');
  if (!friskEl || !fqEl || !fsEl) return;
  if (type === 'high') {
    friskEl.value = 'High';
  } else {
    friskEl.value = '';
    fqEl.value = '';
    fsEl.value = '';
  }
  document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
  renderTable();
}

/* ---------------- LIVE MONITORING ---------------- */
function renderLiveMonitoring() {
  const p = PROJECTS.find(x => x.id === currentLiveId) || PROJECTS[0];
  const container = document.getElementById('liveMonitorContainer');
  if (!container || !p) return;

  const disbursedAmount = ((p.outlay * p.fin) / 100).toFixed(2);
  const costDevBadge = p.cost > 15 ? `<span class="badge b-red">+${p.cost}% Above Rate</span>` : `<span class="badge b-green">Normal (+${p.cost}%)</span>`;
  const delayBadge = p.score >= 70 ? `<span class="badge b-amber">Audit Hold</span>` : `<span class="badge b-green">On Schedule</span>`;
  const ucBadge = p.uc === 'Overdue' ? `<span class="badge b-red">Payment Paused</span>` : `<span class="badge b-green">Submitted</span>`;

  const finY = Math.round(155 - (p.fin / 100) * 135);
  const physY = Math.round(155 - (p.phys / 100) * 135);

  container.innerHTML = `
    <div class="reveal in">
      <div class="card" style="padding:26px">
        <span class="eyebrow">Active Project Dossier · ${p.id}</span>
        <h3 style="font-size:21px;margin:8px 0 2px">${p.name}</h3>
        <p style="font-size:13px;color:var(--mute)">${p.district || 'Regional Division'} · ${p.state}</p>
        <div class="kv" style="margin:20px 0">
          <div><span>Total Approved Budget</span>₹${p.outlay.toFixed(2)} Cr</div>
          <div><span>Actual Work Finished</span>${p.phys}% (Verified On Site)</div>
          <div><span>Total Money Paid Out</span>${p.fin}% (₹${disbursedAmount} Cr)</div>
          <div><span>Target Finish Date</span>17 Jun 2026</div>
        </div>
        <span class="eyebrow">Warnings Flagged for Officer Review</span>
        <div style="margin-top:10px">
          <div class="sig">
            <span><b>Cost Variance vs Schedule of Rates</b><br><small style="color:var(--mute)">Estimate comparison vs PWD Schedule of Rates</small></span>
            ${costDevBadge}
          </div>
          <div class="sig">
            <span><b>Milestone Timeline Status</b><br><small style="color:var(--mute)">Progress variance against statutory SLA</small></span>
            ${delayBadge}
          </div>
          <div class="sig">
            <span><b>Spending Proof Certificate (UC)</b><br><small style="color:var(--mute)">Compliance status of prior release certificate</small></span>
            ${ucBadge}
          </div>
        </div>
        <div class="foot"><span>Department: ${p.agency}</span><span>Matched With Treasury Records</span></div>
      </div>
    </div>

    <div class="reveal in">
      <div class="card" style="padding:22px">
        <span class="eyebrow">Early Warning Graph</span>
        <h3 style="font-size:17px;margin:6px 0 10px">Money Paid vs. Work Done</h3>
        <svg viewBox="0 0 420 200" style="width:100%;height:auto">
          <g stroke="#eef1f5" stroke-width="1">
            <line x1="40" y1="20" x2="410" y2="20"/><line x1="40" y1="65" x2="410" y2="65"/>
            <line x1="40" y1="110" x2="410" y2="110"/><line x1="40" y1="155" x2="410" y2="155"/>
          </g>
          <polyline points="40,154 120,132 200,98 300,52 400,${finY}" fill="none" stroke="#b42318" stroke-width="2.8"/>
          <polyline points="40,155 120,144 200,126 300,102 400,${physY}" fill="none" stroke="#002449" stroke-width="2.8" stroke-dasharray="5 4"/>
          <text x="8" y="24" font-size="11" fill="#5a6472">100%</text>
          <text x="14" y="159" font-size="11" fill="#5a6472">0%</text>
          <text x="260" y="20" font-size="11" font-weight="600" fill="#b42318">Money Paid: ${p.fin}%</text>
          <text x="240" y="90" font-size="11" font-weight="600" fill="#002449">Verified Work: ${p.phys}%</text>
        </svg>
        <p style="font-size:13px;color:var(--mute);margin-top:12px">Current disbursement gap is <b>${p.gap.toFixed(1)} points</b>. When payments outpace verified physical work by more than 10%, statutory guidelines require holds on subsequent drawdowns.</p>
        <button class="btn" style="margin-top:14px;width:100%" onclick="openTwin('${p.id}')">Inspect Complete Case File (${p.id}) →</button>
      </div>
    </div>
  `;
}

function switchLiveProject(id) {
  currentLiveId = id;
  const lps = document.getElementById('liveProjectSelect');
  if (lps && lps.value !== id) lps.value = id;
  document.querySelectorAll('.live-pill').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === id);
  });
  renderLiveMonitoring();
}

/* ---------------- SIDEBAR SEARCH HISTORY ---------------- */
function renderSidebar() {
  const hList = document.getElementById('historyList');
  if (hList) {
    if (!SEARCH_HISTORY.length) {
      hList.innerHTML = '<span style="font-size:12.5px;color:var(--mute)">No recent searches logged.</span>';
    } else {
      hList.innerHTML = SEARCH_HISTORY.map(item => `
        <button class="item-btn" onclick="executeQuickSearch('${item.replace(/'/g, "\\'")}')">
          <span>${item}</span>
          <span class="tag">Recent</span>
        </button>`).join('');
    }
  }

  const sList = document.getElementById('suggestedList');
  if (sList) {
    sList.innerHTML = SUGGESTIONS.map(s => `
      <button class="item-btn" onclick="executeQuickSearch('${s.q.replace(/'/g, "\\'")}')">
        <span>${s.label}</span>
        <span class="tag">${s.tag}</span>
      </button>`).join('');
  }
}

function clearHistory() {
  SEARCH_HISTORY = [];
  renderSidebar();
}

function executeQuickSearch(val) {
  const qEl = document.getElementById('q');
  if (qEl) {
    qEl.value = val;
    ask();
  }
}

/* ---------------- PERMANENT MYSQL PERSISTENCE ---------------- */
function updateCalcDistricts() {
  const st = document.getElementById('m_state').value;
  const dSelect = document.getElementById('m_district');
  if (!dSelect) return;
  const distList = DIS[st] || ['Central Division', 'Nodal Block'];
  dSelect.innerHTML = distList.map(d => `<option value="${d}">${d}</option>`).join('');
}

function computeManualAuditMetrics() {
  const outlay = parseFloat(document.getElementById('m_outlay').value) || 0;
  const cost = parseFloat(document.getElementById('m_cost').value) || 0;
  const phys = Math.min(100, Math.max(0, parseFloat(document.getElementById('m_phys').value) || 0));
  const fin = Math.min(100, Math.max(0, parseFloat(document.getElementById('m_fin').value) || 0));
  const bidders = parseInt(document.getElementById('m_bidders').value, 10) || 1;
  const uc = document.getElementById('m_uc').value;

  const gap = Math.max(0, fin - phys);
  const unearnedExposure = Math.max(0, (outlay * gap) / 100);

  let score = 12;
  score += gap * 0.95;
  if (cost > 0) score += Math.min(cost, 40) * 0.85;
  if (bidders < 2) score += 12;
  if (uc === 'Overdue') score += 14;
  if (fin > 80 && phys < 40) score += 10;

  score = Math.min(99, Math.max(5, Math.round(score)));
  return { outlay, cost, phys, fin, bidders, uc, gap, unearnedExposure, score };
}

function computeRisk() {
  const res = computeManualAuditMetrics();
  const scoreEl = document.getElementById('res_score');
  const badgeEl = document.getElementById('res_badge');
  const gapEl = document.getElementById('res_gap');
  const expEl = document.getElementById('res_exposure');
  const outEl = document.getElementById('res_outlay');
  const progEl = document.getElementById('res_progress');
  const flagsEl = document.getElementById('res_flags');
  const advEl = document.getElementById('res_advice');

  if (scoreEl) {
    scoreEl.textContent = `${res.score}`;
    scoreEl.style.color = bcol(res.score);
  }
  if (badgeEl) {
    const tierLabel = res.score >= 70 ? 'HIGH RISK' : res.score >= 45 ? 'MEDIUM RISK' : 'LOW RISK';
    badgeEl.innerHTML = `<span class="badge ${bcls(res.score)}" style="font-size:13px;padding:6px 12px">${tierLabel}</span>`;
  }
  if (gapEl) {
    gapEl.innerHTML = `${res.gap.toFixed(1)}% <small style="color:${res.gap > 15 ? 'var(--red)' : 'var(--green)'}">(${res.gap > 15 ? 'Critical Lead' : 'Acceptable'})</small>`;
  }
  if (expEl) {
    expEl.innerHTML = `₹${res.unearnedExposure.toFixed(2)} Cr`;
  }
  if (outEl) {
    outEl.textContent = `₹${res.outlay.toFixed(2)} Cr`;
  }
  if (progEl) {
    progEl.textContent = `Disbursed: ${res.fin}% | Work Done: ${res.phys}%`;
  }

  if (flagsEl) {
    flagsEl.innerHTML = `
      <div class="sig">
        <span><b>Payment vs Work Gap:</b> ${res.gap.toFixed(1)}%</span>
        <span class="badge ${res.gap > 15 ? 'b-red' : 'b-green'}">${res.gap > 15 ? 'High Gap (>15%)' : 'Normal'}</span>
      </div>
      <div class="sig">
        <span><b>Cost Difference vs Govt Rate:</b> ${res.cost > 0 ? '+' : ''}${res.cost}%</span>
        <span class="badge ${res.cost > 15 ? 'b-red' : 'b-green'}">${res.cost > 15 ? 'Exceeds Schedule' : 'Normal Rate'}</span>
      </div>
      <div class="sig">
        <span><b>Tender Competition:</b> ${res.bidders} Bidder(s)</span>
        <span class="badge ${res.bidders < 2 ? 'b-amber' : 'b-green'}">${res.bidders < 2 ? 'Single Bidder' : 'Competitive'}</span>
      </div>
      <div class="sig">
        <span><b>Utilisation Certificate (UC):</b> ${res.uc === 'Overdue' ? 'Pending' : 'Submitted'}</span>
        <span class="badge ${res.uc === 'Overdue' ? 'b-red' : 'b-green'}">${res.uc === 'Overdue' ? 'Release Paused' : 'Compliant'}</span>
      </div>
    `;
  }

  if (advEl) {
    if (res.score >= 70) {
      advEl.innerHTML = `<b>High Risk Finding:</b> Score of <b>${res.score}/100</b> requires technical site inspection prior to clearing further invoices. Unverified release exposure: ₹${res.unearnedExposure.toFixed(2)} Cr.`;
    } else if (res.score >= 45) {
      advEl.innerHTML = `<b>Moderate Risk:</b> Score of <b>${res.score}/100</b> requires verification of latest Measurement Book entries before next drawdown.`;
    } else {
      advEl.innerHTML = `<b>Compliant:</b> Score of <b>${res.score}/100</b> indicates alignment between field progress and treasury disbursements.`;
    }
  }
}

async function appendManualToRegister() {
  const saveBtn = document.getElementById('btnSaveRecord');
  const metrics = computeManualAuditMetrics();
  const id = document.getElementById('m_id').value.trim().toUpperCase() || 'NK-2026-NEW';
  const name = document.getElementById('m_name').value.trim() || 'Sanctioned Development Scheme';
  const state = document.getElementById('m_state').value;
  const district = document.getElementById('m_district').value || 'Central';
  const agency = document.getElementById('m_agency').value;
  const contractor = document.getElementById('m_contractor').value.trim() || 'Apex Infra Ltd';

  const payload = {
    id, name, state, district, agency, contractor,
    outlay: metrics.outlay, phys: metrics.phys, fin: metrics.fin,
    cost: metrics.cost, gap: metrics.gap, bidders: metrics.bidders,
    uc: metrics.uc, score: metrics.score
  };

  saveBtn.disabled = true;
  saveBtn.textContent = 'Writing to Table...';

  try {
    const res = await fetch(`${BACKEND_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Database rejected insertion');

    toast(`✓ Successfully saved ${id} permanently to MySQL!`);

    await fetchProjectsFromBackend();

    const match = id.match(/^(.*?)(\d+)$/);
    if (match) {
      const nextNum = String(parseInt(match[2], 10) + 1).padStart(match[2].length, '0');
      document.getElementById('m_id').value = `${match[1]}${nextNum}`;
    }

    document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('MySQL Persistence Error:', err);
    toast(`⚠️ Persistence Error: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Permanently Save to Database';
  }
}

/* ---------------- DOSSIER MODAL & VERDICT ACTIONS ---------------- */
const ov = document.getElementById('ov'), md = document.getElementById('modal');
function show(html) { if (md && ov) { md.innerHTML = html; ov.classList.add('on'); document.body.style.overflow = 'hidden'; } }
function closeModal() { if (ov) { ov.classList.remove('on'); document.body.style.overflow = ''; } }
document.addEventListener('keydown', e => { 
  if (e.key === 'Escape') {
    closeModal();
    closeLoginModal();
  } 
});

function openTwin(id, tab) {
  const p = PROJECTS.find(x => x.id === id); if (!p) return; tab = tab || 'over';
  const tabs = [['over', 'Dossier Overview'], ['fin', 'Treasury Reconciliation'], ['sig', 'Identified Issues'], ['ver', 'Officer Determination']];
  let body = '';

  if (tab === 'over') body = `
    <div class="kv">
      <div><span>Sanctioned Work</span><b>${p.name}</b></div>
      <div><span>Work Code</span>${p.id}</div>
      <div><span>Administrative Jurisdiction</span>${p.district || 'Main'}, ${p.state}</div>
      <div><span>Implementing Agency</span>${p.agency || 'State Dept'}</div>
      <div><span>Awarded Contractor</span>${p.contractor}</div>
      <div><span>Approved Outlay</span>₹${p.outlay.toFixed(2)} Cr</div>
      <div><span>Physical Progress</span>${p.phys}% Certified</div>
      <div><span>Treasury Releases</span>${p.fin}% (₹${(p.outlay * p.fin / 100).toFixed(2)} Cr)</div>
    </div>
    <div style="margin-top:20px;padding:14px;background:var(--soft);border-radius:8px">
      <p style="font-size:14px"><b>Current Risk Evaluation:</b> <span style="color:${bcol(p.score)};font-weight:700">${p.score}/100 (${band(p.score)} Priority)</span>. ${p.gap > 20 ? 'Disbursements exceed certified physical execution by an elevated margin.' : 'Drawdowns align with verified field execution.'}</p>
    </div>`;

  if (tab === 'fin') body = `
    <div class="kv">
      <div><span>Approved Budget</span>₹${p.outlay.toFixed(2)} Cr</div>
      <div><span>Total Funds Released</span>₹${(p.outlay * p.fin / 100).toFixed(2)} Cr</div>
      <div><span>Certified Work Value</span>₹${(p.outlay * p.phys / 100).toFixed(2)} Cr</div>
      <div><span>Unearned Release Exposure</span>₹${Math.max(0, p.outlay * (p.fin - p.phys) / 100).toFixed(2)} Cr</div>
    </div>
    <p style="margin-top:16px;font-size:13.5px;color:var(--mute)">Allowable variance between releases and verified field progress is 10.0 points. Recorded deviation is <b style="color:${p.gap > 20 ? 'var(--red)' : 'var(--green)'}">${p.gap.toFixed(1)} points</b>.</p>`;

  if (tab === 'sig') body = `
    <div class="sig"><span>Estimated cost vs standard Schedule of Rates</span><span class="badge ${p.cost > 15 ? 'b-red' : 'b-green'}">${p.cost > 0 ? '+' : ''}${p.cost}% Baseline Variance</span></div>
    <div class="sig"><span>Treasury disbursement leading verified work</span><span class="badge ${p.gap > 20 ? 'b-red' : 'b-green'}">${p.gap.toFixed(1)} pts gap</span></div>
    <div class="sig"><span>Number of independent tender bids recorded</span><span class="badge ${p.bidders < 2 ? 'b-amber' : 'b-green'}">${p.bidders} bidder(s)</span></div>
    <div class="sig"><span>Utilisation Certificate compliance</span><span class="badge ${p.uc === 'Overdue' ? 'b-red' : 'b-green'}">${p.uc}</span></div>`;

  if (tab === 'ver') body = `
    <p style="font-size:14px">Official determination record for Work Code <b>${p.id}</b>. Statutory determinations require active officer session credentials.</p>
    <div class="kv" style="margin:16px 0">
      <div><span>Current Case Status</span>${p.status}</div>
      <div><span>District Division</span>${p.district || 'General'}, ${p.state}</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
      <button class="btn red" onclick="verdict('${p.id}','Confirmed')">Confirm Audit Finding</button>
      <button class="btn ghost" onclick="verdict('${p.id}','Dismissed')">Dismiss Exception</button>
      <button class="btn green" onclick="verdict('${p.id}','Resolved')">Mark Resolved</button>
      <button class="btn amber" onclick="verdict('${p.id}','Escalated')">Escalate to Vigilance</button>
    </div>`;

  show(`
    <div class="mhead"><div class="mtop"><div>
      <span class="eyebrow" style="color:rgba(255,255,255,.7)">Departmental Case Docket · ${p.id}</span>
      <h3>${p.name}</h3>
      <p class="sub">${p.district || 'Division'}, ${p.state} · Sanctioned Outlay: ₹${p.outlay.toFixed(2)} Cr</p></div>
      <button class="btn ghost" onclick="closeModal()">Close</button></div></div>
    <div class="tabs">${tabs.map(t => `<button class="tab${t[0] === tab ? ' on' : ''}" onclick="openTwin('${p.id}','${t[0]}')">${t[1]}</button>`).join('')}</div>
    <div class="mbody">${body}</div>
    <div class="mfoot">
      <span class="badge ${bcls(p.score)}">${band(p.score)} Priority</span>
      <span class="badge b-navy">${p.status}</span>
    </div>`);
}

async function verdict(id, v) {
  const token = getAuthToken();
  if (!token) {
    toast('Authentication required to record statutory verdicts.');
    openLoginModal();
    return;
  }

  const p = PROJECTS.find(x => x.id === id); 
  if (!p) return;
  p.status = v;

  try {
    const res = await fetch(`${BACKEND_URL}/projects/${id}/verdict`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        status: v, 
        remarks: `Determination issued via console by ${currentOfficer?.id || 'Officer'}` 
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 401 || res.status === 403) {
        logoutOfficer();
        openLoginModal();
      }
      throw new Error(data.error || 'Failed to update record');
    }

    toast(`Administrative determination logged: ${id} updated to "${v}"`);
    await fetchProjectsFromBackend();
  } catch (err) {
    console.warn('Verdict recording error:', err);
    toast(`Alert: ${err.message}`);
  }

  renderTable(false);
  openTwin(id, 'ver');
}

/* ---------------- SEARCH MODULE ---------------- */
function ask() {
  const qEl = document.getElementById('q');
  const box = document.getElementById('ans');
  if (!qEl || !box) return;
  const raw = qEl.value.trim();
  if (!raw) {
    box.innerHTML = '<p class="typing">Please enter a Work Code, contractor name, or administrative keyword above.</p>';
    return;
  }

  if (!SEARCH_HISTORY.includes(raw)) {
    SEARCH_HISTORY.unshift(raw);
    if (SEARCH_HISTORY.length > 5) SEARCH_HISTORY.pop();
    renderSidebar();
  }

  box.innerHTML = '<p class="typing mono">Interrogating departmental ledgers...</p>';
  setTimeout(() => box.innerHTML = answer(raw), 300);
}

function answer(raw) {
  const q = raw.toLowerCase();
  const shell = (title, body, srcs) => `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px">
      <span class="badge b-green">✓ Department Record Verified</span>
      <span class="mono" style="font-size:11px;color:var(--mute)">Verified at ${new Date().toLocaleTimeString()}</span>
    </div>
    <h3 style="margin:8px 0 10px">${title}</h3>${body}
    <div class="srcs">${srcs.map(s => `<span class="src">${s}</span>`).join('')}</div>`;

  const foundById = PROJECTS.find(p => p.id.toLowerCase().includes(q));
  if (foundById) {
    return shell(`${foundById.id}: ${foundById.name}`, `
      <p style="font-size:14px">Classified under <b style="color:${bcol(foundById.score)}">${band(foundById.score).toUpperCase()} PRIORITY (${foundById.score}/100)</b> in <b>${foundById.district || ''}, ${foundById.state}</b>.</p>
      <div class="kv" style="margin:14px 0">
        <div><span>Sanctioned Outlay</span>₹${foundById.outlay.toFixed(2)} Cr</div>
        <div><span>Certified Work (MB)</span>${foundById.phys}%</div>
        <div><span>Treasury Releases</span>${foundById.fin}%</div>
        <div><span>Utilisation Certificate</span>${foundById.uc}</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
        <button class="btn" onclick="openTwin('${foundById.id}')">Open Full Case File</button>
        <button class="btn ghost" onclick="switchLiveProject('${foundById.id}');document.getElementById('twin').scrollIntoView({behavior:'smooth'})">Load in Live Monitor</button>
      </div>`,
      ['MySQL Sanctions DB', `Sanction Order ${foundById.id}`]);
  }

  if (/contractor|vendor|builder/.test(q)) {
    return shell('Active Contractors in Register', `
      <p style="font-size:14px">Contractors executing currently monitored public works:</p>
      <div style="margin-top:10px">
        ${[...new Set(PROJECTS.map(p => p.contractor))].slice(0, 5).map(c => `<div class="sig"><span><b>${c}</b></span><span class="badge b-navy">Registered</span></div>`).join('')}
      </div>`,
      ['Tender Register', 'Nodal Division']);
  }

  if (/high risk|risk|priority/.test(q)) {
    const high = PROJECTS.filter(p => p.score >= 70);
    return shell('Priority Review Queue', `
      <p style="font-size:14px">Showing high priority projects requiring site review:</p>
      <div style="margin-top:10px">
        ${high.slice(0, 4).map(p => `<div class="sig"><span><b>${p.id}:</b> ${p.name} (${p.state})</span><span class="pts">${p.score}/100</span></div>`).join('')}
      </div>`,
      ['MySQL Central Audit Logs']);
  }

  return shell('Search Result', `
    <p style="font-size:14px">No record matching "<b>${raw.replace(/</g, '&lt;')}</b>" in the active projects. Try searching by project code (such as <b>NK-2026-01</b>) or contractor name.</p>`,
    ['MySQL Master DB']);
}

function toast(m) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), 2800);
}

/* ---------------- INITIALIZATION ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  checkStoredSession();
  renderSidebar();
  updateCalcDistricts();
  computeRisk();

  fetchProjectsFromBackend();

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(e => io.observe(e));
});