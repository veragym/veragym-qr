/* detail.js — 3p: 기구 상세 (일반 모드 + 기록 모드) */

function renderDetail(id, mode) {
  mode = mode || 'normal';
  var eq = getEquipmentById(id);
  if (!eq) {
    renderNotFound();
    return;
  }

  // 부모 기구이고 자식 운동이 있으면 → 자식 목록 표시
  if (!eq.parent_id && hasChildren(eq.id)) {
    var children = getChildrenByParent(eq.id);
    // 자식이 1개면 바로 그 운동 상세로
    if (children.length === 1) {
      renderDetail(children[0].id, mode);
      return;
    }
    renderParentDetail(eq);
    return;
  }

  updateHeader(eq.name, eq.bodypartName + ' \u00B7 ' + eq.primaryMuscle);
  setActiveTab(mode === 'record' ? 'records' : '');
  var app = document.getElementById('app');

  var html = '<div class="detail-page">';

  if (mode === 'record') {
    // 기록 모드: 설명은 접힘 상태
    html += '<div class="detail-section">';
    html += '<button class="toggle-desc-btn" onclick="toggleDescription()">';
    html += '<span class="toggle-icon">▶</span> 설명 펼치기';
    html += '</button>';
    html += '</div>';

    html += '<div id="detail-desc" class="detail-desc-collapsed">';
  }

  // 실사진 — 추후 사용자 제공 사진으로 교체 예정 (현재 비움)
  // html += '<div class="detail-photo-wrap">';
  // html += '<img src="" alt="" loading="lazy">';
  // html += '</div>';

  // 기구 조절
  if (eq.adjustment && eq.adjustment.length > 0) {
    html += '<div class="detail-section">';
    html += '<h2 class="section-title">기구 조절</h2>';
    html += '<div class="adjust-card">';
    html += '<ul class="adjust-list">';
    eq.adjustment.forEach(function (a) {
      html += '<li>' + esc(a) + '</li>';
    });
    html += '</ul></div></div>';
  }

  // 일러스트
  html += '<div class="detail-section">';
  html += '<h2 class="section-title">운동 자세</h2>';
  html += '<div class="detail-illust-wrap">';
  html += '<img src="' + esc(eq.illustration) + '" alt="' + esc(eq.name) + ' 자세" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
  html += '<div class="detail-placeholder illust" style="display:none"><span>자세 일러스트</span></div>';
  html += '</div></div>';

  // 운동 방법 (번호 패턴으로 분리 → 조절법과 동일 디자인)
  if (eq.method) {
    var steps;
    if (Array.isArray(eq.method)) {
      steps = eq.method;
    } else {
      // "1. ... 2. ... 3. ..." 패턴을 분리
      steps = eq.method.split(/(?=\d+\.\s)/).map(function (s) {
        return s.replace(/^\d+\.\s*/, '').trim();
      }).filter(function (s) { return s; });
    }
    if (steps.length > 0) {
      html += '<div class="detail-section">';
      html += '<h2 class="section-title">운동 방법</h2>';
      html += '<div class="adjust-card">';
      html += '<ul class="method-steps">';
      steps.forEach(function (m, i) {
        html += '<li><span class="method-num">' + (i + 1) + '</span>' + esc(m) + '</li>';
      });
      html += '</ul></div></div>';
    }
  }

  // 트레이너 팁
  if (eq.trainerTips && eq.trainerTips.length > 0) {
    html += '<div class="detail-section">';
    html += '<h2 class="section-title">트레이너 팁</h2>';
    html += '<div class="trainer-tips-card">';
    html += '<ul class="trainer-tips-list">';
    eq.trainerTips.forEach(function (tip) {
      html += '<li>' + esc(tip) + '</li>';
    });
    html += '</ul></div></div>';
  }

  // 주동근 / 협력근
  html += '<div class="detail-section">';
  html += '<h2 class="section-title">타겟 근육</h2>';
  html += '<div class="muscle-group">';
  html += '<span class="muscle-label">주동근</span>';
  html += '<div class="muscle-tags">';
  eq.primaryMuscle.split(',').forEach(function (m) {
    m = m.trim();
    if (m) html += '<span class="muscle-tag">' + esc(m) + '</span>';
  });
  html += '</div></div>';
  if (eq.secondaryMuscle) {
    html += '<div class="muscle-group">';
    html += '<span class="muscle-label">협력근</span>';
    html += '<div class="muscle-tags">';
    eq.secondaryMuscle.split(',').forEach(function (m) {
      m = m.trim();
      if (m) html += '<span class="muscle-tag secondary">' + esc(m) + '</span>';
    });
    html += '</div></div>';
  }
  html += '</div>';

  if (mode === 'record') {
    html += '</div>'; // close #detail-desc

    // 운동 기록 영역
    html += '<div class="detail-section">';
    html += '<button class="btn-record-toggle" id="btn-record-toggle" onclick="toggleRecordInput(\'' + esc(eq.id) + '\')">';
    html += '<span style="margin-right:6px">🏋️</span> 운동 기록하기';
    html += '</button>';
    html += '<div id="record-input-area" class="record-input-collapsed"></div>';
    html += '</div>';

    // 기록 내역
    html += '<div class="detail-section">';
    html += '<h2 class="section-title">기록 내역</h2>';
    html += '<div id="record-list-area"><div class="page-loading">불러오는 중...</div></div>';
    html += '</div>';
  }

  // 하단 nav 가림 방지 spacer (nav height 77px + safe area)
  html += '<div class="nav-spacer"></div>';
  html += '</div>';
  app.innerHTML = html;

  if (mode === 'record') {
    loadRecordList(eq.id);
  }
}

function toggleDescription() {
  var desc = document.getElementById('detail-desc');
  var btn = document.querySelector('.toggle-desc-btn');
  if (!desc || !btn) return;
  var isCollapsed = desc.classList.contains('detail-desc-collapsed');
  desc.classList.toggle('detail-desc-collapsed', !isCollapsed);
  desc.classList.toggle('detail-desc-expanded', isCollapsed);
  btn.innerHTML = isCollapsed
    ? '<span class="toggle-icon">▼</span> 설명 접기'
    : '<span class="toggle-icon">▶</span> 설명 펼치기';
}

var _recordInputOpen = false;
var _currentSets = [{ weight: '', reps: '' }];
var _currentWeightMode = 'total';
var _editWeightMode = {};

function getWeightModePref(equipmentId) {
  return localStorage.getItem('wm_' + equipmentId) || 'total';
}

function setWeightModePref(equipmentId, mode) {
  localStorage.setItem('wm_' + equipmentId, mode);
}

function setWeightMode(mode, context) {
  var hash = location.hash;
  var eqId = hash.replace('#/equipment/', '').split('?')[0];

  if (context === 'new') {
    syncSetValues();
    _currentWeightMode = mode;
    setWeightModePref(eqId, mode);
    var area = document.getElementById('record-input-area');
    if (area) area.innerHTML = renderSetInput(_currentSets, eqId, _currentWeightMode);
  } else if (context.indexOf('edit-') === 0) {
    var date = context.replace('edit-', '');
    syncEditSetValues(date);
    _editWeightMode[date] = mode;
    var group = document.querySelector('.record-date-group[data-date="' + date + '"]');
    if (group) group.innerHTML = renderEditMode(date, _editSetsData[date], eqId, mode);
  }
}

function toggleRecordInput(equipmentId) {
  var area = document.getElementById('record-input-area');
  if (!area) return;
  _recordInputOpen = !_recordInputOpen;
  if (_recordInputOpen) {
    _currentSets = [{ weight: '', reps: '' }];
    _currentWeightMode = getWeightModePref(equipmentId);
    area.classList.remove('record-input-collapsed');
    area.classList.add('record-input-expanded');
    area.innerHTML = renderSetInput(_currentSets, equipmentId, _currentWeightMode);
  } else {
    area.classList.remove('record-input-expanded');
    area.classList.add('record-input-collapsed');
    area.innerHTML = '';
  }
}

function addSet(equipmentId) {
  _currentSets.push({ weight: '', reps: '' });
  syncSetValues();
  var area = document.getElementById('record-input-area');
  if (area) area.innerHTML = renderSetInput(_currentSets, equipmentId, _currentWeightMode);
}

function removeSet(index, equipmentId) {
  if (_currentSets.length <= 1) return;
  syncSetValues();
  _currentSets.splice(index, 1);
  var area = document.getElementById('record-input-area');
  if (area) area.innerHTML = renderSetInput(_currentSets, equipmentId, _currentWeightMode);
}

function syncSetValues() {
  _currentSets.forEach(function (s, i) {
    var wEl = document.getElementById('set-weight-' + i);
    var rEl = document.getElementById('set-reps-' + i);
    if (wEl) s.weight = wEl.value;
    if (rEl) s.reps = rEl.value;
  });
}

async function saveRecord(equipmentId) {
  var phone = getStoredPhone();
  if (!phone) {
    showToast('전화번호를 먼저 등록해주세요.');
    location.hash = '#/records';
    return;
  }

  syncSetValues();

  // 빈 세트 확인 (무게와 횟수 모두 입력된 세트만 유효)
  var validSets = _currentSets.filter(function (s) {
    return s.weight !== '' && s.reps !== '' && parseFloat(s.weight) > 0 && parseInt(s.reps) > 0;
  });
  if (validSets.length === 0) {
    showToast('무게와 횟수를 모두 입력해주세요.');
    return;
  }

  var today = getKSTDate();

  try {
    // 같은 날 중복 기록 확인
    var exists = await checkTodayRecord(phone, equipmentId, today);
    if (exists) {
      if (!confirm('오늘 이미 기록이 있습니다. 수정하시겠습니까?')) return;
      var res = await updateWorkoutSets(phone, equipmentId, today, validSets, _currentWeightMode);
      if (res.error) {
        showToast('수정에 실패했습니다.');
        return;
      }
      showToast('기록이 수정되었습니다.');
    } else {
      var res = await saveWorkoutSets(phone, equipmentId, today, validSets, _currentWeightMode);
      if (res.error) {
        console.error('saveRecord failed:', res.error);
        showToast('저장에 실패했습니다.');
        return;
      }
      showToast('기록이 저장되었습니다.');
    }

    // 입력 영역 닫기 및 목록 새로고침
    _recordInputOpen = false;
    var area = document.getElementById('record-input-area');
    if (area) {
      area.classList.remove('record-input-expanded');
      area.classList.add('record-input-collapsed');
      area.innerHTML = '';
    }
    loadRecordList(equipmentId);
  } catch (e) {
    console.error('saveRecord failed:', e);
    showToast('오류가 발생했습니다.');
  }
}

async function loadRecordList(equipmentId) {
  var phone = getStoredPhone();
  var listArea = document.getElementById('record-list-area');
  if (!listArea) return;

  if (!phone) {
    listArea.innerHTML = '<div class="empty-state">전화번호를 등록하면 기록을 볼 수 있습니다.</div>';
    return;
  }

  try {
    var res = await getWorkoutLogs(phone, equipmentId);
    if (res.error) {
      listArea.innerHTML = '<div class="empty-state">기록을 불러오지 못했습니다.</div>';
      return;
    }
    listArea.innerHTML = renderRecordList(res.data, equipmentId);
  } catch (e) {
    console.error('loadRecordList failed:', e);
    listArea.innerHTML = '<div class="empty-state">기록을 불러오지 못했습니다.</div>';
  }
}

var _editSetsData = {};

function startEditRecord(date, equipmentId) {
  var listArea = document.getElementById('record-list-area');
  if (!listArea) return;
  var phone = getStoredPhone();
  if (!phone) return;

  var dateItems = listArea.querySelectorAll('.record-date-group');
  dateItems.forEach(function (group) {
    if (group.dataset.date === date) {
      var setsData = JSON.parse(group.dataset.sets || '[]');
      var wm = group.dataset.weightMode || 'total';
      _editSetsData[date] = setsData;
      _editWeightMode[date] = wm;
      group.innerHTML = renderEditMode(date, setsData, equipmentId, wm);
    }
  });
}

function addEditSet(date, equipmentId) {
  var group = document.querySelector('.record-date-group[data-date="' + date + '"]');
  if (!group) return;
  syncEditSetValues(date);
  _editSetsData[date].push({ weight: '', reps: '' });
  group.innerHTML = renderEditMode(date, _editSetsData[date], equipmentId, _editWeightMode[date]);
}

function removeEditSet(index, date, equipmentId) {
  if (!_editSetsData[date] || _editSetsData[date].length <= 1) return;
  syncEditSetValues(date);
  _editSetsData[date].splice(index, 1);
  var group = document.querySelector('.record-date-group[data-date="' + date + '"]');
  if (group) group.innerHTML = renderEditMode(date, _editSetsData[date], equipmentId, _editWeightMode[date]);
}

function syncEditSetValues(date) {
  var group = document.querySelector('.record-date-group[data-date="' + date + '"]');
  if (!group || !_editSetsData[date]) return;
  var rows = group.querySelectorAll('.edit-set-row');
  rows.forEach(function (row, i) {
    var w = row.querySelector('.edit-weight');
    var r = row.querySelector('.edit-reps');
    if (w && _editSetsData[date][i]) _editSetsData[date][i].weight = w.value;
    if (r && _editSetsData[date][i]) _editSetsData[date][i].reps = r.value;
  });
}

function cancelEdit(date, equipmentId) {
  delete _editSetsData[date];
  loadRecordList(equipmentId);
}

async function saveEditRecord(date, equipmentId) {
  var phone = getStoredPhone();
  if (!phone) return;

  var group = document.querySelector('.record-date-group[data-date="' + date + '"]');
  if (!group) return;

  var inputs = group.querySelectorAll('.edit-set-row');
  var sets = [];
  inputs.forEach(function (row) {
    var w = row.querySelector('.edit-weight');
    var r = row.querySelector('.edit-reps');
    if (w && r) {
      sets.push({ weight: w.value, reps: r.value });
    }
  });

  var validSets = sets.filter(function (s) {
    return s.weight !== '' && s.reps !== '' && parseFloat(s.weight) > 0 && parseInt(s.reps) > 0;
  });
  if (validSets.length === 0) {
    showToast('무게와 횟수를 모두 입력해주세요.');
    return;
  }

  try {
    var wm = _editWeightMode[date] || 'total';
    var res = await updateWorkoutSets(phone, equipmentId, date, validSets, wm);
    if (res.error) {
      showToast('수정에 실패했습니다.');
      return;
    }
    showToast('기록이 수정되었습니다.');
    delete _editSetsData[date];
    delete _editWeightMode[date];
    loadRecordList(equipmentId);
  } catch (e) {
    console.error('saveEditRecord failed:', e);
    showToast('오류가 발생했습니다.');
  }
}

async function deleteRecord(date, equipmentId) {
  if (!confirm(date.replace(/-/g, '.') + ' 기록을 삭제하시겠습니까?')) return;
  var phone = getStoredPhone();
  if (!phone) return;
  try {
    var res = await deleteWorkoutDate(phone, equipmentId, date);
    if (res.error) {
      showToast('삭제에 실패했습니다.');
      return;
    }
    showToast('기록이 삭제되었습니다.');
    loadRecordList(equipmentId);
  } catch (e) {
    console.error('deleteRecord failed:', e);
    showToast('오류가 발생했습니다.');
  }
}

function renderParentDetail(eq) {
  updateHeader(eq.name, '운동을 선택하세요');
  setActiveTab('');
  var app = document.getElementById('app');
  var children = getChildrenByParent(eq.id);

  // 부위별 그룹핑
  var partOrder = { '가슴': 0, '어깨': 1, '등': 2, '팔': 3, '하체': 4, '코어': 5 };
  var groups = {};
  children.forEach(function (c) {
    var cat = c.bodypartName;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(c);
  });
  var sortedParts = Object.keys(groups).sort(function (a, b) {
    var pa = partOrder[a] !== undefined ? partOrder[a] : 99;
    var pb = partOrder[b] !== undefined ? partOrder[b] : 99;
    return pa - pb;
  });

  var html = '<div class="parent-detail-page">';

  // 기구 이미지
  html += '<div class="parent-hero">';
  html += '<img src="' + esc(eq.image) + '" alt="' + esc(eq.name) + '" loading="lazy">';
  html += '</div>';

  // 부위별 탭 필터
  html += '<div class="child-filter">';
  html += '<button class="child-filter-btn active" onclick="filterChildren(\'all\')">전체 <span class="filter-count">' + children.length + '</span></button>';
  sortedParts.forEach(function (part) {
    html += '<button class="child-filter-btn" onclick="filterChildren(\'' + esc(part) + '\')">' + esc(part) + ' <span class="filter-count">' + groups[part].length + '</span></button>';
  });
  html += '</div>';

  // 자식 운동 목록
  html += '<div class="child-exercise-list" id="child-exercise-list">';
  sortedParts.forEach(function (part) {
    groups[part].sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    groups[part].forEach(function (c) {
      html += '<div class="child-exercise-item" data-bodypart="' + esc(c.bodypartName) + '" onclick="location.hash=\'#/equipment/' + esc(c.id) + '\'">';
      html += '<div class="child-illust">';
      html += '<img src="' + esc(c.illustration) + '" alt="' + esc(c.name) + '" loading="lazy" onerror="this.style.display=\'none\'">';
      html += '</div>';
      html += '<div class="child-info">';
      html += '<p class="child-name">' + esc(c.name) + '</p>';
      html += '<div class="child-meta">';
      html += '<span class="card-tag">' + esc(c.bodypartName) + '</span>';
      html += '<span class="child-muscle">' + esc(c.primaryMuscle) + '</span>';
      html += '</div>';
      html += '</div>';
      html += '<span class="child-arrow">&rsaquo;</span>';
      html += '</div>';
    });
  });
  html += '</div>';

  html += '<div class="nav-spacer"></div>';
  html += '</div>';
  app.innerHTML = html;
}

function filterChildren(part) {
  var btns = document.querySelectorAll('.child-filter-btn');
  btns.forEach(function (b) { b.classList.remove('active'); });
  event.target.closest('.child-filter-btn').classList.add('active');

  var items = document.querySelectorAll('.child-exercise-item');
  items.forEach(function (item) {
    if (part === 'all' || item.dataset.bodypart === part) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

function renderNotFound() {
  updateHeader('오류', '');
  setActiveTab('');
  var app = document.getElementById('app');
  app.innerHTML = '<div class="error-page">' +
    '<p class="error-icon">⚠️</p>' +
    '<p class="error-msg">기구를 찾을 수 없습니다.</p>' +
    '<button class="btn-primary" onclick="location.hash=\'#/home\'">홈으로 이동</button>' +
    '</div>';
}
