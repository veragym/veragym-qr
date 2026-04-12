/* bodypart-list.js — 4-1p: 부위별 기구 목록 */

function renderBodypartList(part) {
  part = decodeURIComponent(part);
  var bp = null;
  for (var i = 0; i < BODYPARTS.length; i++) {
    if (BODYPARTS[i].id === part) { bp = BODYPARTS[i]; break; }
  }
  if (!bp) {
    updateHeader('오류', '');
    document.getElementById('app').innerHTML =
      '<div class="error-page"><p class="error-msg">잘못된 부위입니다.</p>' +
      '<button class="btn-primary" onclick="location.hash=\'#/bodypart\'">부위 선택으로</button></div>';
    return;
  }
  updateHeader(bp.name + ' 운동기구', '해당 부위 기구를 확인하세요');
  setActiveTab('bodypart');
  var list = getEquipmentByBodypartAll(part);
  document.getElementById('app').innerHTML = renderEquipmentGrid(list);
}
