/* app.js — SPA 라우터 + 초기화 */

/* ── 전역 에러 핸들러 ── */
window.onerror = function (msg, src, line) {
  console.error('Global error:', msg, src, line);
  if (typeof showToast === 'function') showToast('오류가 발생했습니다. 새로고침해주세요.');
  return false;
};
window.addEventListener('unhandledrejection', function (e) {
  console.error('Unhandled promise rejection:', e.reason);
  if (typeof showToast === 'function') showToast('네트워크 오류가 발생했습니다.');
});

function parseHashQuery(path) {
  var idx = path.indexOf('?');
  if (idx === -1) return { path: path, params: {} };
  var query = path.slice(idx + 1);
  var cleanPath = path.slice(0, idx);
  var params = {};
  query.split('&').forEach(function (pair) {
    var kv = pair.split('=');
    if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
  });
  return { path: cleanPath, params: params };
}

function router() {
  var hash = location.hash || '';
  var rawPath = hash.replace('#', '') || '/home';
  var parsed = parseHashQuery(rawPath);
  var path = parsed.path;
  var params = parsed.params;

  // 페이지 전환 시 스크롤 최상단으로
  window.scrollTo(0, 0);

  // QR 세션 만료 체크
  if (!isSessionValid()) {
    renderExpiredScreen();
    return;
  }

  // 데이터 로딩 전이면 로딩 화면 표시
  if (!_equipmentLoaded) {
    var app = document.getElementById('app');
    if (app) app.innerHTML = '<div class="page-loading">기구 데이터를 불러오는 중...</div>';
    return;
  }

  // #/equipment/:id?mode=record
  if (path.indexOf('/equipment/') === 0) {
    var eqId = path.replace('/equipment/', '');
    if (!/^[a-zA-Z0-9_-]+$/.test(eqId)) { renderNotFound(); return; }
    var mode = (params.mode === 'record') ? 'record' : 'normal';
    renderDetail(eqId, mode);
    return;
  }

  // #/bodypart/:part
  if (path.indexOf('/bodypart/') === 0) {
    var part = path.replace('/bodypart/', '');
    renderBodypartList(part);
    return;
  }

  switch (path) {
    case '/home':
      renderHome();
      break;
    case '/notice':
      renderNotice();
      break;
    case '/bodypart':
      renderBodypart();
      break;
    case '/records':
      renderRecords();
      break;
    default:
      renderHome();
  }
}

window.addEventListener('hashchange', router);

document.addEventListener('DOMContentLoaded', async function () {
  try {
    // QR 스캔 감지: ?branch= 파라미터가 있으면 새 세션 시작
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('branch')) {
      startSession();
    }

    // 세션 없으면 만료 화면
    if (!isSessionValid()) {
      renderExpiredScreen();
      return;
    }

    initDB();
    initNav();

    // DB에서 기구 데이터 로딩
    var loaded = await loadEquipmentFromDB();
    if (!loaded) {
      var app = document.getElementById('app');
      if (app) app.innerHTML = '<div class="empty-state">기구 데이터를 불러오지 못했습니다.<br>잠시 후 다시 시도해주세요.</div>';
      return;
    }

    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      var hasNotice = await hasActiveNotice();
      if (hasNotice) {
        location.hash = '#/notice';
      } else {
        location.hash = '#/home';
      }
    } else {
      router();
    }
  } catch (e) {
    console.error('App init failed:', e);
    var app = document.getElementById('app');
    if (app) app.innerHTML = '<div class="empty-state">앱 초기화에 실패했습니다.<br>페이지를 새로고침해주세요.</div>';
  }
});

/* TODO: 배포 시 서비스워커 활성화 — service-worker.js의 STATIC_ASSETS에 Phase 2 파일 추가 후 활성화
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('service-worker.js').catch(function () {});
  });
}
*/
/* SW 클린업 — 필요 시 수동 활성화
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (r) { r.unregister(); });
  });
}
if ('caches' in window) {
  caches.keys().then(function (names) {
    names.forEach(function (n) { caches.delete(n); });
  });
}
*/
