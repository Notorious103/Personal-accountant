
const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.tab');
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Populate selects
async function refreshSelects() {
  const accts = await DB.getAll('accounts');
  const cats = await DB.getAll('categories');
  const acctSel = document.getElementById('txAccount');
  const catSel = document.getElementById('txCategory');
  acctSel.innerHTML = ''; catSel.innerHTML = '';
  accts.forEach(a => {
    const o = document.createElement('option'); o.value = a.id; o.textContent = a.name;
    acctSel.appendChild(o);
  });
  cats.forEach(c => {
    const o = document.createElement('option'); o.value = c.id; o.textContent = c.name + ' ('+c.type+')';
    catSel.appendChild(o);
  });
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

async function addTransaction(e) {
  e.preventDefault();
  const payload = {
    date: document.getElementById('txDate').value || new Date().toISOString().slice(0,10),
    type: document.getElementById('txType').value,
    accountId: Number(document.getElementById('txAccount').value),
    amount: Number(document.getElementById('txAmount').value),
    categoryId: Number(document.getElementById('txCategory').value),
    asset: document.getElementById('txAsset').value.trim(),
    note: document.getElementById('txNote').value.trim()
  };
  if (!payload.amount || payload.amount <= 0) { alert('Enter a valid amount'); return; }
  await DB.addItem('transactions', payload);
  document.getElementById('txForm').reset();
  await renderLedger();
  await renderReports();
  alert('Saved ✅');
}

async function renderLedger() {
  const tbody = document.querySelector('#ledgerTable tbody');
  const accts = await DB.getAll('accounts');
  const cats = await DB.getAll('categories');
  const mapA = Object.fromEntries(accts.map(a => [a.id, a]));
  const mapC = Object.fromEntries(cats.map(c => [c.id, c]));
  const txs = await DB.getAll('transactions');
  // filters
  const fType = document.getElementById('filterType').value;
  const from = document.getElementById('fromDate').value;
  const to = document.getElementById('toDate').value;
  const filtered = txs.filter(t => {
    if (fType && t.type !== fType) return false;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    return true;
  }).sort((a,b)=> (a.date < b.date ? 1 : -1));
  tbody.innerHTML = '';
  filtered.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.date}</td>
      <td>${t.type.replace('_',' ')}</td>
      <td>${mapA[t.accountId]?.name || ''}</td>
      <td>${mapC[t.categoryId]?.name || ''}</td>
      <td>${t.asset || ''}</td>
      <td>${fmt(t.amount)}</td>
      <td>${t.note||''}</td>
      <td><button class="delete-btn" data-id="${t.id}">🗑</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await DB.deleteItem('transactions', Number(btn.dataset.id));
      await renderLedger();
      await renderReports();
    });
  });
}

async function renderAccounts() {
  const accts = await DB.getAll('accounts');
  const ul = document.getElementById('acctList');
  ul.innerHTML = '';
  accts.forEach(a => {
    const li = document.createElement('li');
    li.textContent = `${a.name} (${a.type})`;
    ul.appendChild(li);
  });
}

async function renderCategories() {
  const cats = await DB.getAll('categories');
  const ul = document.getElementById('catList');
  ul.innerHTML = '';
  cats.forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${c.name} (${c.type})`;
    ul.appendChild(li);
  });
}

// Reports
async function renderReports() {
  const accts = await DB.getAll('accounts');
  const txs = await DB.getAll('transactions');
  // Balances per account (income + sells add, expense + buys subtract; transfers are neutral here)
  const balances = {};
  accts.forEach(a => balances[a.id] = 0);
  txs.forEach(t => {
    if (t.type === 'income' || t.type === 'investment_sell') balances[t.accountId] += t.amount;
    if (t.type === 'expense' || t.type === 'investment_buy') balances[t.accountId] -= t.amount;
    // transfer omitted from net total for simplicity
  });
  const balUl = document.getElementById('balances');
  balUl.innerHTML = '';
  accts.forEach(a => {
    const li = document.createElement('li');
    li.textContent = `${a.name}: ${fmt(balances[a.id]||0)} FCFA`;
    balUl.appendChild(li);
  });
  // Period totals
  const from = document.getElementById('fromDate').value;
  const to = document.getElementById('toDate').value;
  const filtered = txs.filter(t => (!from || t.date >= from) && (!to || t.date <= to));
  const totals = { income:0, expense:0, investment_buy:0, investment_sell:0, transfer:0 };
  filtered.forEach(t => {
    if (totals[t.type] !== undefined) totals[t.type] += t.amount;
  });
  const totUl = document.getElementById('totals');
  totUl.innerHTML = '';
  Object.entries(totals).forEach(([k,v]) => {
    const li = document.createElement('li');
    li.textContent = `${k.replace('_',' ')}: ${fmt(v)} FCFA`;
    totUl.appendChild(li);
  });
  // Net worth (approx: balances sum)
  const net = Object.values(balances).reduce((a,b)=>a+b,0);
  document.getElementById('networth').textContent = fmt(net) + ' FCFA';
}

// Forms
document.getElementById('txForm').addEventListener('submit', addTransaction);
document.getElementById('applyFilters').addEventListener('click', async () => {
  await renderLedger(); await renderReports();
});
document.getElementById('acctForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await DB.addItem('accounts', { name: document.getElementById('acctName').value, type: document.getElementById('acctType').value });
  e.target.reset();
  await refreshSelects(); await renderAccounts();
});
document.getElementById('catForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await DB.addItem('categories', { name: document.getElementById('catName').value, type: document.getElementById('catType').value });
  e.target.reset();
  await refreshSelects(); await renderCategories();
});

// Backup/Restore
document.getElementById('exportBtn').addEventListener('click', async () => {
  const accts = await DB.getAll('accounts');
  const cats = await DB.getAll('categories');
  const txs = await DB.getAll('transactions');
  const data = { accts, cats, txs };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'personal_accountant_backup.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const data = JSON.parse(text);
  // naive import: wipe and write
  const db = await (new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('pa-db');
    req.onsuccess = resolve; req.onerror = resolve; req.onblocked = resolve;
  }));
  await DB.seedDefaults();
  for (const a of data.accts||[]) await DB.addItem('accounts', a);
  for (const c of data.cats||[]) await DB.addItem('categories', c);
  for (const t of data.txs||[]) await DB.addItem('transactions', t);
  await refreshSelects(); await renderAccounts(); await renderCategories(); await renderLedger(); await renderReports();
  alert('Import complete ✅');
});

// Init
(async () => {
  await DB.seedDefaults();
  await refreshSelects();
  await renderAccounts();
  await renderCategories();
  await renderLedger();
  await renderReports();
  document.getElementById('txDate').valueAsDate = new Date();
})();
