/* Точки навигации по слайдам и подсветка текущего */
(function () {
  'use strict';
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var dots = document.getElementById('dots');
  if (!slides.length || !dots) return;

  slides.forEach(function (s, i) {
    var a = document.createElement('a');
    a.href = '#' + s.id;
    a.setAttribute('aria-label', String(i + 1));
    dots.appendChild(a);
  });
  var links = [].slice.call(dots.children);

  function mark(i) {
    links.forEach(function (a, k) {
      a.classList.toggle('is-on', k === i);
      if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  mark(0);

  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) mark(slides.indexOf(e.target));
    });
  }, { threshold: 0.55 });
  slides.forEach(function (s) { io.observe(s); });
})();
