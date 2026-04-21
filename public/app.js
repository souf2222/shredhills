(function () {
  const codeEl = document.getElementById('code');
  const pinEl  = document.getElementById('pin');
  const msgEl  = document.getElementById('message');
  const clockEl = document.getElementById('clock');
  const btnIn  = document.getElementById('btn-in');
  const btnOut = document.getElementById('btn-out');
  const myHoursCta = document.getElementById('my-hours-cta');
  const btnMyHours = document.getElementById('btn-my-hours');

  function tick() {
    const d = new Date();
    const date = d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clockEl.textContent = date.charAt(0).toUpperCase() + date.slice(1) + ' · ' + time;
  }
  tick();
  setInterval(tick, 1000);

  function setMessage(text, kind) {
    msgEl.textContent = text || '';
    msgEl.className = kind || '';
  }

  function reset() {
    codeEl.value = '';
    pinEl.value = '';
    codeEl.focus();
  }

  let lastCreds = null; // { code, pin } from last successful punch

  // Hide the "Voir mes heures" CTA after 30s of inactivity (kiosk safety)
  let ctaTimer = null;
  function showMyHoursCta(code, pin) {
    lastCreds = { code, pin };
    myHoursCta.hidden = false;
    clearTimeout(ctaTimer);
    ctaTimer = setTimeout(() => {
      myHoursCta.hidden = true;
      lastCreds = null;
    }, 30000);
  }
  function hideMyHoursCta() {
    myHoursCta.hidden = true;
    lastCreds = null;
    clearTimeout(ctaTimer);
  }

  btnMyHours.addEventListener('click', () => {
    if (!lastCreds) return;
    // Pass creds via sessionStorage so the URL stays clean.
    sessionStorage.setItem('me.code', lastCreds.code);
    sessionStorage.setItem('me.pin',  lastCreds.pin);
    location.href = '/me';
  });

  async function punch(action) {
    const code = codeEl.value.trim();
    const pin  = pinEl.value.trim();
    if (!code || !pin) {
      setMessage('Saisissez votre code et votre NIP.', 'err');
      return;
    }
    btnIn.disabled = btnOut.disabled = true;
    setMessage('…');
    try {
      const res = await fetch('/api/punch/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Échec du pointage.', 'err');
        hideMyHoursCta();
      } else {
        const name = data.employee?.name || '';
        if (data.action === 'in') {
          setMessage(`Bienvenue, ${name}. Entrée enregistrée à ${new Date(data.punch.punch_in).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}.`, 'ok');
        } else {
          const mins = data.durationMinutes ?? 0;
          const h = Math.floor(mins / 60), m = mins % 60;
          setMessage(`Au revoir, ${name}. Sortie enregistrée. Quart : ${h} h ${String(m).padStart(2,'0')}.`, 'ok');
        }
        showMyHoursCta(code, pin);
        reset();
        setTimeout(() => setMessage(''), 10000);
      }
    } catch (e) {
      setMessage('Erreur réseau. Réessayez.', 'err');
    } finally {
      btnIn.disabled = btnOut.disabled = false;
    }
  }

  btnIn.addEventListener('click',  () => punch('in'));
  btnOut.addEventListener('click', () => punch('out'));

  // Enter on PIN triggers punch in by default
  pinEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); punch('toggle'); }
  });
})();
