const STORAGE_KEY = 'shopping-list';

// 순수 함수: 상태 변환
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

// 저장소: 읽기/쓰기 실패 시 빈 리스트로 동작
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 저장 불가 환경: 이번 세션에서만 유지
  }
}

// UI
let items = load();

const form = document.getElementById('add-form');
const input = document.getElementById('add-input');
const list = document.getElementById('list');
const empty = document.getElementById('empty');

function update(next) {
  items = next;
  save(items);
  render();
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
    text.addEventListener('click', () => update(toggleItem(items, it.id)));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '✕';
    del.setAttribute('aria-label', `${it.text} 삭제`);
    del.addEventListener('click', () => update(removeItem(items, it.id)));

    li.append(text, del);
    list.append(li);
  }
  empty.hidden = items.length > 0;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  update(addItem(items, input.value));
  input.value = '';
  input.focus();
});

render();
