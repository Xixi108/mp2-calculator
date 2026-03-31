const stages = [
  { emoji: "🌱", label: "Seed — just getting started!" },
  { emoji: "🌿", label: "Small sprout — keep going!" },
  { emoji: "🌷", label: "Bud — halfway there!" },
  { emoji: "🌸", label: "Blooming — almost there!" },
  { emoji: "🌻", label: "Big sunflower — almost fully matured!" },
  { emoji: "🌟", label: "6 years — fully matured! 🎉" },
];

// Persist state across pages via localStorage
function getState() {
  return {
    year:           Number(localStorage.getItem("sy_year")  || 0),
    balance:        Number(localStorage.getItem("sy_bal")   || 0),
    totalDeposited: Number(localStorage.getItem("sy_dep")   || 0),
    totalDividends: Number(localStorage.getItem("sy_div")   || 0),
  };
}

function saveState(s) {
  localStorage.setItem("sy_year", s.year);
  localStorage.setItem("sy_bal",  s.balance);
  localStorage.setItem("sy_dep",  s.totalDeposited);
  localStorage.setItem("sy_div",  s.totalDividends);
}

function fmt(n) {
  return "₱" + Math.round(n).toLocaleString();
}

// ── Render totals (used on both pages) ──
function renderTotals(s) {
  const dep = document.getElementById("tDeposit");
  const div = document.getElementById("tDividend");
  const tot = document.getElementById("tTotal");
  const box = document.getElementById("totals");
  if (!dep) return;
  dep.textContent = fmt(s.totalDeposited);
  div.textContent = fmt(s.totalDividends);
  tot.textContent = fmt(s.balance);
  if (box) box.style.display = "block";
}

// ── Render plant & year track ──
function renderPlant(s) {
  const plantEl = document.getElementById("plant");
  const labelEl = document.getElementById("stageLabel");
  const yearLbl = document.getElementById("yearLabel");
  if (!plantEl) return;

  const stage = s.year > 0 ? stages[s.year - 1] : { emoji: "🌱", label: "Seed — just getting started!" };
  plantEl.textContent = stage.emoji;
  if (labelEl) labelEl.textContent = stage.label;

  for (let i = 0; i < 6; i++) {
    const dot = document.getElementById("dot" + i);
    if (!dot) continue;
    dot.className = "year-dot";
    if (i < s.year) dot.classList.add("done");
    else if (i === s.year) dot.classList.add("current");
  }

  if (yearLbl) {
    yearLbl.textContent = s.year === 0
      ? "Year 0 of 6"
      : s.year < 6
        ? `Year ${s.year} of 6`
        : "Year 6 of 6 — Complete! 🌟";
  }
}

// ── Year selector (main page) ──
let selectedYear = 1;

function selectYear(y) {
  selectedYear = y;
  document.querySelectorAll('.year-pill').forEach((btn, i) => {
    btn.classList.toggle('active', i + 1 === y);
  });
}

// ── Start Year input ──
function getStartYear() {
  return Number(localStorage.getItem('start_year')) || 0;
}

function calendarYear(y) {
  const start = getStartYear();
  return start > 0 ? start + (y - 1) : null;
}

function updateYearPillLabels() {
  const start = getStartYear();
  for (let y = 1; y <= 6; y++) {
    const pill = document.getElementById('pill' + y);
    if (pill) pill.textContent = start > 0 ? String(start + (y - 1)) : 'Year ' + y;
  }
}

function onStartYearInput() {
  const val = Number(document.getElementById('startYearInput').value);
  if (val >= 2000 && val <= 2100) {
    localStorage.setItem('start_year', val);
  } else {
    localStorage.removeItem('start_year');
  }
  updateYearPillLabels();
}

// ── Year Savings Modal ──
const MONTHS_LIST = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
let modalSavings = {};
let modalCurrentMonth = null;
let modalCurrentYear = 1;

function openYearModal(y) {
  selectYear(y);
  modalCurrentYear = y;
  localStorage.setItem('selected_year', y);
  const cal = calendarYear(y);
  document.getElementById('yearModalTitle').textContent =
    cal ? `Year ${y}  (${cal}) Savings` : `Year ${y} Savings`;

  // Load saved rate for this year
  const rate = localStorage.getItem('sav_y' + y + '_rate') || '';
  document.getElementById('modalRate').value = rate;

  // Load savings for each month
  modalSavings = {};
  MONTHS_LIST.forEach(m => {
    const stored = localStorage.getItem('sav_y' + y + '_' + m);
    modalSavings[m] = stored ? Number(stored) : 0;
  });

  renderModalMonths();
  updateModalTotal();
  document.getElementById('yearModalOverlay').classList.add('open');
}

function closeYearModal() {
  // Save rate
  const rate = document.getElementById('modalRate').value;
  localStorage.setItem('sav_y' + modalCurrentYear + '_rate', rate);
  document.getElementById('yearModalOverlay').classList.remove('open');
  refreshFrontPage();
}

function closeYearModalOutside(e) {
  if (e.target === document.getElementById('yearModalOverlay')) closeYearModal();
}

function saveModalRate() {
  const rate = document.getElementById('modalRate').value;
  localStorage.setItem('sav_y' + modalCurrentYear + '_rate', rate);
  refreshFrontPage();
}

function renderModalMonths() {
  const container = document.getElementById('savingsModalMonths');
  container.innerHTML = '';
  MONTHS_LIST.forEach((m, idx) => {
    const row = document.createElement('div');
    row.className = 'month-row' + (idx === MONTHS_LIST.length - 1 ? ' last-month' : '');
    row.onclick = () => openMonthModal(m);
    const val = modalSavings[m];
    row.innerHTML = `
      <div class="month-label">${m}</div>
      <div class="month-value" id="modal-val-${m}">${val > 0 ? '₱' + val.toLocaleString() : ''}</div>
    `;
    container.appendChild(row);
  });
}

function updateModalTotal() {
  const total = MONTHS_LIST.reduce((sum, m) => sum + (modalSavings[m] || 0), 0);
  document.getElementById('savingsModalTotal').textContent = '₱' + total.toLocaleString();
}

// ── Compute totals from all saved month data across all 5 years ──
function computeFromMonths() {
  let compoundedBalance = 0;
  let totalDeposited = 0;
  let totalAnnualDividends = 0;
  const yearBreakdown = [];

  for (let y = 1; y <= 6; y++) {
    const rate = Number(localStorage.getItem('sav_y' + y + '_rate')) || 0;
    let yearDeposited = 0;

    MONTHS_LIST.forEach(m => {
      yearDeposited += Number(localStorage.getItem('sav_y' + y + '_' + m)) || 0;
    });

    if (yearDeposited === 0) continue;

    // Annual dividend using weighted factor formula:
    // dividend = Σ(deposit_m × (13 - m) / 12) × rate
    // Jan (m=1) = 12/12, Feb (m=2) = 11/12, ... Dec (m=12) = 1/12
    // Only new deposits for this year (no carry-over from prior years).
    let weightedContribution = 0;
    MONTHS_LIST.forEach((month, idx) => {
      const deposit = Number(localStorage.getItem('sav_y' + y + '_' + month)) || 0;
      const weight = (13 - (idx + 1)) / 12;
      weightedContribution += deposit * weight;
    });
    const annualDividend = weightedContribution * (rate / 100);

    // Compounded dividend:
    // Previous balance earns a full year (factor = 1) + new deposits earn weighted factor.
    // At year-end the dividend is added to principal and earns dividends next year.
    const prevBalance = compoundedBalance;
    const compoundedDividend = (prevBalance + weightedContribution) * (rate / 100);
    compoundedBalance = prevBalance + yearDeposited + compoundedDividend;

    totalDeposited += yearDeposited;
    totalAnnualDividends += annualDividend;
    yearBreakdown.push({ year: y, deposited: yearDeposited, annualDividend, compoundedDividend, rate });
  }

  const totalCompoundedDividends = compoundedBalance - totalDeposited;

  return {
    totalDeposited,
    totalAnnualDividends,
    totalCompoundedDividends,
    totalAnnualValue: totalDeposited + totalAnnualDividends,
    totalCompoundedValue: compoundedBalance,
    yearBreakdown,
    year: yearBreakdown.length,
  };
}

// ── Refresh front page plant + totals from computed month data ──
function refreshFrontPage() {
  const s = computeFromMonths();
  const el = id => document.getElementById(id);

  // Summary totals
  if (el('tDeposit'))            el('tDeposit').textContent            = fmt(s.totalDeposited);
  if (el('tDividendAnnual'))     el('tDividendAnnual').textContent     = fmt(s.totalAnnualDividends);
  if (el('tDividendCompounded')) el('tDividendCompounded').textContent = fmt(s.totalCompoundedDividends);
  if (el('tTotalAnnual'))        el('tTotalAnnual').textContent        = fmt(s.totalAnnualValue);
  if (el('tTotalCompounded'))    el('tTotalCompounded').textContent    = fmt(s.totalCompoundedValue);

  // Per-year breakdown
  const breakdown = el('yearBreakdown');
  if (breakdown) {
    if (s.yearBreakdown.length === 0) {
      breakdown.innerHTML = '<div class="breakdown-empty">No savings yet — tap a year to start</div>';
    } else {
      breakdown.innerHTML = s.yearBreakdown.map(yb => `
        <div class="year-card">
          <div class="year-card-header">Year ${yb.year} <span class="year-card-rate">${yb.rate > 0 ? yb.rate + '%' : 'no rate'}</span></div>
          <div class="year-card-row"><span>Deposited</span><span>${fmt(yb.deposited)}</span></div>
          <div class="year-card-row"><span>Dividend (Annual)</span><span>${fmt(yb.annualDividend)}</span></div>
          <div class="year-card-row accent"><span>Dividend (Compounded)</span><span>${fmt(yb.compoundedDividend)}</span></div>
        </div>
      `).join('');
    }
  }

  renderPlant(s);
}

// ── Month Amount Modal (nested) ──
function openMonthModal(month) {
  modalCurrentMonth = month;
  document.getElementById('monthModalTitle').textContent = '💰 ' + month;
  document.getElementById('monthModalAmount').value = modalSavings[month] || '';
  document.getElementById('monthAmountOverlay').classList.add('open');
  setTimeout(() => document.getElementById('monthModalAmount').focus(), 100);
}

function closeMonthModal() {
  document.getElementById('monthAmountOverlay').classList.remove('open');
  modalCurrentMonth = null;
}

function closeMonthModalOutside(e) {
  if (e.target === document.getElementById('monthAmountOverlay')) closeMonthModal();
}

function setMonthAmount(amount) {
  document.getElementById('monthModalAmount').value = amount;
}

function confirmMonthAmount() {
  if (!modalCurrentMonth) return;
  const val = Number(document.getElementById('monthModalAmount').value) || 0;
  modalSavings[modalCurrentMonth] = val;
  localStorage.setItem('sav_y' + modalCurrentYear + '_' + modalCurrentMonth, val);
  const el = document.getElementById('modal-val-' + modalCurrentMonth);
  if (el) el.textContent = val > 0 ? '₱' + val.toLocaleString() : '';
  updateModalTotal();
  closeMonthModal();
  refreshFrontPage();
}

// ── Clear all saved data ──
function clearAll() {
  if (!confirm('Clear all savings data? This cannot be undone.')) return;
  for (let y = 1; y <= 6; y++) {
    MONTHS_LIST.forEach(m => localStorage.removeItem('sav_y' + y + '_' + m));
    localStorage.removeItem('sav_y' + y + '_rate');
  }
  localStorage.removeItem('selected_year');
  localStorage.removeItem('start_year');
  const startInput = document.getElementById('startYearInput');
  if (startInput) startInput.value = '';
  updateYearPillLabels();
  selectYear(1);
  modalCurrentYear = 1;
  refreshFrontPage();
}

// ── On page load: restore state ──
window.addEventListener("DOMContentLoaded", () => {
  // restore start year input
  const startYear = getStartYear();
  const startInput = document.getElementById('startYearInput');
  if (startInput && startYear > 0) startInput.value = startYear;
  updateYearPillLabels();

  // restore last selected year pill
  const lastYear = Number(localStorage.getItem('selected_year') || 1);
  selectYear(lastYear);
  modalCurrentYear = lastYear;

  refreshFrontPage();
});

// ── Savings page: grow one year ──
function addYear() {
  const s = getState();
  if (s.year >= 5) return;

  const monthly = Number(document.getElementById("deposit")?.value) || 0;
  const annualRate = Number(document.getElementById("rate")?.value) || 0;

  if (monthly <= 0) {
    openSavingsModal();
    return;
  }

  const monthlyRate = annualRate / 100 / 12;
  for (let m = 0; m < 12; m++) {
    s.balance += monthly;
    s.totalDeposited += monthly;
    s.balance *= (1 + monthlyRate);
  }
  s.totalDividends = s.balance - s.totalDeposited;
  s.year++;

  saveState(s);

  const plantEl = document.getElementById("plant");
  if (plantEl) {
    const stage = stages[s.year - 1];
    plantEl.textContent = stage.emoji;
    plantEl.classList.add("grow");
    setTimeout(() => plantEl.classList.remove("grow"), 400);
    document.getElementById("stageLabel").textContent = stage.label;
  }

  spawnFloaters(monthly > 0, annualRate);
  renderPlant(s);
  renderTotals(s);
}

function spawnFloaters(hasDeposit, rate) {
  const box = document.getElementById("stageBox");
  if (!box) return;
  const items = [];
  if (hasDeposit) items.push("💰", "💰", "☀️");
  if (rate > 0) items.push("🌧️", "🌧️");

  items.forEach((emoji, i) => {
    const el = document.createElement("span");
    el.className = "floater";
    el.textContent = emoji;
    el.style.left = (20 + Math.random() * 60) + "%";
    el.style.bottom = "10px";
    el.style.animationDelay = (i * 0.15) + "s";
    box.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  });
}

function reset() {
  saveState({ year: 0, balance: 0, totalDeposited: 0, totalDividends: 0 });
  const deposit = document.getElementById("deposit");
  const display = document.getElementById("depositDisplay");
  if (deposit) deposit.value = "";
  if (display) display.textContent = "Tap to add savings";
  renderPlant(getState());
  const box = document.getElementById("totals");
  if (box) box.style.display = "none";
}

// ── Modal ──
function openSavingsModal() {
  const overlay = document.getElementById("modalOverlay");
  if (!overlay) return;
  overlay.classList.add("open");
  setTimeout(() => document.getElementById("deposit")?.focus(), 100);
}

function closeSavingsModal() {
  document.getElementById("modalOverlay")?.classList.remove("open");
}

function closeModal(e) {
  if (e.target === document.getElementById("modalOverlay")) {
    closeSavingsModal();
  }
}

function setAmount(amount) {
  const inp = document.getElementById("deposit");
  if (inp) inp.value = amount;
}

function confirmSavings() {
  const val = Number(document.getElementById("deposit")?.value) || 0;
  const display = document.getElementById("depositDisplay");
  if (display) {
    display.textContent = val > 0 ? "₱" + val.toLocaleString() + " / month" : "Tap to add savings";
  }
  closeSavingsModal();
}
