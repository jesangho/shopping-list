const SUPABASE_URL = 'https://fbeaolgabhcykqcpsqcn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BPLytNFG-ralnRGYkEsLKg_58gD9pb8';
const TABLE = 'shopping_list';
const LOCAL_STORAGE_KEY = 'shopping-list';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 순수 함수: 로컬 모드 상태 변환
function addItem(items, text) {
  const trimmed = text.trim();
  if (!trimmed) return items;
  return [...items, { id: Date.now() + Math.random(), text: trimmed, done: false }];
}

function toggleItem(items, id) {
  return items.map((it) => (it.id === id ? { ...it, done: !it.done } : it));
}

function removeItem(items, id) {
  return items.filter((it) => it.id !== id);
}

// 로컬 저장소: 서버에 연결하지 못할 때의 임시 저장 공간
function loadLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLocal(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 저장 불가 환경: 이번 세션에서만 유지
  }
}

// 원격 저장소: Supabase shopping_list 테이블
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

// 로컬에 쌓인 데이터를 DB로 한 번만 이전
async function migrateLocal() {
  const local = loadLocal();
  if (local.length === 0) return;

  const rows = local
    .filter((it) => it && typeof it.text === 'string' && it.text.trim())
    .map((it) => ({ text: it.text.trim(), done: Boolean(it.done) }));
  if (rows.length > 0) {
    const { error } = await db.from(TABLE).insert(rows);
    if (error) throw error;
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // 삭제 불가 환경: 무시
  }
}

// UI
let items = [];
let useLocal = false;

const form = document.getElementById('add-form');
const input = document.getElementById('add-input');
const list = document.getElementById('list');
const empty = document.getElementById('empty');
const status = document.getElementById('status');

function showStatus(message) {
  status.textContent = message;
  status.hidden = false;
}

async function refresh() {
  items = await fetchItems();
  status.hidden = true;
  render();
}

// 로컬 모드: 상태를 바꾸고 저장한다.
function updateLocal(next) {
  items = next;
  saveLocal(items);
  render();
}

// 원격 모드: DB 작업 실행 후 목록을 다시 불러온다. 실패하면 화면에 알린다.
async function runRemote(action) {
  try {
    await action();
    await refresh();
  } catch (err) {
    console.error(err);
    showStatus('서버와 통신하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

function onToggle(it) {
  if (useLocal) updateLocal(toggleItem(items, it.id));
  else runRemote(() => setDone(it.id, !it.done));
}

function onRemove(it) {
  if (useLocal) updateLocal(removeItem(items, it.id));
  else runRemote(() => deleteItem(it.id));
}

function onAdd(value) {
  if (useLocal) updateLocal(addItem(items, value));
  else runRemote(() => insertItem(value));
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
    text.addEventListener('click', () => onToggle(it));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '✕';
    del.setAttribute('aria-label', `${it.text} 삭제`);
    del.addEventListener('click', () => onRemove(it));

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
  onAdd(value);
});

// 시작: DB 연결을 시도하고, 실패하면 이 브라우저에만 임시 저장한다.
async function init() {
  try {
    await migrateLocal();
    await refresh();
  } catch (err) {
    console.error(err);
    useLocal = true;
    items = loadLocal();
    showStatus('서버에 연결하지 못해 이 브라우저에만 임시 저장돼요. 연결되면 자동으로 옮겨져요.');
    render();
  }
}

init();
