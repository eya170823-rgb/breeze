/**
 * 브리즈부동산중개 — 홈페이지 엔진 (Google Apps Script)
 * =====================================================================
 * 이 시트에 연결된 스크립트로 설치합니다. (확장 프로그램 → Apps Script)
 * 한 개의 웹앱으로 매물·뉴스·게시판을 모두 제공하고, 매일 등록일을 자동 갱신합니다.
 *
 * ▣ 개인정보(소유자·임차인·전화·비공개메모 등)는 절대 내보내지 않습니다.
 * ▣ 스크립트는 '소유자(나) 권한'으로 실행되므로, 시트는 비공개로 둬도 됩니다.
 *
 * [엔드포인트]  웹앱주소?action=listings  (기본: 매물)
 *               웹앱주소?action=news       (블로그 '부동산뉴스')
 *               웹앱주소?action=board      (블로그 '게시판')
 *
 * [자동화]      installDailyTriggers() 를 한 번 실행하면, 매일 아침 등록일이 자동 갱신됩니다.
 * 설치/배포 방법은 '엔진-설치가이드.md' 참고.
 */

/* ───────── 설정 ───────── */
// 이 엔진은 '별개(standalone) 프로젝트'로 만들어 기존 앱시트/캘린더 코드와 분리합니다.
var SHEET_ID = '1Jj3gSQz0b0vDZomKuEVf6WdFG8yGbp3HYEFRqiJDuOY'; // 매물 구글시트 ID
function getSS_() { return SpreadsheetApp.openById(SHEET_ID); }

var LISTING_TABS = [
  '아파트', '오피스텔', '원투룸', '연립다세대', '단독 다가구 상가주택',
  '상가', '상가건물', '공장 창고', '토지', '분양권', '기타매물'
];
var PUBLISH_FIELD = '등록자';     // 이 칸에 '광고완료'면 공개
var PUBLISH_MARK = '광고완료';

var NO_ADDR_TYPES = ['상가', '상가건물', '토지', '공장 창고', '기타매물']; // 주소·지도 숨김
var NO_KEYMONEY_TYPES = ['상가', '상가건물'];   // 권리금 금액 숨김
var NO_BIZNAME_TYPES = ['상가'];                // 상호 숨기고 업종으로
var STATUS_WORDS = ['공실', '임대중', '계약완료', '거래완료'];

// 블로그 자동 연동
var BLOG_RSS = 'https://rss.blog.naver.com/eya81.xml';
var NEWS_CATEGORY = '부동산뉴스';   // 이 카테고리 글 → 뉴스
var BOARD_CATEGORY = '게시판';      // 이 카테고리 글 → 게시판

/* ───────── 라우팅 (캐시 3분: 첫 로딩 빠르게) ───────── */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'listings';
  var key = 'breeze_' + action;
  var cache = CacheService.getScriptCache();
  var json = cache.get(key);
  if (!json) {
    var obj;
    try {
      if (action === 'news') obj = { news: getBlogPosts(NEWS_CATEGORY) };
      else if (action === 'board') obj = { board: getBlogPosts(BOARD_CATEGORY) };
      else obj = { listings: getListings() };
    } catch (err) { obj = { error: String(err) }; }
    json = JSON.stringify(obj);
    try { cache.put(key, json, 180); } catch (e2) {} // 3분 캐시 (100KB 초과 시 무시)
  }
  return reply(e, json);
}
// 시트 바꾼 걸 즉시 보고 싶을 때 한 번 실행 (캐시 비우기)
function clearCache() {
  CacheService.getScriptCache().removeAll(['breeze_listings', 'breeze_news', 'breeze_board']);
}

/* ───────── 매물 ───────── */
function getListings() {
  var ss = getSS_();
  var out = [];
  LISTING_TABS.forEach(function (tabName) {
    var sh = ss.getSheetByName(tabName);
    if (!sh) return;
    var values = sh.getDataRange().getValues();
    if (values.length < 2) return;
    var head = values[0].map(function (h) { return String(h).trim(); });
    var col = {};
    head.forEach(function (h, i) { if (col[h] == null) col[h] = i; });

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var g = function (name) { var i = col[name]; return (i != null && row[i] != null) ? row[i] : ''; };

      if (String(g(PUBLISH_FIELD)).indexOf(PUBLISH_MARK) === -1) continue; // 광고완료만

      var dealRaw = String(g('구분')).trim();
      var statusCol = String(g('상태')).trim();
      var status = statusCol, deal = dealRaw;
      if (!status && STATUS_WORDS.some(function (w) { return dealRaw.indexOf(w) > -1; })) { status = dealRaw; deal = ''; }
      if (!status) status = '공실';
      if (/거래완료/.test(status) || /거래완료/.test(dealRaw)) continue; // 거래완료(소멸) 제외

      var hideAddr = NO_ADDR_TYPES.indexOf(tabName) !== -1;
      var hideBiz = NO_BIZNAME_TYPES.indexOf(tabName) !== -1;
      var building = firstNonEmpty([g('아파트명'), g('건물명'), g('상호 건물명'), g('단지명'), g('상호')]);
      var dong = String(g('읍면동')).trim();
      var sigungu = String(g('시군구')).trim();
      var type2 = String(g('타입')).trim();
      var desc = cleanDesc(g('매물설명'));
      if (NO_KEYMONEY_TYPES.indexOf(tabName) !== -1) desc = stripKeyMoney(desc);

      var title;
      if (hideBiz) title = String(g('업종')).trim() || type2 || tabName;
      else if (tabName === '아파트') title = [dong, building].filter(function (x) { return x; }).join(' ') || tabName;
      else if (tabName === '원투룸') title = [dong, type2].filter(function (x) { return x; }).join(' ') || tabName;
      else title = (building || (hideAddr ? tabName : (dong || tabName))) + (type2 ? ' ' + type2 : '');

      out.push({
        key: String(g('key')).trim(),
        type: tabName, deal: deal, status: status, title: title,
        price: priceFor(deal, g), priceVal: priceValFor(deal, g),
        location: hideAddr ? '' : joinSpace([sigungu, dong]),
        addr: hideAddr ? '' : joinSpace([sigungu, dong, building]),
        region: dong || '', noMap: hideAddr,
        area: areaText(g), floor: floorText(g('해당층'), g('총층')),
        direction: String(g('방향')).trim(), rooms: String(g('방수')).trim(),
        desc: desc, image: imageUrl(g('사진')), date: dateText(g('등록일'))
      });
    }
  });
  out.sort(function (a, b) {
    var d = String(b.date).localeCompare(String(a.date));
    return d !== 0 ? d : String(b.key).localeCompare(String(a.key));
  });
  return out;
}

/* ───────── 블로그(뉴스·게시판) ───────── */
function getBlogPosts(category) {
  var res = UrlFetchApp.fetch(BLOG_RSS, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return [];
  var xml = res.getContentText();
  var items = xml.split('<item>').slice(1);
  var posts = [];
  items.forEach(function (it) {
    var cat = tagVal(it, 'category');
    if (category && cat.indexOf(category) === -1) return;
    posts.push({
      title: tagVal(it, 'title'),
      body: stripTags(tagVal(it, 'description')).slice(0, 180),
      category: cat || '블로그',
      date: String(tagVal(it, 'pubDate')).slice(0, 16),
      link: tagVal(it, 'link')
    });
  });
  return posts;
}
function tagVal(s, tag) {
  var m = s.match(new RegExp('<' + tag + '>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</' + tag + '>'));
  return m ? m[1].trim() : '';
}
function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

/* ───────── 자동화: 매일 등록일 갱신 ───────── */
function bumpRegistrationDates() {
  var ss = getSS_();
  var today = new Date();
  LISTING_TABS.forEach(function (tabName) {
    var sh = ss.getSheetByName(tabName);
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return;
    var head = data[0].map(function (h) { return String(h).trim(); });
    var col = {}; head.forEach(function (h, i) { col[h] = i; });
    var rCol = col[PUBLISH_FIELD], dCol = col['등록일'];
    if (rCol == null || dCol == null) return;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][rCol]).indexOf(PUBLISH_MARK) > -1) {
        sh.getRange(r + 1, dCol + 1).setValue(today);
      }
    }
  });
}
// 엔진을 미리 깨워서 매물 캐시를 항상 준비해 둠 (첫 손님도 빠르게)
function warmUp() {
  var cache = CacheService.getScriptCache();
  try { cache.put('breeze_listings', JSON.stringify({ listings: getListings() }), 600); } catch (e) {}
}
// ★ 한 번만 실행: 매일 등록일 자동 갱신 + 5분마다 엔진 예열 예약
function installDailyTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'bumpRegistrationDates' || f === 'warmUp') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('bumpRegistrationDates').timeBased().everyDays(1).atHour(7).create();
  ScriptApp.newTrigger('warmUp').timeBased().everyMinutes(5).create();
}

/* ───────── 응답(JSONP) ───────── */
function reply(e, obj) {
  var json = (typeof obj === 'string') ? obj : JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ───────── 보조 함수 ───────── */
function firstNonEmpty(a) { for (var i = 0; i < a.length; i++) { var v = String(a[i] || '').trim(); if (v) return v; } return ''; }
function joinSpace(a) { return a.map(function (v) { return String(v || '').trim(); }).filter(String).join(' '); }
function floorText(c, t) { c = String(c || '').trim(); t = String(t || '').trim(); return (c && t) ? c + '/' + t : (c || t || ''); }
function areaText(g) {
  var py = firstNonEmpty([g('공급(평)'), g('전용(평)')]);
  var m2 = firstNonEmpty([g('공급㎡'), g('전용㎡')]);
  if (py && m2) return m2 + '㎡ (' + py + '평)';
  return py ? py + '평' : (m2 ? m2 + '㎡' : '');
}
function num(v) { return String(v == null ? '' : v).replace(/[, ]/g, ''); }
function priceFor(deal, g) {
  deal = String(deal || '');
  if (/매매/.test(deal)) return num(g('매매가(만)'));
  if (/전세/.test(deal)) return num(g('전세금(만)'));
  var bo = num(g('보증금(만)')), wol = num(g('월세(만)')), label = /연세/.test(deal) ? '연' : '월';
  return (bo || wol) ? '보증 ' + (bo || '0') + ' / ' + label + ' ' + (wol || '0') : '';
}
function priceValFor(deal, g) {
  deal = String(deal || ''); var v;
  if (/매매/.test(deal)) v = num(g('매매가(만)'));
  else if (/전세/.test(deal)) v = num(g('전세금(만)'));
  else v = num(g('보증금(만)'));
  return parseInt(v, 10) || 0;
}
function dateText(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
  }
  return String(v || '').slice(0, 10);
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function imageUrl(v) { var s = String(v || '').trim(); return /^https?:\/\/.+\.(jpe?g|png|gif|webp)/i.test(s) ? s.split(/[\s,]/)[0] : ''; }
function stripKeyMoney(s) { return String(s || '').replace(/권리금?\s*[\d,]+\s*(억\s*)?(만\s*)?원?/g, '권리금 협의'); }
function cleanDesc(v) {
  var s = String(v || '');
  s = s.replace(/https?:\/\/\S+/g, '');
  s = s.replace(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '');
  s = s.replace(/[^\n]*중개사[^\n]*/g, '');
  return s.replace(/[ \t]{2,}/g, ' ').replace(/\n{2,}/g, '\n').trim().slice(0, 600);
}
