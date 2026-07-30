/* Mandil Rent A Car - shared booking modal.
 *
 * Every "Book Now" on the site used to be a link to index.html#book. On a
 * service page that threw the visitor back to the homepage; on the homepage
 * it scrolled to a three-field bar. This replaces both with a real booking
 * form that opens in place, on whatever page they are already reading.
 *
 * The markup is injected from here rather than pasted into seven files, so
 * the form only ever exists in one place.
 *
 * Include on every page, after assets/service.js where that is present.
 */
(function () {
  'use strict';

  var ENDPOINT = 'api/lead.php';
  var WHATSAPP = '923135251392';
  var loadedAt = Date.now();

  var SERVICES = [
    ['Airport Transfer',        'airport-transfers'],
    ['Car Rental',              'car-rental'],
    ['Executive Chauffeur',     'executive-chauffeur'],
    ['Corporate Transportation','corporate'],
    ['Intercity Travel',        'intercity-travel'],
    ['Northern Tours',          'northern-tours'],
    ['Something else',          'general']
  ];

  /* Preselect the service matching the page we are on */
  function pageService() {
    var f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (f.indexOf('airport') === 0)   return 'Airport Transfer';
    if (f.indexOf('car-rental') === 0) return 'Car Rental';
    if (f.indexOf('executive') === 0) return 'Executive Chauffeur';
    if (f.indexOf('corporate') === 0) return 'Corporate Transportation';
    if (f.indexOf('intercity') === 0) return 'Intercity Travel';
    if (f.indexOf('northern') === 0)  return 'Northern Tours';
    return 'Airport Transfer';
  }

  var FIELD = 'mt-1.5 w-full rounded-xl border border-white/20 bg-ink/60 px-4 py-3 text-base text-white outline-none ' +
              'transition-colors placeholder:text-white/35 focus:border-gold focus:bg-ink focus:ring-1 focus:ring-gold/40';
  var LBL   = 'text-[.6875rem] font-medium uppercase tracking-wider text-white/60';

  function field(label, inner) {
    return '<label class="block"><span class="' + LBL + '">' + label + '</span>' + inner + '</label>';
  }

  var opts = SERVICES.map(function (s) {
    return '<option value="' + s[0] + '" data-tag="' + s[1] + '">' + s[0] + '</option>';
  }).join('');

  var html =
  '<div id="bk-modal" class="fixed inset-0 z-[60] hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bk-title">' +
    '<div class="absolute inset-0 bg-ink/85 backdrop-blur-sm" data-bk-close></div>' +
    '<div class="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-ink-800 text-white shadow-luxe">' +
      '<button type="button" data-bk-close aria-label="Close" class="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/80 text-white transition-colors hover:bg-gold hover:text-ink">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>' +
      '<form id="bk-form" novalidate class="p-6 sm:p-8">' +
        '<p class="text-[.75rem] font-medium uppercase tracking-eyebrow text-gold">Book with Mandil</p>' +
        '<h2 id="bk-title" class="mt-2 font-display text-[clamp(1.6rem,4vw,2.2rem)] leading-tight">Tell us about your journey.</h2>' +
        '<p class="mt-2 text-[.875rem] font-light leading-relaxed text-white/55">Name and number are all we truly need. Anything else you add just helps us quote faster.</p>' +

        '<div class="hidden" aria-hidden="true"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>' +

        '<div class="mt-6 grid gap-3 sm:grid-cols-2">' +
          field('Service', '<select name="service" class="' + FIELD + '">' + opts + '</select>') +
          field('Date &amp; time <span class="normal-case text-white/35">(optional)</span>', '<input type="datetime-local" name="datetime" class="' + FIELD + '">') +
          field('Your name', '<input type="text" name="name" autocomplete="name" required placeholder="Ahsan Raza" class="' + FIELD + '">') +
          field('WhatsApp number', '<input type="tel" name="phone" autocomplete="tel" required placeholder="0313 5251392" class="' + FIELD + '">') +
          field('Pickup <span class="normal-case text-white/35">(optional)</span>', '<input type="text" name="pickup" placeholder="Islamabad Airport" class="' + FIELD + '">') +
          field('Drop-off <span class="normal-case text-white/35">(optional)</span>', '<input type="text" name="dropoff" placeholder="DHA, Islamabad" class="' + FIELD + '">') +
        '</div>' +

        '<div class="mt-3">' +
          field('Anything else? <span class="normal-case text-white/35">(optional)</span>', '<textarea name="message" rows="3" placeholder="Number of passengers, luggage, child seats, flight number..." class="' + FIELD + ' resize-y"></textarea>') +
        '</div>' +

        '<p id="bk-msg" role="status" aria-live="polite" class="mt-4 hidden text-sm font-light"></p>' +

        '<div class="mt-6 flex flex-col gap-3 sm:flex-row">' +
          '<button type="submit" id="bk-submit" class="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-[.9375rem] font-medium text-ink shadow-luxe transition-all duration-300 hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60">' +
            '<span data-label>Request My Booking</span>' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          '</button>' +
          '<a href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener noreferrer" class="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-4 text-[.9375rem] font-light transition-colors hover:border-gold hover:text-gold sm:w-auto sm:shrink-0">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1121 11.5z"/></svg>WhatsApp' +
          '</a>' +
        '</div>' +
        '<p class="mt-4 text-center text-xs font-light text-white/40 sm:text-left">Fixed fares, confirmed in writing. We reply within minutes, day or night.</p>' +
      '</form>' +
    '</div>' +
  '</div>';

  var host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host.firstChild);

  var modal  = document.getElementById('bk-modal');
  var form   = document.getElementById('bk-form');
  var msgEl  = document.getElementById('bk-msg');
  var btn    = document.getElementById('bk-submit');
  var label  = btn.querySelector('[data-label]');
  var lastFocus = null;
  var sent = false;

  function show(text, ok) {
    msgEl.textContent = text;
    msgEl.classList.remove('hidden');
    msgEl.style.color = ok ? '#8FCB9B' : '#F0A0A0';
  }

  function open(prefill) {
    lastFocus = document.activeElement;
    if (!sent) {
      var sel = form.querySelector('[name=service]');
      sel.value = (prefill && prefill.service) || pageService();
      if (prefill) {
        ['pickup', 'dropoff', 'datetime'].forEach(function (k) {
          if (prefill[k]) form.querySelector('[name=' + k + ']').value = prefill[k];
        });
      }
      msgEl.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    form.querySelector('[name=name]').focus();
  }

  function close() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  window.MandilBooking = { open: open, close: close };

  /* Every existing "Book Now" link points at #book or index.html#book.
     Intercept them all rather than editing twenty buttons. Without JS they
     still fall back to the old anchor, so nothing becomes a dead end. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href$="#book"], [data-book]');
    if (!a) return;
    e.preventDefault();
    open(null);
  });

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-bk-close]')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sent) { close(); return; }

    var f = new FormData(form);
    if (f.get('company')) return;                       // honeypot

    var name  = (f.get('name')  || '').trim();
    var phone = (f.get('phone') || '').trim();
    if (name.length < 2) { show('Please enter your name.', false); return; }
    if ((phone.match(/\d/g) || []).length < 9) { show('Please enter a valid phone number.', false); return; }

    var sel = form.querySelector('[name=service]');
    var tag = sel.options[sel.selectedIndex].getAttribute('data-tag') || '';

    var original = label.textContent;
    btn.disabled = true;
    label.textContent = 'Sending...';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        phone: phone,
        type: sel.value,
        tag: tag,
        pickup:   (f.get('pickup')   || '').trim(),
        dropoff:  (f.get('dropoff')  || '').trim(),
        datetime: (f.get('datetime') || '').trim(),
        message:  (f.get('message')  || '').trim(),
        company: '', elapsed: Date.now() - loadedAt
      })
    })
    .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
    .then(function (d) {
      if (d && d.ok) {
        sent = true;
        show(d.message || 'Thank you. We will confirm your booking shortly.', true);
        label.textContent = 'Sent';
        form.querySelectorAll('input,select,textarea').forEach(function (i) { i.disabled = true; });
        setTimeout(close, 2800);
      } else {
        show((d && d.message) || 'That did not send. Please WhatsApp us on +92 313 5251392.', false);
        btn.disabled = false;
        label.textContent = original;
      }
    })
    .catch(function () {
      show('Network problem. Please WhatsApp us on +92 313 5251392.', false);
      btn.disabled = false;
      label.textContent = original;
    });
  });
})();
