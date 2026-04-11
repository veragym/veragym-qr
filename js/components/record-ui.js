/* record-ui.js — 운동 기록 UI 컴포넌트 (Phase 2) */

function renderWeightModeToggle(mode, context) {
  // context: 'new' or 'edit-{date}'
  var html = '<div class="weight-mode-toggle">';
  html += '<span class="weight-mode-label">무게 입력</span>';
  html += '<div class="weight-mode-btns">';
  html += '<button class="weight-mode-btn' + (mode === 'total' ? ' active' : '') + '" onclick="setWeightMode(\'total\',\'' + context + '\')">양쪽(합산)</button>';
  html += '<button class="weight-mode-btn' + (mode === 'single' ? ' active' : '') + '" onclick="setWeightMode(\'single\',\'' + context + '\')">한쪽</button>';
  html += '</div>';
  html += '</div>';
  if (mode === 'single') {
    html += '<p class="weight-mode-hint">한쪽 무게 입력 → 저장 시 ×2 적용</p>';
  }
  return html;
}

function renderSetInput(sets, equipmentId, weightMode) {
  weightMode = weightMode || 'total';
  var html = '<div class="set-input-form">';
  html += renderWeightModeToggle(weightMode, 'new');
  sets.forEach(function (s, i) {
    html += '<div class="set-row">';
    html += '<span class="set-label">' + (i + 1) + '세트</span>';
    html += '<input type="text" id="set-weight-' + i + '" class="set-field" placeholder="kg" inputmode="decimal" value="' + esc(s.weight) + '">';
    html += '<span class="set-unit">kg</span>';
    html += '<input type="text" id="set-reps-' + i + '" class="set-field" placeholder="회" inputmode="numeric" value="' + esc(s.reps) + '">';
    html += '<span class="set-unit">회</span>';
    if (sets.length > 1) {
      html += '<button class="set-remove-btn" onclick="removeSet(' + i + ',\'' + esc(equipmentId) + '\')">−</button>';
    }
    html += '</div>';
  });
  html += '<div class="set-actions">';
  html += '<button class="btn-secondary" onclick="addSet(\'' + esc(equipmentId) + '\')">+ 세트 추가</button>';
  html += '<button class="btn-primary btn-save-record" onclick="saveRecord(\'' + esc(equipmentId) + '\')">저장하기</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

function renderRecordList(logs, equipmentId) {
  if (!logs || logs.length === 0) {
    return '<div class="empty-state">아직 기록이 없습니다.</div>';
  }

  // 날짜별 그룹핑
  var groups = {};
  var dateOrder = [];
  logs.forEach(function (log) {
    var d = log.workout_date;
    if (!groups[d]) {
      groups[d] = [];
      dateOrder.push(d);
    }
    groups[d].push(log);
  });

  var html = '';
  dateOrder.forEach(function (date) {
    var sets = groups[date];
    var weightMode = sets[0].weight_mode || 'total';
    var setsJson = JSON.stringify(sets.map(function (s) {
      return { weight: String(s.weight_kg || ''), reps: String(s.reps || '') };
    }));
    var displayDate = date.replace(/-/g, '.');

    // data-sets는 double-quote 속성 + HTML entity로 안전하게 저장
    var safeSetsJson = setsJson.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    html += '<div class="record-date-group" data-date="' + esc(date) + '" data-sets="' + safeSetsJson + '" data-weight-mode="' + esc(weightMode) + '">';
    html += '<div class="record-date-header" onclick="toggleRecordDetail(this)">';
    html += '<span class="record-date">' + esc(displayDate) + '</span>';
    html += '<span class="record-total">총 ' + sets.length + '세트</span>';
    html += '<span class="record-chevron">▶</span>';
    html += '</div>';
    html += '<div class="record-detail-area" style="display:none">';
    html += '<div class="record-sets">';
    sets.forEach(function (s) {
      var wkg = parseFloat(s.weight_kg) || 0;
      var mode = s.weight_mode || 'total';
      html += '<div class="record-set-row">';
      html += '<span class="record-arrow">→</span>';
      html += '<span>' + s.set_number + '세트</span>';
      html += '<span class="record-divider">/</span>';
      if (mode === 'single') {
        var totalKg = Math.round(wkg * 2 * 10) / 10;
        html += '<span class="record-weight-single">한쪽 ' + esc(String(wkg)) + 'kg</span>';
        html += '<span class="record-divider">/</span>';
        html += '<span class="record-weight-total">양쪽 ' + esc(String(totalKg)) + 'kg</span>';
      } else {
        html += '<span>' + esc(String(wkg)) + 'kg</span>';
      }
      html += '<span class="record-divider">/</span>';
      html += '<span>' + esc(String(s.reps || 0)) + '회</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '<button class="btn-edit-record" onclick="startEditRecord(\'' + esc(date) + '\',\'' + esc(equipmentId) + '\')">수정</button>';
    html += '</div>';
    html += '</div>';
  });

  return html;
}

function toggleRecordDetail(headerEl) {
  var group = headerEl.closest('.record-date-group');
  if (!group) return;
  var detail = group.querySelector('.record-detail-area');
  var chevron = headerEl.querySelector('.record-chevron');
  if (!detail) return;

  var isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.textContent = isOpen ? '▶' : '▼';
}

function renderEditMode(date, setsData, equipmentId, weightMode) {
  weightMode = weightMode || 'total';
  var displayDate = date.replace(/-/g, '.');
  var html = '<div class="record-date-header">';
  html += '<span class="record-date">' + esc(displayDate) + '</span>';
  html += '<span class="record-total record-editing">수정 중</span>';
  html += '</div>';
  html += renderWeightModeToggle(weightMode, 'edit-' + date);
  html += '<div class="edit-sets-form">';
  setsData.forEach(function (s, i) {
    html += '<div class="edit-set-row">';
    html += '<span class="set-label">' + (i + 1) + '세트</span>';
    html += '<input type="text" class="set-field edit-weight" inputmode="decimal" value="' + esc(s.weight) + '">';
    html += '<span class="set-unit">kg</span>';
    html += '<input type="text" class="set-field edit-reps" inputmode="numeric" value="' + esc(s.reps) + '">';
    html += '<span class="set-unit">회</span>';
    if (setsData.length > 1) {
      html += '<button class="set-remove-btn" onclick="removeEditSet(' + i + ',\'' + esc(date) + '\',\'' + esc(equipmentId) + '\')">−</button>';
    }
    html += '</div>';
  });
  html += '</div>';
  html += '<div class="edit-actions">';
  html += '<button class="btn-secondary" onclick="addEditSet(\'' + esc(date) + '\',\'' + esc(equipmentId) + '\')">+ 세트 추가</button>';
  html += '</div>';
  html += '<div class="edit-actions">';
  html += '<button class="btn-secondary btn-cancel" onclick="cancelEdit(\'' + esc(date) + '\',\'' + esc(equipmentId) + '\')">취소</button>';
  html += '<button class="btn-primary btn-save-edit" onclick="saveEditRecord(\'' + esc(date) + '\',\'' + esc(equipmentId) + '\')">저장</button>';
  html += '</div>';
  return html;
}
