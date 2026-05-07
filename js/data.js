/* data.js — 운동기구 데이터 (Supabase qr_equipment 연동) */
/*
 * Phase 3: 정적 데이터 → Supabase DB 동적 로딩으로 전환
 * - EQUIPMENT: DB에서 로딩된 기구 배열 (앱 시작 시 채워짐)
 * - BODYPARTS: DB 데이터에서 자동 추출
 * - getCurrentBranch(): URL 파라미터에서 지점 코드 반환
 * - loadEquipmentFromDB(): DB에서 기구 데이터 로딩
 */

var EQUIPMENT = [];
var BODYPARTS = [];
var BODYPART_MAP = {};
var _equipmentLoaded = false;

/* ── 지점(branch) 관리 ── */

function getCurrentBranch() {
  // URL에서 ?branch=misa 파라미터 확인
  var params = new URLSearchParams(window.location.search);
  var branch = params.get('branch');
  if (branch) {
    localStorage.setItem('veragym_qr_branch', branch);
    return branch;
  }
  // localStorage fallback
  return localStorage.getItem('veragym_qr_branch') || 'misa';
}

/* ── DB에서 기구 데이터 로딩 ── */

async function loadEquipmentFromDB() {
  if (!db) {
    console.error('DB not initialized');
    return false;
  }

  var branch = getCurrentBranch();

  try {
    var res = await db.from('qr_equipment')
      .select('*')
      .eq('branch', branch)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (res.error) {
      console.error('loadEquipment failed:', res.error);
      return false;
    }

    if (!res.data || res.data.length === 0) {
      console.warn('No equipment data for branch:', branch);
      return false;
    }

    // DB 데이터 → 앱 형식으로 변환
    EQUIPMENT = res.data.map(function (row) {
      var category = mapBodypartCategory(row.bodypart || '');
      return {
        id: row.id,
        name: row.name,
        file_name: row.file_name,
        weight_type: row.weight_type,
        bodypart: category,
        bodypartName: category,
        bodypartDetail: row.bodypart || '',
        primaryMuscle: row.primary_muscle || '',
        secondaryMuscle: row.secondary_muscle || '',
        method: row.method || '',
        image: 'images/equipment/' + row.file_name + '.png',
        illustration: 'images/illustrations/' + row.file_name + '.png',
        adjustment: row.adjustments || [],
        trainerTips: row.trainer_tips || [],
        parent_id: row.parent_id || null,
        // 듀얼 머신 변환 GIF 파일명 배열 (없으면 빈 배열 → 섹션 숨김)
        setupGifs: row.setup_gifs || []
      };
    });

    // BODYPARTS 고정 6개 카테고리
    BODYPARTS = [
      { id: '가슴', name: '가슴', emoji: '🫁' },
      { id: '어깨', name: '어깨', emoji: '🏋️' },
      { id: '등', name: '등', emoji: '🔙' },
      { id: '팔', name: '팔', emoji: '💪' },
      { id: '하체', name: '하체', emoji: '🦵' },
      { id: '코어', name: '코어', emoji: '🔥' }
    ];
    BODYPART_MAP = {};
    BODYPARTS.forEach(function (b) { BODYPART_MAP[b.id] = b.name; });

    _equipmentLoaded = true;
    console.log('Equipment loaded:', EQUIPMENT.length, 'items for branch:', branch);
    return true;

  } catch (e) {
    console.error('loadEquipmentFromDB error:', e);
    return false;
  }
}

/* ── 부위 → 5대 카테고리 매핑 ── */

function mapBodypartCategory(part) {
  var map = {
    '가슴': '가슴', '가슴/팔': '가슴', '가슴(상부)': '가슴',
    '어깨': '어깨', '어깨 후면': '어깨',
    '등': '등', '등/팔': '등',
    '팔': '팔',
    '하체 전체': '하체', '엉덩이': '하체',
    '허벅지 앞쪽': '하체', '허벅지 뒤쪽': '하체',
    '허벅지 안쪽': '하체', '허벅지 바깥쪽': '하체',
    '코어': '코어', '복근': '코어', '복부': '코어'
  };
  return map[part] || part;
}

/* ── 조회 함수 ── */

function getEquipmentById(id) {
  for (var i = 0; i < EQUIPMENT.length; i++) {
    if (EQUIPMENT[i].id === id) return EQUIPMENT[i];
  }
  return null;
}

/* ── 부모/자식 관련 함수 ── */

function getParentEquipment() {
  return EQUIPMENT.filter(function (e) { return !e.parent_id; });
}

function getChildrenByParent(parentId) {
  return EQUIPMENT.filter(function (e) { return e.parent_id === parentId; });
}

function hasChildren(id) {
  for (var i = 0; i < EQUIPMENT.length; i++) {
    if (EQUIPMENT[i].parent_id === id) return true;
  }
  return false;
}

function getEquipmentByBodypartAll(part) {
  // 부위별 탭: 해당 부위의 부모기구 + 자식운동(부모 제외) 모두 표시
  return EQUIPMENT.filter(function (e) {
    if (e.bodypart !== part) return false;
    // 자식 운동이 있는 부모는 제외 (자식들이 개별로 나옴)
    if (!e.parent_id && hasChildren(e.id)) return false;
    return true;
  });
}
