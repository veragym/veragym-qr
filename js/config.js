/* config.js — Supabase + 공통 유틸 */

var SUPABASE_URL = 'https://lrzffwawpoidimlrbfxe.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemZmd2F3cG9pZGltbHJiZnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDc0MjAsImV4cCI6MjA4OTcyMzQyMH0._AIkOKdjtOHC-igxg9toc-rq10KM3HVkjrgr1LOw-OI';
var db = null;

function initDB() {
  if (window.supabase) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
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
  var d = new Date();
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + 540);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
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

/* ── Supabase 쿼리 함수 (Phase 2 — 운동 기록) ── */
/* TODO: RLS 정책 강화 — 현재 anon open 상태 (Phase 3에서 Edge Function 프록시 도입 예정) */

async function upsertMember(phone) {
  if (!db) return { data: null, error: { message: 'DB not initialized' } };
  var res = await db.from('qr_members')
    .upsert({ phone: phone }, { onConflict: 'phone' });
  return res;
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
  var res = await db.from('qr_workout_logs').insert(rows);
  return res;
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
    for (var i = 0; i < sets.length; i++) {
      await db.from('qr_workout_logs')
        .update({ set_number: i + 1 })
        .eq('phone', phone)
        .eq('equipment_id', equipmentId)
        .eq('workout_date', date)
        .eq('set_number', -(i + 1));
    }

    return { data: null, error: null };
  } catch (e) {
    console.error('updateWorkoutSets failed:', e);
    showToast('기록 수정에 실패했습니다. 다시 시도해주세요.');
    return { data: null, error: e };
  }
}

async function deleteWorkoutDate(phone, equipmentId, date) {
  if (!db) return { error: { message: 'DB not initialized' } };
  var res = await db.from('qr_workout_logs')
    .delete()
    .eq('phone', phone)
    .eq('equipment_id', equipmentId)
    .eq('workout_date', date);
  return res;
}
