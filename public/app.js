/* Точка уюта. Прокрутка рисует чертёж, форма проверяет себя сама. */
(function () {
  'use strict';

  /* Чертёж первого экрана анимируется целиком в CSS и стартует сам,
     скриптом не управляется. Здесь только шапка и форма. */

  /* ---------- 1. Шапка прилипает ---------- */
  var header = document.querySelector('.top');
  var queued = false;

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      if (header) header.classList.toggle('is-stuck', window.scrollY > 12);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 2. Виды проекта в «Работах» ---------- */
  [].forEach.call(document.querySelectorAll('[data-gallery]'), function (fig) {
    var shot = fig.querySelector('[data-shot]');
    var cap = fig.querySelector('figcaption [data-cap]');
    var buttons = [].slice.call(fig.querySelectorAll('.view'));
    if (!shot || buttons.length < 2) return;

    /* соседние кадры подгружаем заранее, чтобы переключение не мигало */
    buttons.forEach(function (b) {
      var pre = new Image();
      pre.src = b.getAttribute('data-src');
    });

    function show(btn) {
      shot.src = btn.getAttribute('data-src');
      shot.alt = btn.getAttribute('data-alt') || '';
      if (cap) cap.textContent = btn.getAttribute('data-cap') || '';
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    fig.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.view') : null;
      if (btn && buttons.indexOf(btn) > -1) show(btn);
    });

    /* стрелками влево и вправо, как ожидается от группы кнопок */
    fig.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
      next.focus();
      show(next);
    });
  });

  /* ---------- 3. Заявка ---------- */
  var form = document.getElementById('form');
  if (!form) return;

  var notice = document.getElementById('notice');
  var submit = document.getElementById('submit');

  function rowOf(field) { return field.closest('.spec__row'); }

  function errOf(field) {
    return form.querySelector('[data-err-for="' + field.id + '"]');
  }

  function setBad(field, bad) {
    var row = rowOf(field);
    var err = errOf(field);
    if (row) row.classList.toggle('is-bad', bad);
    if (err) err.hidden = !bad;
    field.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (err) field.setAttribute('aria-describedby', bad ? err.id || (err.id = field.id + '-err') : '');
  }

  var name = document.getElementById('f-name');
  var contact = document.getElementById('f-contact');

  function checkName() {
    var ok = name.value.trim().length >= 2;
    setBad(name, !ok);
    return ok;
  }

  /* подходит либо номер, либо имя в Telegram.
     Код страны не навязываем: фирма работает в Идлибе, не в России. */
  function checkContact() {
    var v = contact.value.trim();
    var digits = v.replace(/\D+/g, '');
    var isPhone = digits.length >= 8;
    var isTgName = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v);
    var ok = isPhone || isTgName;
    setBad(contact, !ok);
    return ok;
  }

  /* проверяем на выходе из поля, а не на каждом нажатии */
  name.addEventListener('blur', function () { if (name.value.trim()) checkName(); });
  contact.addEventListener('blur', function () { if (contact.value.trim()) checkContact(); });
  name.addEventListener('input', function () { if (rowOf(name).classList.contains('is-bad')) checkName(); });
  contact.addEventListener('input', function () { if (rowOf(contact).classList.contains('is-bad')) checkContact(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var okName = checkName();
    var okContact = checkContact();

    if (!okName || !okContact) {
      (okName ? contact : name).focus();
      return;
    }

    submit.classList.add('is-busy');
    submit.disabled = true;

    /* Бэкенда у статического сайта нет, поэтому заявку не «отправляем»,
       а собираем в готовый текст: кладём в буфер и открываем переписку.
       Ничего не притворяется отправленным. */
    var kindEl = form.querySelector('input[name="kind"]:checked');
    var size = (document.getElementById('f-size') || {}).value || '';
    var lines = [
      'Заявка на замер',
      'Имя: ' + name.value.trim(),
      'Связь: ' + contact.value.trim(),
      'Что нужно: ' + (kindEl ? kindEl.value : '')
    ];
    if (size.trim()) lines.push('Проём: ' + size.trim() + ' мм');
    var message = lines.join('\n');

    function render(copied) {
      notice.hidden = false;
      notice.innerHTML =
        '<p class="notice__lead">' +
        (copied
          ? 'Заявка скопирована. Откройте переписку и вставьте её одним нажатием.'
          : 'Заявка готова. Скопируйте текст и отправьте его в Telegram.') +
        '</p>' +
        '<pre class="notice__msg"></pre>' +
        '<p class="notice__acts">' +
        '<a class="btn btn--ghost" href="https://t.me/BintApandi" target="_blank" rel="noopener">Я сестра</a> ' +
        '<a class="btn btn--ghost" href="https://t.me/AAA116Z" target="_blank" rel="noopener">Я брат</a>' +
        '</p>';
      notice.querySelector('.notice__msg').textContent = message;
    }

    function finish(copied) {
      submit.classList.remove('is-busy');
      submit.disabled = false;
      render(copied);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).then(function () {
        finish(true);
      }, function () {
        finish(false);
      });
    } else {
      finish(false);
    }
  });
})();
