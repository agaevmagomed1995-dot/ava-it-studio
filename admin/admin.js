const labels = {
    new: 'Новая',
    contacted: 'Связались',
    working: 'В работе',
    won: 'Сделка',
    lost: 'Отказ',
};

const state = { period: '30', status: 'all', query: '', data: null, selected: null };

const login = document.getElementById('login');
const app = document.getElementById('app');

async function api(url, options) {
    const res = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error('request'), { status: res.status, data });
    return data;
}

function rate(part, whole) {
    if (!whole) return '0%';
    return `${Math.round((part / whole) * 100)}%`;
}

function phoneLink(phone) {
    const digits = phone.replace(/[^\d+]/g, '');
    if (!digits) return '';
    const intl = digits.startsWith('+') ? digits.slice(1) : digits.startsWith('0') ? `971${digits.slice(1)}` : digits;
    return `https://wa.me/${intl}`;
}


function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;',
    }[char]));
}

function render() {
    const data = state.data;
    if (!data) return;
    const stats = data.periods[state.period];
    document.getElementById('stats').innerHTML = [
        ['Уникальные визиты', stats.uniques],
        ['Начали форму', stats.starts],
        ['Заявки', stats.leads],
        ['Конверсия', rate(stats.leads, stats.uniques)],
    ].map(([label, value]) => `<article class="stat"><span>${label}</span><strong>${value}</strong></article>`).join('');

    const max = Math.max(1, ...data.series.map((item) => Math.max(item.uniques, item.leads)));
    document.getElementById('chart').innerHTML = data.series.map((item) => `
        <div class="bar" title="${item.day}: ${item.uniques} визитов, ${item.leads} заявок">
            <i class="visits" style="height:${Math.round((item.uniques / max) * 100)}%"></i>
            <i class="leads" style="height:${Math.round((item.leads / max) * 100)}%"></i>
        </div>`).join('');

    const query = state.query.toLowerCase();
    const leads = data.leads.filter((lead) => {
        const statusOk = state.status === 'all' || lead.status === state.status;
        const text = `${lead.name} ${lead.email} ${lead.phone} ${lead.company}`.toLowerCase();
        return statusOk && text.includes(query);
    });
    document.getElementById('list').innerHTML = leads.length ? leads.map((lead) => `
        <article class="lead ${lead.id === state.selected ? 'on' : ''}" data-id="${lead.id}">
            <div class="lead-top">
                <strong>${esc(lead.name)}</strong>
                <span class="badge ${lead.status}">${labels[lead.status] || lead.status}</span>
            </div>
            <p class="muted">${esc(lead.services || 'Услуга не указана')} · ${new Date(lead.createdAt).toLocaleString('ru')}</p>
        </article>`).join('') : '<p class="muted">Заявок пока нет.</p>';

    const lead = data.leads.find((item) => item.id === state.selected);
    const detail = document.getElementById('detail');
    if (!lead) {
        detail.innerHTML = '<p class="muted">Выберите заявку слева.</p>';
        return;
    }
    const wa = phoneLink(lead.phone || '');
    detail.innerHTML = `
        <h2>${esc(lead.name)}</h2>
        <p class="muted">${new Date(lead.createdAt).toLocaleString('ru')}</p>
        <div class="actions">
            <a href="mailto:${encodeURIComponent(lead.email)}">Написать</a>
            ${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
        <dl>
            <dt>Почта</dt><dd>${esc(lead.email)}</dd>
            <dt>Телефон</dt><dd>${esc(lead.phone || '—')}</dd>
            <dt>Компания</dt><dd>${esc(lead.company || '—')}</dd>
            <dt>Связь</dt><dd>${esc(lead.contact || '—')}</dd>
            <dt>Срок</dt><dd>${esc(lead.timeline || '—')}</dd>
            <dt>Сайт</dt><dd>${esc(lead.website || '—')}</dd>
            <dt>Услуги</dt><dd>${esc(lead.services || '—')}</dd>
        </dl>
        <p>${esc(lead.message || '')}</p>
        <label>Статус
            <select id="status">${Object.entries(labels).map(([key, label]) => `<option value="${key}" ${key === lead.status ? 'selected' : ''}>${label}</option>`).join('')}</select>
        </label>
        <label>Заметка<textarea id="note">${esc(lead.note || '')}</textarea></label>
        <button class="btn" id="save" type="button">Сохранить</button>
        <button class="btn ghost" id="remove" type="button">Удалить</button>`;
    document.getElementById('save').onclick = saveLead;
    document.getElementById('remove').onclick = removeLead;
}

async function removeLead() {
    const id = state.selected;
    if (!id || !confirm('Удалить эту заявку?')) return;
    await api('/api/crm', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) });
    state.data.leads = state.data.leads.filter((item) => item.id !== id);
    state.selected = null;
    render();
}
async function saveLead() {
    const lead = state.data.leads.find((item) => item.id === state.selected);
    const updated = await api('/api/crm', {
        method: 'PATCH',
        body: JSON.stringify({
            id: lead.id,
            status: document.getElementById('status').value,
            note: document.getElementById('note').value,
        }),
    });
    Object.assign(lead, updated.lead);
    render();
}

async function load() {
    state.data = await api('/api/crm');
    app.hidden = false;
    login.hidden = true;
    render();
}

document.getElementById('login-form').onsubmit = async (event) => {
    event.preventDefault();
    document.getElementById('login-error').textContent = '';
    try {
        await api('/api/auth', {
            method: 'POST',
            body: JSON.stringify({ password: event.target.password.value }),
        });
        await load();
    } catch {
        document.getElementById('login-error').textContent = 'Неверный пароль.';
    }
};

document.getElementById('logout').onclick = async () => {
    await api('/api/auth', { method: 'DELETE' });
    app.hidden = true;
    login.hidden = false;
};

document.querySelectorAll('[data-period]').forEach((button) => {
    button.onclick = () => {
        state.period = button.dataset.period;
        document.querySelectorAll('[data-period]').forEach((item) => item.classList.toggle('on', item === button));
        render();
    };
});

document.getElementById('filters').onclick = (event) => {
    const button = event.target.closest('[data-status]');
    if (!button) return;
    state.status = button.dataset.status;
    document.querySelectorAll('[data-status]').forEach((item) => item.classList.toggle('on', item === button));
    render();
};

document.getElementById('list').onclick = (event) => {
    const card = event.target.closest('[data-id]');
    if (!card) return;
    state.selected = card.dataset.id;
    render();
};

document.getElementById('search').oninput = (event) => {
    state.query = event.target.value;
    render();
};

api('/api/auth').then((data) => {
    if (data.ok) return load();
    login.hidden = false;
}).catch(() => {
    login.hidden = false;
});
