// =============================================
// Supabase 設定
// =============================================
const SUPABASE_URL = 'https://yfixzwuwmoiysgtqwjcl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaXh6d3V3bW9peXNndHF3amNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTI4NDksImV4cCI6MjA5MDk4ODg0OX0.p8SSO1bO7fvDnbtwbscqeC04x7ck8RMjpu_VpZBkYx4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const GOAL = 10000000;

// =============================================
// ユーティリティ
// =============================================
function formatDate(iso) {
  const d = new Date(iso);
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return mo + '/' + da + ' ' + h + ':' + mi;
}

function getInitial(name) {
  return name.charAt(0) || '？';
}

function escHtml(str) {
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =============================================
// Supabase CRUD
// =============================================
async function loadEntries() {
  var result = await supabaseClient
    .from('entries')
    .select('*')
    .order('date', { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

async function insertEntry(entry) {
  var result = await supabaseClient
    .from('entries')
    .insert([entry]);
  if (result.error) throw result.error;
}

// =============================================
// UI 更新
// =============================================
function updateDatalist(entries) {
  var names = [];
  var contents = [];
  entries.forEach(function(e) {
    if (names.indexOf(e.name) === -1) names.push(e.name);
    if (contents.indexOf(e.content) === -1) contents.push(e.content);
  });

  var nameList = document.getElementById('nameList');
  nameList.innerHTML = names.map(function(n) { return '<option value="' + escHtml(n) + '">'; }).join('');

  var contentList = document.getElementById('contentList');
  contentList.innerHTML = contents.map(function(c) { return '<option value="' + escHtml(c) + '">'; }).join('');
}

function updateUI(entries) {
  updateDatalist(entries);
  var total = 0;
  entries.forEach(function(e) { total += e.amount; });
  var remaining = Math.max(0, GOAL - total);
  var pct = Math.min(100, (total / GOAL) * 100);

  document.getElementById('counterNumber').textContent = '¥' + remaining.toLocaleString();
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct.toFixed(1) + '%';
  document.getElementById('totalAmount').textContent = '¥' + total.toLocaleString();

  var listEl = document.getElementById('historyList');
  if (entries.length === 0) {
    listEl.innerHTML = '<div class="empty-state">まだ売上がありません。<br>最初の一件を追加しましょう！</div>';
    return;
  }

  listEl.innerHTML = '';
  var ul = document.createElement('ul');
  ul.className = 'history-list';
  entries.forEach(function(e) {
    var li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML =
      '<div class="history-avatar">' + getInitial(e.name) + '</div>' +
      '<div class="history-info">' +
        '<div class="history-name">' + escHtml(e.name) + '</div>' +
        '<div class="history-content">' + escHtml(e.content) + '</div>' +
        '<div class="history-date">' + formatDate(e.date) + '</div>' +
      '</div>' +
      '<div class="history-amount">+¥' + Number(e.amount).toLocaleString() + '</div>' +
      '<button class="delete-btn" onclick="deleteEntry(\'' + escHtml(e.id) + '\')">削除</button>';
    ul.appendChild(li);
  });
  listEl.appendChild(ul);
}

function showMsg(text, type) {
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  setTimeout(function() { el.className = 'msg'; }, 3000);
}

// =============================================
// 追加 / 削除
// =============================================
async function addEntry() {
  var name = document.getElementById('inputName').value.trim();
  var content = document.getElementById('inputContent').value.trim();
  var amount = parseInt(document.getElementById('inputAmount').value);

  if (!name) { showMsg('名前を入力してください', 'error'); return; }
  if (!content) { showMsg('内容を入力してください', 'error'); return; }
  if (!amount || amount <= 0) { showMsg('正しい金額を入力してください', 'error'); return; }

  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '追加中...';

  try {
    await insertEntry({ name: name, content: content, amount: amount, date: new Date().toISOString() });
    document.getElementById('inputName').value = '';
    document.getElementById('inputContent').value = '';
    document.getElementById('inputAmount').value = '';
    showMsg('追加しました！', 'success');
    var entries = await loadEntries();
    updateUI(entries);
  } catch (e) {
    console.error(e);
    showMsg('エラーが発生しました', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '追加する';
  }
}

async function deleteEntry(id) {
  if (!confirm('この記録を削除しますか？')) return;
  try {
    var result = await supabaseClient
      .from('entries')
      .delete()
      .eq('id', id);
    if (result.error) throw result.error;
    var entries = await loadEntries();
    updateUI(entries);
  } catch (e) {
    console.error(e);
    alert('削除に失敗しました');
  }
}

// =============================================
// リアルタイム購読（他ユーザーの更新を自動反映）
// =============================================
function setupRealtime() {
  var dot = document.getElementById('realtimeDot');
  supabaseClient
    .channel('entries-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, async function() {
      var entries = await loadEntries();
      updateUI(entries);
    })
    .subscribe(function(status) {
      dot.classList.toggle('connected', status === 'SUBSCRIBED');
    });
}

// =============================================
// 初期化
// =============================================
(async function() {
  try {
    var entries = await loadEntries();
    updateUI(entries);
  } catch (e) {
    document.getElementById('historyList').innerHTML =
      '<div class="empty-state">データ取得に失敗しました。<br>Supabaseの設定を確認してください。<br><small>' + e.message + '</small></div>';
  }
  setupRealtime();
})();
