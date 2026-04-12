/* bodypart.js — 4p: 부위별 카테고리 */

function renderBodypart() {
  updateHeader('부위별 운동기구', '운동 부위를 선택하세요');
  setActiveTab('bodypart');
  var app = document.getElementById('app');

  var html = '<div class="bodypart-grid">';
  BODYPARTS.forEach(function (bp) {
    var count = getEquipmentByBodypartAll(bp.id).length;
    html += '<div class="bodypart-card" onclick="location.hash=\'#/bodypart/' + esc(bp.id) + '\'">';
    html += '<div class="bp-img-wrap">';
    html += '<img src="images/bodyparts/' + esc(bp.id) + '.svg" alt="' + esc(bp.name) + '" loading="lazy">';
    html += '</div>';
    html += '<div class="card-body">';
    html += '<p class="card-name">' + esc(bp.name) + '</p>';
    html += '<span class="bp-count">' + count + '개 기구</span>';
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';
  app.innerHTML = html;
}
