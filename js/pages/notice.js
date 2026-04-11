/* notice.js — 1p: 공지/이벤트 */

async function renderNotice() {
  updateHeader('공지사항', '');
  setActiveTab('');
  var app = document.getElementById('app');
  app.innerHTML = '<div class="page-loading">불러오는 중...</div>';

  var notices = [];
  if (db) {
    try {
      var today = getKSTDate();
      var res = await db.from('qr_notices')
        .select('id, title, content, image_url, created_at')
        .eq('is_active', true)
        .or('start_date.is.null,start_date.lte.' + today)
        .or('end_date.is.null,end_date.gte.' + today)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      if (!res.error && res.data) notices = res.data;
    } catch (e) {
      console.error('notice load failed:', e);
    }
  }

  var html = '<div class="notice-page">';
  if (notices.length === 0) {
    html += '<div class="notice-empty">현재 공지사항이 없습니다.</div>';
  } else {
    notices.forEach(function (n) {
      html += '<div class="notice-card">';
      html += '<h3 class="notice-title">' + esc(n.title) + '</h3>';
      html += '<p class="notice-date">' + esc(n.created_at ? n.created_at.slice(0, 10) : '') + '</p>';
      if (n.image_url) {
        html += '<img class="notice-img" src="' + esc(n.image_url) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
      }
      html += '<div class="notice-content">' + esc(sanitize(n.content)).replace(/\n/g, '<br>') + '</div>';
      html += '</div>';
    });
  }
  html += '<button class="btn-primary" onclick="location.hash=\'#/home\'">운동기구 보기</button>';
  html += '</div>';
  app.innerHTML = html;
}

async function hasActiveNotice() {
  if (!db) return false;
  try {
    var today = getKSTDate();
    var res = await db.from('qr_notices')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or('start_date.is.null,start_date.lte.' + today)
      .or('end_date.is.null,end_date.gte.' + today);
    if (!res.error && res.count > 0) return true;
  } catch (e) {
    console.error('notice check failed:', e);
  }
  return false;
}
