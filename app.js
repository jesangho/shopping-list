const SUPABASE_URL = 'https://fbeaolgabhcykqcpsqcn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BPLytNFG-ralnRGYkEsLKg_58gD9pb8';
const TABLE = 'shopping_list';
const LEGACY_STORAGE_KEY = 'shopping-list';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 저장소: Supabase shopping_list 테이블
async function fetchItems() {
  const { data, error } = await db.from(TABLE).select('*').order('created_at').order('id');
  if (error) throw error;
  return data;
}

async function insertItem(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { error } = await db.from(TABLE).insert({ text: trimmed });
  if (error) throw error;
}

async function setDone(id, done) {
  const { error } = await db.from(TABLE).update({ done }).eq('id', id);
  if (error) throw error;
}

async function deleteItem(id) {
  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

// 기존 localStorage 데이터를 한 번만 DB로 이전
async function migrateLegacy() {
  let legacy;
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    return;
  }
  if (!Array.isArray(legacy) || legacy.length === 0) return;

  const rows = legacy
    .filter((it) => it && typeof it.text === 'string' && it.text.trim())
    .map((it) => ({ text: it.text.trim(), done: Boolean(it.done) }));
  if (rows.length > 0) {
    const { error } = await db.from(TABLE).insert(rows);
    if (error) throw error;
  }
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // 삭제 불가 환경: 무시
  }
}

// UI
let items = [];

const form = document.getElementById('add-form');
const input = document.getElementById('add-input');
const list = document.getElementById('list');
const empty = document.getElementById('empty');
const status = document.getElementById('status');

function showError(message) {
  status.textContent = message;
  status.hidden = false;
}

async function refresh() {
  items = await fetchItems();
  status.hidden = true;
  render();
}

// DB 작업 실행 후 목록을 다시 불러온다. 실패하면 화면에 알린다.
async function run(action) {
  try {
    await action();
    await refresh();
  } catch (err) {
    console.error(err);
    showError('서버와 통신하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

function render() {
  list.innerHTML = '';
  for (const it of items) {
    const li = document.createElement('li');
    if (it.done) li.classList.add('done');

    const text = document.createElement('button');
    text.type = 'button';
    text.className = 'text';
    text.textContent = it.text;
    text.addEventListener('click', () => run(() => setDone(it.id, !it.done)));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '✕';
    del.setAttribute('aria-label', `${it.text} 삭제`);
    del.addEventListener('click', () => run(() => deleteItem(it.id)));

    li.append(text, del);
    list.append(li);
  }
  empty.hidden = items.length > 0;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = input.value;
  input.value = '';
  input.focus();
  run(() => insertItem(value));
});

run(migrateLegacy);
