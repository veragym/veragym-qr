/* nav.js — 하단 네비게이션 (4탭: 홈 / 부위별 / 기록보기 / 뒤로) */

function setActiveTab(tabName) {
  var btns = document.querySelectorAll('#bottom-nav .nav-btn');
  btns.forEach(function (btn) {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function initNav() {
  var nav = document.getElementById('bottom-nav');
  if (!nav) return;
  nav.addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-btn');
    if (!btn) return;
    var tab = btn.dataset.tab;
    if (tab === 'home') {
      location.hash = '#/home';
    } else if (tab === 'bodypart') {
      location.hash = '#/bodypart';
    } else if (tab === 'records') {
      location.hash = '#/records';
    } else if (tab === 'back') {
      // hash 히스토리가 있으면 뒤로, 없으면 홈으로
      var prevHash = location.hash;
      var backHandled = false;
      var onHashChange = function () {
        backHandled = true;
        window.removeEventListener('hashchange', onHashChange);
      };
      window.addEventListener('hashchange', onHashChange);
      history.back();
      setTimeout(function () {
        window.removeEventListener('hashchange', onHashChange);
        if (!backHandled || !location.hash || location.hash === '#') {
          location.hash = '#/home';
        }
      }, 300);
    }
  });
}
