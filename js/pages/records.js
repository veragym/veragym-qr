/* records.js — 기록보기 탭 (Phase 2) */

function renderRecords() {
  updateHeader('운동 기록', '기구를 선택해 기록하세요');
  setActiveTab('records');
  var phone = getStoredPhone();

  if (!phone) {
    renderPhoneInput();
    return;
  }

  renderRecordEquipmentList();
}

function renderPhoneInput() {
  var app = document.getElementById('app');
  var html = '<div class="phone-input-page">';
  html += '<div class="phone-input-card">';
  html += '<p class="phone-desc">입력한 번호로 운동 기록이 저장됩니다.</p>';
  html += '<input type="tel" id="phone-input" class="phone-field" placeholder="010-0000-0000" inputmode="numeric" maxlength="13" autocomplete="tel">';
  html += '<p class="phone-notice">* 회원 등록 시 사용한 본인 번호를 입력해주세요</p>';
  html += '<button class="btn-primary" id="btn-phone-submit" onclick="submitPhone()">시작하기</button>';
  html += '</div>';
  html += '</div>';
  app.innerHTML = html;

  var input = document.getElementById('phone-input');
  if (input) {
    input.addEventListener('input', function () {
      this.value = formatPhone(this.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitPhone();
    });
  }
}

async function submitPhone() {
  var input = document.getElementById('phone-input');
  if (!input) return;
  var phone = input.value.trim();

  if (!isValidPhone(phone)) {
    showToast('010-0000-0000 형식으로 입력해주세요.');
    return;
  }

  var btn = document.getElementById('btn-phone-submit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '확인 중...';
  }

  try {
    var memberInfo = await checkMemberExists(phone);
    var res = await upsertMember(phone);
    if (res.error) {
      console.error('upsertMember failed:', res.error);
      showToast('등록에 실패했습니다. 다시 시도해주세요.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '시작하기';
      }
      return;
    }

    setStoredPhone(phone);

    if (memberInfo.exists) {
      showToast('기존 기록 ' + memberInfo.count + '건을 불러왔습니다.');
    } else {
      showToast('등록되었습니다.');
    }

    renderRecordEquipmentList();
  } catch (e) {
    console.error('submitPhone failed:', e);
    showToast('오류가 발생했습니다.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '시작하기';
    }
  }
}

function renderRecordEquipmentList() {
  updateHeader('운동 기록', '기구를 선택해 기록하세요');
  setActiveTab('records');
  var app = document.getElementById('app');

  if (!EQUIPMENT || EQUIPMENT.length === 0) {
    app.innerHTML = '<div class="empty-state">등록된 기구가 없습니다.</div>';
    return;
  }

  // 부모 기구만 표시 (홈과 동일), mode=record 링크로 변경
  var partOrder = { '가슴': 0, '어깨': 1, '등': 2, '팔': 3, '하체': 4, '코어': 5 };
  var sorted = getParentEquipment().slice().sort(function (a, b) {
    var pa = partOrder[a.bodypartName] !== undefined ? partOrder[a.bodypartName] : 99;
    var pb = partOrder[b.bodypartName] !== undefined ? partOrder[b.bodypartName] : 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, 'ko');
  });
  app.innerHTML = renderEquipmentGrid(sorted, 'record');
}
