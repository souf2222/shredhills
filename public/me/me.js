(function () {
  const $ = (s, r = document) => r.querySelector(s);

  // ---- credentials --------------------------------------------------
  // Stored only in sessionStorage (volatile, dies with the tab).
  let CODE = sessionStorage.getItem('me.code') || '';
  let PIN  = sessionStorage.getItem('me.pin')  || '';

  function saveCreds(code, pin) {
    CODE = code; PIN = pin;
    sessionStorage.setItem('me.code', code);
    sessionStorage.setItem('me.pin',  pin);
  }
  function clearCreds() {
    CODE = ''; PIN = '';
    sessionStorage.removeItem('me.code');
    sessionStorage.removeItem('me.pin');
  }

  // ---- API helper ---------------------------------------------------
  async function api(method, path, body) {
    const opts = { method, headers: {} };
    let url = path;
    if (method === 'GET') {
      const u = new URL(path, location.origin);
      u.searchParams.set('code', CODE);
      u.searchParams.set('pin',  PIN);
      url = u.pathname + '?' + u.searchParams.toString();
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify({ code: CODE, pin: PIN, ...(body || {}) });
    }
    const res = await fetch(url, opts);
    if (res.status === 401) { logout(); throw new Error('Code ou NIP invalide.'); }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error || ('HTTP ' + res.status));
    return data;
  }

  // ---- helpers ------------------------------------------------------
  const pad = n => String(n).padStart(2, '0');
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  }
  function toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(s) {
    if (!s) return null;
    return new Date(s).toISOString();
  }
  function fmtHours(seconds) {
    if (!seconds) return '0,00';
    return (seconds / 3600).toFixed(2).replace('.', ',');
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // ---- view switching ----------------------------------------------
  function showLogin() {
    $('#main-panel').hidden = true;
    $('#login-panel').hidden = false;
    setTimeout(() => $('#li-code').focus(), 50);
  }
  function showMain() {
    $('#login-panel').hidden = true;
    $('#main-panel').hidden = false;
  }

  function logout() {
    clearCreds();
    showLogin();
  }
  $('#btn-logout').addEventListener('click', logout);

  // ---- login form --------------------------------------------------
  async function tryLogin() {
    const code = $('#li-code').value.trim();
    const pin  = $('#li-pin').value.trim();
    const msg  = $('#li-msg');
    if (!code || !pin) { msg.textContent = 'Saisissez un code et un NIP.'; msg.style.color = 'var(--red)'; return; }
    msg.textContent = 'Vérification…'; msg.style.color = 'var(--text-secondary)';
    saveCreds(code, pin);
    try {
      await api('GET', '/api/me/summary');
      msg.textContent = '';
      showMain();
      await loadAll();
    } catch (e) {
      clearCreds();
      msg.textContent = e.message || 'Échec de connexion.'; msg.style.color = 'var(--red)';
    }
  }
  $('#li-go').addEventListener('click', tryLogin);
  $('#li-pin').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  $('#li-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#li-pin').focus(); });

  // ---- summary -----------------------------------------------------
  async function loadSummary() {
    const s = await api('GET', '/api/me/summary');
    $('#hello').textContent = `Bienvenue, ${s.employee.name}`;
    $('#hello-sub').textContent = `Code employé · ${s.employee.code}`;
    $('#title-name').textContent = s.employee.name;
    $('#s-week').textContent  = s.weekHours.toFixed(2).replace('.', ',');
    $('#s-month').textContent = s.monthHours.toFixed(2).replace('.', ',');

    const status = $('#s-status');
    const sub    = $('#s-status-sub');
    if (s.clockedIn) {
      const since = new Date(s.since);
      const elapsedMin = Math.floor((Date.now() - since.getTime()) / 60000);
      const h = Math.floor(elapsedMin / 60), m = elapsedMin % 60;
      status.innerHTML = '<span class="pill live">en service</span>';
      sub.textContent = `Depuis ${fmtTime(s.since)} · ${h} h ${pad(m)}`;
    } else {
      status.innerHTML = '<span class="pill inactive">hors service</span>';
      sub.textContent = 'Vous n\'êtes pas pointé en ce moment.';
    }
  }

  // ---- history -----------------------------------------------------
  async function loadHistory() {
    const body = $('#history-body');
    body.innerHTML = `<tr><td colspan="6" class="empty">Chargement…</td></tr>`;
    const params = new URLSearchParams();
    if ($('#f-from').value) params.set('from', $('#f-from').value);
    if ($('#f-to').value)   params.set('to',   $('#f-to').value);
    try {
      const url = '/api/me/history' + (params.toString() ? '?' + params.toString() : '');
      const rows = await api('GET', url);
      if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="empty">Aucun pointage sur cette période.</td></tr>`;
        return;
      }
      body.innerHTML = rows.map(p => {
        const editedBadge = p.edited_by_employee
          ? ` <span class="pill edited" title="Modifié le ${fmtTime(p.edited_at)}&#10;Entrée d'origine : ${fmtTime(p.original_punch_in)}&#10;Sortie d'origine : ${fmtTime(p.original_punch_out)}">modifié</span>`
          : '';
        const openBadge = !p.punch_out
          ? '<span class="pill live">en cours</span>'
          : `<span class="num">${fmtTime(p.punch_out)}</span>`;
        return `
          <tr data-id="${p.id}">
            <td>${fmtDate(p.punch_in)}${editedBadge}</td>
            <td class="num">${fmtTime(p.punch_in)}</td>
            <td>${openBadge}</td>
            <td class="num">${fmtHours(p.seconds)}</td>
            <td>${escapeHtml(p.note || '')}</td>
            <td class="row-actions">
              <button class="btn-ghost" data-act="edit">Modifier</button>
              <button class="danger" data-act="del">Supprimer</button>
            </td>
          </tr>`;
      }).join('');
      body.querySelectorAll('tr').forEach(tr => {
        const id = parseInt(tr.dataset.id, 10);
        const row = rows.find(r => r.id === id);
        tr.querySelector('[data-act="edit"]').addEventListener('click', () => editPunch(row));
        tr.querySelector('[data-act="del"]').addEventListener('click', () => deletePunch(id));
      });
    } catch (e) {
      body.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function editPunch(p) {
    await ui.form({
      title: 'Modifier mon pointage',
      message: 'Cette modification sera marquée comme « modifié par l\'employé ».',
      submitLabel: 'Enregistrer',
      fields: [
        { name: 'punch_in',  label: 'Heure d\'entrée', type: 'datetime-local', required: true, value: toLocalInput(p.punch_in) },
        { name: 'punch_out', label: 'Heure de sortie', type: 'datetime-local', value: toLocalInput(p.punch_out), hint: 'Laisser vide si toujours en service.' },
        { name: 'note',      label: 'Raison de la modification', type: 'textarea', value: p.note || '', placeholder: 'Ex. : oubli de pointage sortie' },
      ],
      onSubmit: async (v) => {
        await api('PUT', '/api/me/punches/' + p.id, {
          punch_in:  fromLocalInput(v.punch_in),
          punch_out: v.punch_out ? fromLocalInput(v.punch_out) : null,
          note:      v.note,
        });
      },
    });
    await loadAll();
  }

  async function deletePunch(id) {
    const ok = await ui.confirm({
      title: 'Supprimer ce pointage ?',
      message: 'Cette action est définitive et sera visible par l\'administrateur.',
      okLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api('DELETE', '/api/me/punches/' + id);
      await loadAll();
    } catch (e) {
      await ui.alert({ title: 'Erreur', message: e.message });
    }
  }

  // ---- toolbar -----------------------------------------------------
  $('#f-apply').addEventListener('click', loadHistory);
  $('#f-clear').addEventListener('click', () => {
    $('#f-from').value = ''; $('#f-to').value = ''; loadHistory();
  });
  $('#f-refresh').addEventListener('click', loadAll);

  async function loadAll() {
    try {
      await loadSummary();
      await loadHistory();
    } catch (e) {
      // already handled (logout on 401)
    }
  }

  // ---- bootstrap ---------------------------------------------------
  if (CODE && PIN) {
    showMain();
    loadAll().catch(() => showLogin());
  } else {
    showLogin();
  }
})();
