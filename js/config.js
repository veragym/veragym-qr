/* config.js — Supabase + 공통 유틸 */

var SUPABASE_URL = 'https://lrzffwawpoidimlrbfxe.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemZmd2F3cG9pZGltbHJiZnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDc0MjAsImV4cCI6MjA4OTcyMzQyMH0._AIkOKdjtOHC-igxg9toc-rq10KM3HVkjrgr1LOw-OI';
var db = null;

// 이미지 캐시 버전 — 사진 교체 시 +1 (브라우저/CDN/SW 캐시 무효화용)
var IMG_VERSION = '20';

function initDB() {
  if (!window.supabase) {
    console.error('Supabase library not loaded. Check network/CDN.');
    return;
  }
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
}

function esc(str) {
  if (str == null) return '';
  var d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function sanitize(str) {
  if (str == null) return '';
  return String(str).replace(/<[^>]*>/g, '');
}

function showToast(msg, duration) {
  duration = duration || 2500;
  var el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(function () {
    el.classList.remove('show');
  }, duration);
}

/* ── 타임존 유틸 ── */

function getKSTDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

/* ── 전화번호 유틸 ── */

function formatPhone(val) {
  var nums = val.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return nums.slice(0, 3) + '-' + nums.slice(3);
  return nums.slice(0, 3) + '-' + nums.slice(3, 7) + '-' + nums.slice(7);
}

function isValidPhone(phone) {
  return /^010-\d{4}-\d{4}$/.test(phone);
}

function getStoredPhone() {
  return localStorage.getItem('veragym_qr_phone') || '';
}

function setStoredPhone(phone) {
  localStorage.setItem('veragym_qr_phone', phone);
}

/* ── QR 세션 관리 (3시간 제한) ── */
var SESSION_LIMIT_MS = 3 * 60 * 60 * 1000; // 3시간

function startSession() {
  localStorage.setItem('veragym_qr_session', Date.now().toString());
}

function getSessionStart() {
  var t = localStorage.getItem('veragym_qr_session');
  return t ? parseInt(t, 10) : 0;
}

function isSessionValid() {
  var start = getSessionStart();
  if (!start) return false;
  return (Date.now() - start) < SESSION_LIMIT_MS;
}

function getSessionRemaining() {
  var start = getSessionStart();
  if (!start) return 0;
  var remaining = SESSION_LIMIT_MS - (Date.now() - start);
  return remaining > 0 ? remaining : 0;
}

function clearSession() {
  localStorage.removeItem('veragym_qr_session');
}

function renderExpiredScreen() {
  var app = document.getElementById('app');
  if (!app) return;
  var header = document.getElementById('top-header');
  if (header) header.style.display = 'none';
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'none';

  app.innerHTML = '<div class="session-expired">' +
    '<div class="expired-icon">⏰</div>' +
    '<h2 class="expired-title">이용 시간이 만료되었습니다</h2>' +
    '<p class="expired-desc">헬스장 기구의 QR 코드를<br>다시 스캔해주세요</p>' +
    '<div class="expired-info">이용 시간: 3시간</div>' +
    '</div>';
}

/* ── Supabase 쿼리 함수 (Phase 2 — 운동 기록) ── */
/* TODO: RLS 정책 강화 — 현재 anon open 상태 (Phase 3에서 Edge Function 프록시 도입 예정) */

async function upsertMember(phone) {
  if (!db) return { data: null, error: { message: 'DB not initialized' } };
  try {
    return await db.from('qr_members')
      .upsert({ phone: phone }, { onConflict: 'phone' });
  } catch (e) {
    console.error('upsertMember failed:', e);
    return { data: null, error: e };
  }
}

async function checkMemberExists(phone) {
  if (!db) return { exists: false, count: 0 };
  try {
    var res = await db.from('qr_workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone);
    if (!res.error) {
      return { exists: res.count > 0, count: res.count || 0 };
    }
  } catch (e) {
    console.error('checkMemberExists failed:', e);
  }
  return { exists: false, count: 0 };
}

async function saveWorkoutSets(phone, equipmentId, date, sets, weightMode) {
  if (!db) return { data: null, error: { message: 'DB not initialized' } };
  weightMode = weightMode || 'total';
  try {
    var rows = sets.map(function (s, i) {
      return {
        phone: phone,
        equipment_id: equipmentId,
        workout_date: date,
        set_number: i + 1,
        weight_kg: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        weight_mode: weightMode
      };
    });
    return await db.from('qr_workout_logs').insert(rows);
  } catch (e) {
    console.error('saveWorkoutSets failed:', e);
    return { data: null, error: e };
  }
}

async function getWorkoutLogs(phone, equipmentId) {
  if (!db) return { data: [], error: null };
  var res = await db.from('qr_workout_logs')
    .select('*')
    .eq('phone', phone)
    .eq('equipment_id', equipmentId)
    .order('workout_date', { ascending: false })
    .order('set_number', { ascending: true })
    .limit(500);
  if (res.error) {
    console.error('getWorkoutLogs failed:', res.error);
    return { data: [], error: res.error };
  }
  return { data: res.data || [], error: null };
}

async function checkTodayRecord(phone, equipmentId, date) {
  if (!db) return false;
  try {
    var res = await db.from('qr_workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .eq('equipment_id', equipmentId)
      .eq('workout_date', date);
    if (!res.error && res.count > 0) return true;
  } catch (e) {
    console.error('checkTodayRecord failed:', e);
  }
  return false;
}

async function updateWorkoutSets(phone, equipmentId, date, sets, weightMode) {
  if (!db) return { data: null, error: { message: 'DB not initialized' } };
  weightMode = weightMode || 'total';
  try {
    // 안전한 순서: 신규 세트 먼저 삽입 (임시 날짜) → 기존 삭제 → 날짜 복원
    // Supabase는 클라이언트 트랜잭션을 지원하지 않으므로, 삭제 실패 시 데이터 보존을 위해
    // insert → delete 순서로 진행
    var rows = sets.map(function (s, i) {
      return {
        phone: phone,
        equipment_id: equipmentId,
        workout_date: date,
        set_number: -(i + 1),
        weight_kg: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        weight_mode: weightMode
      };
    });

    // Step 1: 새 세트를 음수 set_number로 삽입 (기존과 충돌 방지)
    var insRes = await db.from('qr_workout_logs').insert(rows);
    if (insRes.error) throw insRes.error;

    // Step 2: 기존 세트 삭제 (양수 set_number만)
    var delRes = await db.from('qr_workout_logs')
      .delete()
      .eq('phone', phone)
      .eq('equipment_id', equipmentId)
      .eq('workout_date', date)
      .gt('set_number', 0);
    if (delRes.error) {
      console.error('delete old sets failed, but new sets are saved:', delRes.error);
    }

    // Step 3: 음수 set_number를 양수로 변환
    var updateFailed = false;
    for (var i = 0; i < sets.length; i++) {
      var upRes = await db.from('qr_workout_logs')
        .update({ set_number: i + 1 })
        .eq('phone', phone)
        .eq('equipment_id', equipmentId)
        .eq('workout_date', date)
        .eq('set_number', -(i + 1));
      if (upRes.error) {
        console.error('set_number update failed for set', i + 1, upRes.error);
        updateFailed = true;
        break;
      }
    }

    // Step 3 실패 시: 남은 음수 set_number를 양수로 일괄 정리
    if (updateFailed) {
      for (var j = 0; j < sets.length; j++) {
        await db.from('qr_workout_logs')
          .update({ set_number: j + 1 })
          .eq('phone', phone)
          .eq('equipment_id', equipmentId)
          .eq('workout_date', date)
          .eq('set_number', -(j + 1));
      }
    }

    return { data: null, error: null };
  } catch (e) {
    // 예외 발생 시에도 음수 set_number 잔류 방지
    try {
      await db.from('qr_workout_logs')
        .delete()
        .eq('phone', phone)
        .eq('equipment_id', equipmentId)
        .eq('workout_date', date)
        .lt('set_number', 0);
    } catch (cleanupErr) {
      console.error('cleanup negative set_numbers failed:', cleanupErr);
    }
    console.error('updateWorkoutSets failed:', e);
    showToast('기록 수정에 실패했습니다. 다시 시도해주세요.');
    return { data: null, error: e };
  }
}

async function deleteWorkoutDate(phone, equipmentId, date) {
  if (!db) return { error: { message: 'DB not initialized' } };
  try {
    return await db.from('qr_workout_logs')
      .delete()
      .eq('phone', phone)
      .eq('equipment_id', equipmentId)
      .eq('workout_date', date);
  } catch (e) {
    console.error('deleteWorkoutDate failed:', e);
    return { data: null, error: e };
  }
}
