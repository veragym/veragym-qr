/* home.js — 2p: 전체 운동기구 목록 */

function renderHome() {
  updateHeader('전체 운동기구', '기구를 선택해 사용법을 확인하세요');
  setActiveTab('home');
  var app = document.getElementById('app');

  // 부모 기구만 표시 (자식 운동 제외)
  var partOrder = { '가슴': 0, '어깨': 1, '등': 2, '팔': 3, '하체': 4, '코어': 5 };
  var sorted = getParentEquipment().slice().sort(function (a, b) {
    var pa = partOrder[a.bodypartName] !== undefined ? partOrder[a.bodypartName] : 99;
    var pb = partOrder[b.bodypartName] !== undefined ? partOrder[b.bodypartName] : 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, 'ko');
  });

  app.innerHTML = renderEquipmentGrid(sorted);
}

/* 공유 함수: records.js, bodypart-list.js에서도 호출됨 */
function renderEquipmentGrid(list, mode) {
  if (!list || list.length === 0) {
    return '<div class="empty-state">등록된 기구가 없습니다.</div>';
  }
  var html = '<div class="equipment-grid">';
  list.forEach(function (eq) {
    var href = mode === 'record'
      ? '#/equipment/' + esc(eq.id) + '?mode=record'
      : '#/equipment/' + esc(eq.id);
    html += '<div class="equipment-card" onclick="location.hash=\'' + href + '\'">';
    html += '<div class="card-img-wrap">';
    html += '<img src="' + esc(eq.image) + '" alt="' + esc(eq.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
    html += '<div class="card-placeholder" style="display:none"><span>' + esc(eq.name.charAt(0)) + '</span></div>';
    html += '</div>';
    html += '<div class="card-body">';
    html += '<p class="card-name">' + esc(eq.name) + '</p>';
    html += '<span class="card-tag">' + esc(eq.bodypartName) + '</span>';
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}
