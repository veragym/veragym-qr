/* header.js — 상단 헤더 컴포넌트 */

function updateHeader(title, subtitle) {
  var h = document.getElementById('top-header');
  if (!h) return;
  var h1 = h.querySelector('h1');
  if (h1) h1.textContent = title || '';
  var p = h.querySelector('p');
  if (subtitle) {
    p.textContent = subtitle;
    p.style.display = '';
  } else {
    p.textContent = '';
    p.style.display = 'none';
  }
}
