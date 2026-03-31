const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
let currentMonth = null;
let savings = {};

function fmt(n) {
  return n > 0 ? '₱' + Number(n).toLocaleString() : '';
}

function updateTotal() {
  const total = MONTHS.reduce((sum, m) => sum + (Number(savings[m]) || 0), 0);
  document.getElementById('totalAmount').textContent = '₱' + total.toLocaleString();
}

function openModal(month) {
  currentMonth = month;
  document.getElementById('modalTitle').textContent = '💰 ' + month;
  document.getElementById('modalAmount').value = savings[month] || '';
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('modalAmount').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  currentMonth = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function setAmount(amount) {
  document.getElementById('modalAmount').value = amount;
}

function confirmAmount() {
  if (!currentMonth) return;
  const month = currentMonth;
  const val = Number(document.getElementById('modalAmount').value) || 0;
  const year = new URLSearchParams(window.location.search).get('year') || '1';
  savings[month] = val;
  localStorage.setItem('sav_y' + year + '_' + month, val);
  document.getElementById('val-' + month).textContent = fmt(val);
  updateTotal();
  closeModal();
}

window.addEventListener('DOMContentLoaded', () => {
  // Read year from URL param
  const params = new URLSearchParams(window.location.search);
  const year = params.get('year') || '1';
  localStorage.setItem('selected_year', year);

  // Show year in the Year input
  const yearInput = document.getElementById('yearInput');
  if (yearInput) yearInput.value = year;

  // Update page title to show which year
  const titleEl = document.querySelector('.savings-page-year');
  if (titleEl) titleEl.textContent = 'Year ' + year;

  // Load saved values for this year
  MONTHS.forEach(m => {
    const stored = localStorage.getItem('sav_y' + year + '_' + m);
    if (stored) {
      savings[m] = Number(stored);
      document.getElementById('val-' + m).textContent = fmt(Number(stored));
    }
  });
  updateTotal();
});
