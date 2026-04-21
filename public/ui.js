/* =========================================================================
   ui.js — shared modal dialogs (alert / confirm / form) for the timeclock.
   Replaces window.prompt / confirm / alert with properly styled modals.
   ========================================================================= */
(function () {
  if (window.ui) return;

  // Inject styles once
  const css = `
    .ui-backdrop {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0, 0, 0, 0.45);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      animation: ui-fade-in 140ms ease-out;
      -webkit-backdrop-filter: blur(4px);
              backdrop-filter: blur(4px);
    }
    @keyframes ui-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ui-pop-in  {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ui-dialog {
      width: 100%; max-width: 440px;
      background: var(--bg-elevated);
      color: var(--text-primary);
      border: 0.5px solid var(--separator-strong);
      border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.04);
      overflow: hidden;
      animation: ui-pop-in 160ms cubic-bezier(0.32, 0.72, 0, 1);
      font-family: var(--font-body);
    }
    .ui-head {
      padding: 20px 24px 4px;
    }
    .ui-title {
      font-family: var(--font-display);
      font-size: 15px; font-weight: 700;
      letter-spacing: -0.01em;
      margin: 0 0 4px;
    }
    .ui-message {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }
    .ui-body {
      padding: 16px 24px 4px;
      display: grid; gap: 12px;
    }
    .ui-body:empty { display: none; }
    .ui-field { display: block; }
    .ui-field > span {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      letter-spacing: 0.02em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .ui-field > input,
    .ui-field > textarea,
    .ui-field > select {
      width: 100%;
      font-family: inherit;
      font-size: 13px;
      color: var(--text-primary);
      background: var(--bg-input);
      border: 0.5px solid var(--separator-strong);
      border-radius: 6px;
      padding: 8px 10px;
      outline: none;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .ui-field > textarea { resize: vertical; min-height: 60px; }
    .ui-field > input:focus,
    .ui-field > textarea:focus,
    .ui-field > select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 28%, transparent);
    }
    .ui-hint {
      font-size: 11px;
      color: var(--text-tertiary);
      margin: 2px 0 0;
    }
    .ui-actions {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 16px 20px 20px;
      margin-top: 8px;
    }
    .ui-actions button {
      min-width: 88px;
    }
    .ui-error {
      margin: 12px 24px 0;
      padding: 8px 12px;
      border-radius: 6px;
      background: color-mix(in srgb, var(--red) 14%, transparent);
      color: #ff8b80;
      border: 0.5px solid color-mix(in srgb, var(--red) 30%, transparent);
      font-size: 12px;
    }
    .ui-error:empty { display: none; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ------------------------- core helpers ---------------------------
  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class')      el.className = v;
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  // Generic modal. Returns { dialog, close(result), setError(msg) }
  function openDialog({ title, message, body, actions, onKey }) {
    const errEl = h('div', { class: 'ui-error' });
    const actionsEl = h('div', { class: 'ui-actions' }, actions || []);
    const dialog = h('div', { class: 'ui-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' }, [
      h('div', { class: 'ui-head' }, [
        title   ? h('h3', { class: 'ui-title' }, title) : null,
        message ? h('p',  { class: 'ui-message' }, message) : null,
      ]),
      body || h('div', { class: 'ui-body' }),
      errEl,
      actionsEl,
    ]);
    const backdrop = h('div', { class: 'ui-backdrop' }, dialog);

    // Prevent click-through on backdrop from closing — intentional to avoid
    // losing in-progress form data. Users must press Cancel or Escape.
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        const cancelBtn = actionsEl.querySelector('[data-role=cancel]');
        if (cancelBtn) cancelBtn.click();
      }
    });

    let resolver;
    const result = new Promise(r => { resolver = r; });
    const close = (value) => {
      document.removeEventListener('keydown', keyHandler);
      backdrop.remove();
      resolver(value);
    };

    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        const cancelBtn = actionsEl.querySelector('[data-role=cancel]');
        if (cancelBtn) { e.preventDefault(); cancelBtn.click(); }
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        const submitBtn = actionsEl.querySelector('[data-role=submit]');
        if (submitBtn && !e.isComposing) { e.preventDefault(); submitBtn.click(); }
      }
      if (onKey) onKey(e);
    };
    document.addEventListener('keydown', keyHandler);

    document.body.appendChild(backdrop);

    // Focus the first input or the primary button
    setTimeout(() => {
      const firstInput = dialog.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
      else {
        const primary = actionsEl.querySelector('.primary, .danger, [data-role=submit]');
        if (primary) primary.focus();
      }
    }, 20);

    return {
      dialog,
      close,
      result,
      setError: (msg) => { errEl.textContent = msg || ''; },
    };
  }

  // ------------------------- public API ----------------------------

  function alertModal({ title = 'Information', message = '', okLabel = 'OK' } = {}) {
    const ok = h('button', { class: 'primary', 'data-role': 'submit' }, okLabel);
    const modal = openDialog({
      title, message,
      actions: [ok],
    });
    ok.addEventListener('click', () => modal.close(true));
    return modal.result;
  }

  function confirmModal({
    title = 'Confirmer',
    message = '',
    okLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    destructive = false,
  } = {}) {
    const cancel = h('button', { class: 'btn-ghost', 'data-role': 'cancel' }, cancelLabel);
    const ok = h('button', { class: destructive ? 'danger' : 'primary', 'data-role': 'submit' }, okLabel);
    const modal = openDialog({ title, message, actions: [cancel, ok] });
    cancel.addEventListener('click', () => modal.close(false));
    ok.addEventListener('click',     () => modal.close(true));
    return modal.result;
  }

  /**
   * ui.form({
   *   title, message,
   *   fields: [
   *     { name, label, type: 'text'|'password'|'datetime-local'|'textarea'|'select'|'checkbox',
   *       value, placeholder, required, hint, options: [{value,label}] (for select) }
   *   ],
   *   submitLabel, cancelLabel, destructive,
   *   onSubmit: async (values) => { throw new Error('msg') to show inline error }
   * })
   * Resolves with the values object on submit, or null if cancelled.
   */
  function formModal({
    title,
    message,
    fields = [],
    submitLabel = 'Enregistrer',
    cancelLabel = 'Annuler',
    destructive = false,
    onSubmit,
  } = {}) {
    const inputs = {};
    const bodyChildren = fields.map(f => {
      let input;
      if (f.type === 'textarea') {
        input = h('textarea', {
          name: f.name,
          placeholder: f.placeholder || '',
          rows: f.rows || 3,
        });
        if (f.value != null) input.value = f.value;
      } else if (f.type === 'select') {
        input = h('select', { name: f.name },
          (f.options || []).map(o => {
            const opt = h('option', { value: o.value }, o.label);
            if (String(f.value) === String(o.value)) opt.selected = true;
            return opt;
          })
        );
      } else if (f.type === 'checkbox') {
        input = h('input', { type: 'checkbox', name: f.name });
        if (f.value) input.checked = true;
      } else {
        input = h('input', {
          type: f.type || 'text',
          name: f.name,
          placeholder: f.placeholder || '',
          inputmode: f.inputmode || undefined,
          autocomplete: 'off',
          required: f.required ? 'required' : undefined,
        });
        if (f.value != null) input.value = f.value;
      }
      inputs[f.name] = input;

      const parts = [];
      if (f.label) parts.push(h('span', {}, f.label));
      parts.push(input);
      if (f.hint) parts.push(h('p', { class: 'ui-hint' }, f.hint));
      return h('label', { class: 'ui-field' }, parts);
    });
    const body = h('div', { class: 'ui-body' }, bodyChildren);

    const cancel = h('button', { class: 'btn-ghost', 'data-role': 'cancel' }, cancelLabel);
    const submit = h('button', { class: destructive ? 'danger' : 'primary', 'data-role': 'submit' }, submitLabel);

    const modal = openDialog({ title, message, body, actions: [cancel, submit] });

    function readValues() {
      const out = {};
      for (const f of fields) {
        const el = inputs[f.name];
        if (f.type === 'checkbox') out[f.name] = el.checked;
        else out[f.name] = el.value;
      }
      return out;
    }

    cancel.addEventListener('click', () => modal.close(null));
    submit.addEventListener('click', async () => {
      modal.setError('');
      // Built-in required-field validation
      for (const f of fields) {
        if (f.required && !readValues()[f.name]) {
          modal.setError(`« ${f.label || f.name} » est requis.`);
          inputs[f.name].focus();
          return;
        }
      }
      const values = readValues();
      if (!onSubmit) { modal.close(values); return; }
      submit.disabled = true;
      cancel.disabled = true;
      try {
        await onSubmit(values);
        modal.close(values);
      } catch (e) {
        modal.setError(e.message || String(e));
        submit.disabled = false;
        cancel.disabled = false;
      }
    });

    return modal.result;
  }

  window.ui = {
    alert:   alertModal,
    confirm: confirmModal,
    form:    formModal,
  };
})();
