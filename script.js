/* Utils */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* Notifications */
function attachNotificationEnable(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        new Notification('💜 Notifications enabled', {
          body: 'You will receive gentle reminders here.',
        });
        btn.textContent = 'Notifications Enabled';
        btn.disabled = true;
      } else {
        alert(
          'Notifications are disabled. Please enable them in your browser settings.'
        );
      }
    } catch (e) {
      alert('Your browser may not support notifications.');
    }
  });
}

function scheduleNotification(dateTime, title, body) {
  const target = new Date(dateTime).getTime();
  const now = Date.now();
  const delay = target - now;
  if (isNaN(target) || delay <= 0) return;
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }, delay);
}

/* Falling hearts background */
function initFallingHearts(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, hearts = [];
  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    hearts = createHearts(35);
  }
  window.addEventListener('resize', resize);
  resize();

  function createHearts(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 6 + Math.random() * 10,
        vy: 0.3 + Math.random() * 0.8,
        vx: -0.3 + Math.random() * 0.6,
        alpha: 0.4 + Math.random() * 0.6,
        hue: 310 + Math.random() * 40,
      });
    }
    return arr;
  }

  function drawHeart(x, y, r, hue, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 10, r / 10);
    ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-10, -10, -20, 10, 0, 20);
    ctx.bezierCurveTo(20, 10, 10, -10, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    hearts.forEach((heart) => {
      heart.y += heart.vy;
      heart.x += heart.vx + Math.sin(heart.y * 0.01) * 0.3;
      if (heart.y > h + 20) heart.y = -20;
      if (heart.x < -20) heart.x = w + 20;
      if (heart.x > w + 20) heart.x = -20;
      drawHeart(heart.x, heart.y, heart.r, heart.hue, heart.alpha);
    });
    requestAnimationFrame(tick);
  }
  tick();
}

/* Period Tracker */
function initTrackerPage() {
  const form = $('#cycleForm');
  if (!form) return;
  const lastStartInput = $('#lastStartDate');
  const avgCycleInput = $('#avgCycleLength');
  const periodLenInput = $('#periodLength');

  const predictionBox = $('#prediction');
  const nextStartEl = $('#nextStart');
  const nextEndEl = $('#nextEnd');
  const daysUntilEl = $('#daysUntil');

  const cyclesList = $('#cyclesList');
  const clearDataBtn = $('#clearDataBtn');
  const remind3Btn = $('#remind3Btn');
  const remind1Btn = $('#remind1Btn');

  const saved = JSON.parse(localStorage.getItem('cycles') || '[]');
  renderCycles(saved);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const lastStart = new Date(lastStartInput.value);
    const avg = parseInt(avgCycleInput.value, 10);
    const len = parseInt(periodLenInput.value, 10);
    if (isNaN(lastStart.getTime()) || !avg || !len) {
      alert('Please fill all fields with valid values.');
      return;
    }
    const nextStart = new Date(lastStart.getTime() + avg * 86400000);
    const nextEnd = new Date(nextStart.getTime() + len * 86400000);
    const daysUntil = Math.max(
      0,
      Math.ceil((nextStart.getTime() - Date.now()) / 86400000)
    );

    nextStartEl.textContent = nextStart.toDateString();
    nextEndEl.textContent = nextEnd.toDateString();
    daysUntilEl.textContent = daysUntil;
    predictionBox.classList.remove('hidden');

    const entry = {
      lastStart: lastStart.toISOString(),
      avgCycle: avg,
      periodLength: len,
      nextStart: nextStart.toISOString(),
      nextEnd: nextEnd.toISOString(),
      createdAt: new Date().toISOString(),
    };
    saved.unshift(entry);
    localStorage.setItem('cycles', JSON.stringify(saved));
    renderCycles(saved);

    // Default reminder: 1 day before
    if (Notification.permission === 'granted') {
      const oneDayBefore = new Date(nextStart.getTime() - 86400000);
      scheduleNotification(
        oneDayBefore,
        'Upcoming period',
        '💖 Your period is expected tomorrow. Take care of yourself.'
      );
    }
  });

  remind3Btn?.addEventListener('click', () => {
    const iso = saved[0]?.nextStart;
    if (!iso) return alert('Add a cycle first.');
    const when = new Date(new Date(iso).getTime() - 3 * 86400000);
    scheduleNotification(when, 'Heads-up', '💜 Your period may start in ~3 days.');
    alert('Reminder scheduled for ~3 days before the expected start.');
  });

  remind1Btn?.addEventListener('click', () => {
    const iso = saved[0]?.nextStart;
    if (!iso) return alert('Add a cycle first.');
    const when = new Date(new Date(iso).getTime() - 86400000);
    scheduleNotification(when, 'Gentle reminder', '🌸 Your period may start tomorrow.');
    alert('Reminder scheduled for ~1 day before the expected start.');
  });

  clearDataBtn?.addEventListener('click', () => {
    if (confirm('Clear all saved cycles?')) {
      localStorage.removeItem('cycles');
      saved.length = 0;
      renderCycles(saved);
      predictionBox.classList.add('hidden');
    }
  });

  function renderCycles(items) {
    cyclesList.innerHTML = '';
    if (!items.length) {
      cyclesList.innerHTML = '<div class="item">No saved cycles yet.</div>';
      return;
    }
    items.slice(0, 6).forEach((c, idx) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <div><strong>Entry ${idx + 1}:</strong> Last start: ${new Date(
        c.lastStart
      ).toDateString()}</div>
        <div>Avg length: ${c.avgCycle} days • Period length: ${
        c.periodLength
      } days</div>
        <div>Next start: ${new Date(c.nextStart).toDateString()} • End: ${new Date(
        c.nextEnd
      ).toDateString()}</div>
      `;
      cyclesList.appendChild(div);
    });
  }
}

/* Accordion */
function initAccordion(id) {
  const root = document.getElementById(id);
  if (!root) return;
  $$('.acc-item', root).forEach((item) => {
    const btn = $('.acc-btn', item);
    btn.addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
}

/* Journal */
function initJournal() {
  const form = $('#journalForm');
  if (!form) return;
  const title = $('#journalTitle');
  const body = $('#journalBody');
  const list = $('#journalList');
  const clearBtn = $('#clearJournalBtn');

  const entries = JSON.parse(localStorage.getItem('journal') || '[]');
  render(entries);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = title.value.trim();
    const b = body.value.trim();
    if (!t && !b) return;
    entries.unshift({ t, b, at: new Date().toISOString() });
    localStorage.setItem('journal', JSON.stringify(entries));
    title.value = '';
    body.value = '';
    render(entries);
  });

  clearBtn?.addEventListener('click', () => {
    if (confirm('Clear all journal entries?')) {
      localStorage.removeItem('journal');
      entries.length = 0;
      render(entries);
    }
  });

  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<div class="item">No entries yet.</div>';
      return;
    }
    items.slice(0, 10).forEach((e) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <div><strong>${e.t || 'Untitled'}</strong> — ${new Date(
        e.at
      ).toLocaleString()}</div>
        <div>${e.b || ''}</div>
      `;
      list.appendChild(div);
    });
  }
}

/* Personal reminders */
function initPersonalReminders() {
  const form = $('#reminderForm');
  if (!form) return;
  const text = $('#reminderText');
  const dt = $('#reminderDateTime');
  const list = $('#remindersList');

  const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
  render(reminders);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = text.value.trim();
    const d = dt.value;
    if (!t || !d) return alert('Please add text and date/time.');
    const entry = { t, d, at: new Date().toISOString() };
    reminders.unshift(entry);
    localStorage.setItem('reminders', JSON.stringify(reminders));
    render(reminders);
    text.value = '';
    dt.value = '';

    if (Notification.permission === 'granted') {
      scheduleNotification(d, '💌 Reminder', t);
      alert('Reminder scheduled. Keep this tab open to ensure delivery.');
    } else {
      alert('Enable notifications to receive alerts.');
    }
  });

  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<div class="item">No reminders yet.</div>';
      return;
    }
    items.slice(0, 10).forEach((r) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <div><strong>${r.t}</strong> — ${new Date(
        r.d
      ).toLocaleString()}</div>
        <div>Added: ${new Date(r.at).toLocaleString()}</div>
      `;
      list.appendChild(div);
    });
  }
}

/* Contact form feedback */
function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;
  const status = $('#contactStatus');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent =
      '💖 Thanks for your message. We’ll review it soon.';
    status.style.color = 'var(--muted)';
    form.reset();
  });
}

/* Initialize everything once DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  attachNotificationEnable('enableNotificationsBtn');
  initFallingHearts('heartsCanvas');
  initTrackerPage();
  initAccordion('faqAccordion');
  initJournal();
  initPersonalReminders();
  initContactForm();
});
