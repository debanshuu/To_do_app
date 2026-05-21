// ── STATE ──────────────────────────────────────────────────────────────────
let tasks     = JSON.parse(localStorage.getItem('taskflow_tasks') || '[]');
let filter    = 'all';
let search    = '';
let editingId = null;

// ── DATE DISPLAY ───────────────────────────────────────────────────────────
const now = new Date();
document.getElementById('today-date').textContent =
  now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
document.getElementById('today-day').textContent =
  now.toLocaleDateString('en-US', { weekday: 'long' });

// ── SAVE TO LOCALSTORAGE ───────────────────────────────────────────────────
function save() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

// ── TOAST NOTIFICATION ─────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// ── UPDATE STATS & PROGRESS BAR ────────────────────────────────────────────
function updateStats() {
  const total     = tasks.length;
  const done      = tasks.filter(t => t.done).length;
  const pending   = total - done;
  const todayStr  = new Date().toISOString().slice(0, 10);
  const overdue   = tasks.filter(t => !t.done && t.due && t.due < todayStr).length;

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-overdue').textContent = overdue;

  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
}

// ── GET VISIBLE (FILTERED + SEARCHED) TASKS ────────────────────────────────
function getVisible() {
  return tasks.filter(t => {
    const matchFilter =
      filter === 'all'                              ||
      (filter === 'done'    && t.done)             ||
      (filter === 'pending' && !t.done)            ||
      (filter === 'high'    && t.priority === 'high');

    const matchSearch =
      !search || t.text.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });
}

// ── ESCAPE HTML (XSS PREVENTION) ──────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── RENDER TASK LIST ───────────────────────────────────────────────────────
function render() {
  const list     = document.getElementById('task-list');
  const empty    = document.getElementById('empty-state');
  const visible  = getVisible();
  const todayStr = new Date().toISOString().slice(0, 10);

  list.innerHTML = '';

  if (!visible.length) {
    empty.style.display = 'block';
    updateStats();
    return;
  }

  empty.style.display = 'none';

  visible.forEach(task => {
    const isOverdue = !task.done && task.due && task.due < todayStr;

    // Build the text field or edit input
    const textOrInput = task.id === editingId
      ? `<input class="task-edit-input" id="edit-input-${task.id}"
             value="${task.text.replace(/"/g, '&quot;')}" />`
      : `<span class="task-text">${escHtml(task.text)}</span>`;

    // Format due date for display
    const dueFmt = task.due
      ? new Date(task.due + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        })
      : '';

    // Build save or edit button
    const editOrSaveBtn = task.id === editingId
      ? `<button class="action-btn" data-save="${task.id}" title="Save">💾</button>`
      : `<button class="action-btn" data-edit="${task.id}" title="Edit">✏️</button>`;

    // Build due date tag if present
    const dueTag = task.due
      ? `<span class="tag ${isOverdue ? 'overdue' : 'due'}">
           ${isOverdue ? '⚠ ' : '📅 '}${dueFmt}
         </span>`
      : '';

    // Create the task card element
    const item = document.createElement('div');
    item.className = `task-item p-${task.priority}${task.done ? ' done' : ''}`;
    item.dataset.id = task.id;

    item.innerHTML = `
      <button class="check-btn" data-id="${task.id}" title="Toggle complete">
        <span class="checkmark">✓</span>
      </button>
      <div class="task-body">
        ${textOrInput}
        <div class="task-meta-row">
          <span class="tag ${task.priority}">${task.priority}</span>
          <span class="tag cat">${task.category}</span>
          ${dueTag}
        </div>
      </div>
      <div class="task-actions">
        ${editOrSaveBtn}
        <button class="action-btn del" data-del="${task.id}" title="Delete">🗑</button>
      </div>
    `;

    list.appendChild(item);

    // Auto-focus the edit input if in edit mode
    if (task.id === editingId) {
      const editInput = document.getElementById(`edit-input-${task.id}`);
      if (editInput) { editInput.focus(); editInput.select(); }
    }
  });

  updateStats();
}

// ── ADD TASK ───────────────────────────────────────────────────────────────
function addTask() {
  const input = document.getElementById('task-input');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  const newTask = {
    id:       Date.now().toString(),
    text,
    done:     false,
    priority: document.getElementById('priority-select').value,
    category: document.getElementById('category-select').value,
    due:      document.getElementById('due-date').value,
    created:  new Date().toISOString()
  };

  tasks.unshift(newTask);
  save();

  // Reset input fields
  input.value = '';
  document.getElementById('due-date').value = '';

  render();
  showToast('Task added ✦');
}

// ── TOGGLE TASK COMPLETE ───────────────────────────────────────────────────
function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  save();
  render();
  showToast(task.done ? 'Task completed ✓' : 'Marked pending');
}

// ── DELETE TASK ────────────────────────────────────────────────────────────
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
  showToast('Task deleted');
}

// ── START EDITING ──────────────────────────────────────────────────────────
function startEdit(id) {
  editingId = id;
  render();
}

// ── SAVE EDIT ──────────────────────────────────────────────────────────────
function saveEdit(id) {
  const editInput = document.getElementById(`edit-input-${id}`);
  if (!editInput) return;

  const val = editInput.value.trim();
  if (!val) return;

  const task = tasks.find(t => t.id === id);
  if (task) task.text = val;

  editingId = null;
  save();
  render();
  showToast('Task updated ✦');
}

// ── EVENT DELEGATION — TASK LIST ──────────────────────────────────────────
document.getElementById('task-list').addEventListener('click', e => {
  const delBtn   = e.target.closest('[data-del]');
  const editBtn  = e.target.closest('[data-edit]');
  const saveBtn  = e.target.closest('[data-save]');
  const checkBtn = e.target.closest('[data-id]');

  if (delBtn)  { deleteTask(delBtn.dataset.del);   return; }
  if (editBtn) { startEdit(editBtn.dataset.edit);  return; }
  if (saveBtn) { saveEdit(saveBtn.dataset.save);   return; }

  if (checkBtn && checkBtn.classList.contains('check-btn')) {
    toggleDone(checkBtn.dataset.id);
  }
});

// ── KEYBOARD EVENTS — EDIT INPUT ───────────────────────────────────────────
document.getElementById('task-list').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('task-edit-input')) {
    const id = e.target.id.replace('edit-input-', '');
    saveEdit(id);
  }
  if (e.key === 'Escape') {
    editingId = null;
    render();
  }
});

// ── ADD BUTTON & ENTER KEY ─────────────────────────────────────────────────
document.getElementById('add-btn').addEventListener('click', addTask);
document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// ── FILTER BUTTONS ─────────────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

// ── SEARCH INPUT ───────────────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', e => {
  search = e.target.value;
  render();
});

// ── INITIAL RENDER ─────────────────────────────────────────────────────────
render();
