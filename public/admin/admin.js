(function () {
  // ---- tiny utils -----------------------------------------------------
  const $  = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  async function api(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) { location.href = '/admin/login'; return; }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error || ('HTTP ' + res.status));
    return data;
  }

  function fmtDT(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  }
  // Converts ISO to the `YYYY-MM-DDTHH:MM` string <input type="datetime-local"> expects (in local tz).
  function toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(s) {
    if (!s) return null;
    return new Date(s).toISOString();
  }
  function fmtHours(seconds) {
    if (!seconds) return '0.00';
    return (seconds / 3600).toFixed(2);
  }

  // ---- tab switching --------------------------------------------------
  $$('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.dataset.tab;
      $$('.tab-panel').forEach(p => p.hidden = true);
      $('#tab-' + name).hidden = false;
      if (name === 'employees') loadEmployees();
      if (name === 'punches')   loadPunches();
      if (name === 'report')    runReport();
    });
  });

  // ---- employees ------------------------------------------------------
  let employeesCache = [];

  async function loadEmployees() {
    const body = $('#employees-body');
    body.innerHTML = `<tr><td colspan="5" class="empty">Chargement…</td></tr>`;
    try {
      employeesCache = await api('GET', '/admin/api/employees');
      renderEmployees();
      populateEmployeeFilter();
    } catch (e) {
      body.innerHTML = `<tr><td colspan="5" class="empty">${e.message}</td></tr>`;
    }
  }

  function renderEmployees() {
    const body = $('#employees-body');
    if (employeesCache.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="empty">Aucun employé pour le moment.</td></tr>`;
      return;
    }
    body.innerHTML = employeesCache.map(e => `
      <tr data-id="${e.id}">
        <td><code style="font-family:var(--font-mono); font-size:12px;">${escapeHtml(e.employee_code)}</code></td>
        <td>${escapeHtml(e.name)}</td>
        <td>${e.active ? '<span class="pill active">Actif</span>' : '<span class="pill inactive">Inactif</span>'}</td>
        <td class="num">${fmtDT(e.created_at)}</td>
        <td class="row-actions">
          <button class="btn-ghost" data-act="edit">Modifier</button>
          <button class="danger" data-act="del">Supprimer</button>
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('tr').forEach(tr => {
      const id = parseInt(tr.dataset.id, 10);
      tr.querySelector('[data-act="edit"]').addEventListener('click', () => editEmployee(id));
      tr.querySelector('[data-act="del"]').addEventListener('click', () => deleteEmployee(id));
    });
  }

  function populateEmployeeFilter() {
    const sel = $('#f-employee');
    const current = sel.value;
    sel.innerHTML = '<option value="">All</option>' +
      employeesCache.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${escapeHtml(e.employee_code)})</option>`).join('');
    sel.value = current;
  }

  async function addEmployee() {
    await ui.form({
      title: 'Nouvel employé',
      message: 'Ajoutez un employé à la liste.',
      submitLabel: 'Ajouter',
      fields: [
        { name: 'employee_code', label: 'Code employé', type: 'text', required: true, placeholder: '1004', inputmode: 'numeric' },
        { name: 'name',          label: 'Nom complet',  type: 'text', required: true, placeholder: 'Prénom Nom' },
        { name: 'pin',           label: 'NIP',          type: 'password', required: true, placeholder: '4 chiffres ou plus', inputmode: 'numeric' },
      ],
      onSubmit: async (v) => {
        await api('POST', '/admin/api/employees', { ...v, active: true });
      },
    });
    await loadEmployees();
  }

  async function editEmployee(id) {
    const emp = employeesCache.find(e => e.id === id);
    if (!emp) return;
    await ui.form({
      title: `Modifier ${emp.name}`,
      submitLabel: 'Enregistrer',
      fields: [
        { name: 'employee_code', label: 'Code employé', type: 'text', required: true, value: emp.employee_code },
        { name: 'name',          label: 'Nom complet',  type: 'text', required: true, value: emp.name },
        { name: 'pin',           label: 'Nouveau NIP',  type: 'password', placeholder: 'Laisser vide pour conserver', hint: 'Laissez vide pour ne pas changer le NIP actuel.' },
        { name: 'active',        label: 'Actif',        type: 'checkbox', value: emp.active },
      ],
      onSubmit: async (v) => {
        const body = { employee_code: v.employee_code, name: v.name, active: v.active };
        if (v.pin) body.pin = v.pin;
        await api('PUT', '/admin/api/employees/' + id, body);
      },
    });
    await loadEmployees();
  }

  async function deleteEmployee(id) {
    const emp = employeesCache.find(e => e.id === id);
    if (!emp) return;
    const ok = await ui.confirm({
      title: `Supprimer ${emp.name} ?`,
      message: `Tout l'historique de pointages de cet employé sera également supprimé. Cette action est définitive.`,
      okLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api('DELETE', '/admin/api/employees/' + id);
      await loadEmployees();
    } catch (e) {
      await ui.alert({ title: 'Erreur', message: e.message });
    }
  }

  $('#e-new').addEventListener('click', addEmployee);

  // ---- punches --------------------------------------------------------
  async function loadPunches() {
    const body = $('#punches-body');
    body.innerHTML = `<tr><td colspan="7" class="empty">Chargement…</td></tr>`;
    if (employeesCache.length === 0) {
      try { employeesCache = await api('GET', '/admin/api/employees'); populateEmployeeFilter(); } catch {}
    }
    const params = new URLSearchParams();
    if ($('#f-employee').value) params.set('employee_id', $('#f-employee').value);
    if ($('#f-from').value)     params.set('from', $('#f-from').value);
    if ($('#f-to').value)       params.set('to',   $('#f-to').value);
    try {
      const rows = await api('GET', '/admin/api/punches?' + params.toString());
      if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="7" class="empty">Aucun pointage.</td></tr>`;
        return;
      }
      body.innerHTML = rows.map(p => {
        const editedBadge = p.edited_by_employee
          ? ` <span class="pill edited" title="Modifié par l'employé le ${fmtDT(p.edited_at)}&#10;Entrée d'origine : ${fmtDT(p.original_punch_in)}&#10;Sortie d'origine : ${fmtDT(p.original_punch_out)}">modifié</span>`
          : '';
        const openBadge = !p.punch_out ? '<span class="pill live">en cours</span>' : '';
        return `
        <tr data-id="${p.id}">
          <td>${escapeHtml(p.name)}${editedBadge}</td>
          <td><code style="font-family:var(--font-mono); font-size:12px;">${escapeHtml(p.employee_code)}</code></td>
          <td class="num">${fmtDT(p.punch_in)}</td>
          <td class="num">${p.punch_out ? fmtDT(p.punch_out) : openBadge}</td>
          <td class="num">${fmtHours(p.seconds)}</td>
          <td>${escapeHtml(p.note || '')}</td>
          <td class="row-actions">
            <button class="btn-ghost" data-act="edit">Modifier</button>
            <button class="danger" data-act="del">Supprimer</button>
          </td>
        </tr>
      `;
      }).join('');

      body.querySelectorAll('tr').forEach(tr => {
        const id = parseInt(tr.dataset.id, 10);
        const row = rows.find(r => r.id === id);
        tr.querySelector('[data-act="edit"]').addEventListener('click', () => editPunch(row));
        tr.querySelector('[data-act="del"]').addEventListener('click', () => deletePunch(id));
      });
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7" class="empty">${e.message}</td></tr>`;
    }
  }

  async function editPunch(p) {
    await ui.form({
      title: `Modifier le pointage — ${p.name}`,
      submitLabel: 'Enregistrer',
      fields: [
        { name: 'punch_in',  label: 'Entrée',  type: 'datetime-local', required: true, value: toLocalInput(p.punch_in) },
        { name: 'punch_out', label: 'Sortie',  type: 'datetime-local', value: toLocalInput(p.punch_out), hint: 'Laisser vide pour marquer comme en cours.' },
        { name: 'note',      label: 'Note',    type: 'textarea', value: p.note || '' },
      ],
      onSubmit: async (v) => {
        await api('PUT', '/admin/api/punches/' + p.id, {
          punch_in:  fromLocalInput(v.punch_in),
          punch_out: v.punch_out ? fromLocalInput(v.punch_out) : null,
          note:      v.note,
        });
      },
    });
    loadPunches();
  }

  async function newPunch() {
    if (employeesCache.length === 0) {
      try { employeesCache = await api('GET', '/admin/api/employees'); } catch {}
    }
    if (employeesCache.length === 0) {
      return ui.alert({ title: 'Aucun employé', message: 'Créez d\'abord un employé.' });
    }
    await ui.form({
      title: 'Nouveau pointage',
      submitLabel: 'Créer',
      fields: [
        { name: 'employee_id', label: 'Employé', type: 'select', required: true,
          options: employeesCache.map(e => ({ value: e.id, label: `${e.name} — ${e.employee_code}` })) },
        { name: 'punch_in',  label: 'Entrée', type: 'datetime-local', required: true, value: toLocalInput(new Date().toISOString()) },
        { name: 'punch_out', label: 'Sortie', type: 'datetime-local', hint: 'Laisser vide pour un pointage en cours.' },
        { name: 'note',      label: 'Note',   type: 'textarea' },
      ],
      onSubmit: async (v) => {
        await api('POST', '/admin/api/punches', {
          employee_id: parseInt(v.employee_id, 10),
          punch_in:    fromLocalInput(v.punch_in),
          punch_out:   v.punch_out ? fromLocalInput(v.punch_out) : null,
          note:        v.note || null,
        });
      },
    });
    loadPunches();
  }

  async function deletePunch(id) {
    const ok = await ui.confirm({
      title: 'Supprimer ce pointage ?',
      message: 'Cette action est définitive.',
      okLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api('DELETE', '/admin/api/punches/' + id);
      loadPunches();
    } catch (e) {
      await ui.alert({ title: 'Erreur', message: e.message });
    }
  }

  $('#f-apply').addEventListener('click', loadPunches);
  $('#f-clear').addEventListener('click', () => {
    $('#f-employee').value = '';
    $('#f-from').value = '';
    $('#f-to').value = '';
    loadPunches();
  });
  $('#f-export').addEventListener('click', () => {
    const params = new URLSearchParams();
    if ($('#f-employee').value) params.set('employee_id', $('#f-employee').value);
    if ($('#f-from').value)     params.set('from', $('#f-from').value);
    if ($('#f-to').value)       params.set('to',   $('#f-to').value);
    location.href = '/admin/api/export.csv?' + params.toString();
  });
  $('#f-new-punch').addEventListener('click', newPunch);

  // ---- report ---------------------------------------------------------
  async function runReport() {
    const body = $('#report-body');
    body.innerHTML = `<tr><td colspan="4" class="empty">Chargement…</td></tr>`;
    const params = new URLSearchParams();
    if ($('#r-from').value) params.set('from', $('#r-from').value);
    if ($('#r-to').value)   params.set('to',   $('#r-to').value);
    try {
      const rows = await api('GET', '/admin/api/report?' + params.toString());
      if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="empty">Aucune donnée.</td></tr>`;
        return;
      }
      body.innerHTML = rows.map(r => `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td><code style="font-family:var(--font-mono); font-size:12px;">${escapeHtml(r.employee_code)}</code></td>
          <td class="num">${r.punch_count}</td>
          <td class="num">${r.total_hours.toFixed(2)}</td>
        </tr>
      `).join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="4" class="empty">${e.message}</td></tr>`;
    }
  }
  $('#r-apply').addEventListener('click', runReport);
  $('#r-week').addEventListener('click', () => {
    const now = new Date();
    const day = now.getDay(); // 0 Sun ... 6 Sat
    const mondayOffset = (day + 6) % 7;
    const start = new Date(now); start.setDate(now.getDate() - mondayOffset); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    $('#r-from').value = start.toISOString().slice(0, 10);
    $('#r-to').value   = end.toISOString().slice(0, 10);
    runReport();
  });
  $('#r-month').addEventListener('click', () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    $('#r-from').value = start.toISOString().slice(0, 10);
    $('#r-to').value   = end.toISOString().slice(0, 10);
    runReport();
  });

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // initial load
  loadEmployees().then(loadPunches);
})();
