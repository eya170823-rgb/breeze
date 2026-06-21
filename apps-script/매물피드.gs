/**
 * 브리즈부동산중개 — 홈페이지 매물 피드 (Google Apps Script)
 * ---------------------------------------------------------------------
 * 매물 탭들을 읽어, '캘린더' 칸에 공개표시(O / 홈페이지)된 매물만
 * 안전한 정보(개인정보 제외)로 추려서 홈페이지에 JSON 으로 전달합니다.
 *
 * ▣ 개인정보(소유자·임차인·의뢰인·전화·비공개메모·주소 등)는 절대 내보내지 않습니다.
 * ▣ 스크립트는 '소유자(나) 권한'으로 실행되므로, 시트는 비공개로 둬도 됩니다.
 *
 * 설치 방법은 '매물연동-가이드.md' 참고.
 */

// ① 홈페이지에 띄울 매물 탭 이름 — 실제 시트 탭 이름과 똑같이! (다르면 그 탭은 건너뜀)
var LISTING_TABS = [
  '아파트', '오피스텔', '원투룸', '연립다세대', '단독 다가구 상가주택',
  '상가', '상가건물', '공장 창고', '토지', '분양권', '기타매물'
];

// ② '캘린더' 칸에 이 중 하나가 적혀 있으면 공개 (대소문자 무관)
var PUBLISH_MARKS = ['O', 'o', 'ㅇ', '홈페이지', '공개', 'Y', 'y', 'V', 'v', '체크', '1', 'TRUE'];

// ③ 공개 표시 칸 (기본: 캘린더). 다른 칸을 쓰려면 이름만 바꾸세요.
var PUBLISH_COLUMN = '캘린더';

// ④ 주소·지도 숨길 종류 / 권리금 숨길 종류
var NO_ADDR_TYPES = ['상가', '상가건물', '토지', '공장 창고', '기타매물'];
var NO_KEYMONEY_TYPES = ['상가', '상가건물'];

function doGet(e) {
  var out = [];
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
        var g = function (name) {
          var i = col[name];
          return (i != null && row[i] != null) ? row[i] : '';
        };

        // 공개 표시 확인
        if (!isPublish(g(PUBLISH_COLUMN))) continue;

        var deal = String(g('구분')).trim();
        // 완료된 매물은 제외 (구분 칸에 거래완료/계약완료가 들어간 경우)
        if (/거래완료|계약완료|완료/.test(deal)) continue;
        var building = firstNonEmpty([g('건물명'), g('상호 건물명'), g('단지명'), g('상호')]);
        var hideAddr = NO_ADDR_TYPES.indexOf(tabName) !== -1;
        var dong = String(g('읍면동')).trim();
        var sigungu = String(g('시군구')).trim();
        var type2 = String(g('타입')).trim();
        var desc = cleanDesc(g('매물설명'));
        if (NO_KEYMONEY_TYPES.indexOf(tabName) !== -1) desc = stripKeyMoney(desc);
        var titleBase = building || (hideAddr ? tabName : (dong || tabName));

        out.push({
          key: String(g('key')).trim(),
          type: tabName,
          deal: deal,
          type2: type2,
          title: titleBase + (type2 ? ' ' + type2 : ''),
          price: priceFor(deal, g),
          priceVal: priceValFor(deal, g),
          location: hideAddr ? '' : joinSpace([sigungu, dong]),
          addr: hideAddr ? '' : joinSpace([sigungu, dong, building]),
          region: dong || '',
          noMap: hideAddr,
          area: areaText(g),
          floor: floorText(g('해당층'), g('총층')),
          direction: String(g('방향')).trim(),
          rooms: String(g('방수')).trim(),
          desc: desc,
          image: imageUrl(g('사진')),
          date: dateText(g('등록일'))
        });
      }
    });
  } catch (err) {
    return reply(e, { error: String(err), listings: [] });
  }
  // 최신순 정렬 (등록일 → key 순)
  out.sort(function (a, b) {
    var d = String(b.date).localeCompare(String(a.date));
    return d !== 0 ? d : String(b.key).localeCompare(String(a.key));
  });
  return reply(e, { listings: out });
}

// 공개 표시 판정 (마크 일치 또는 '홈페이지'/'공개' 포함)
function isPublish(v) {
  var mark = String(v || '').trim();
  if (!mark) return false;
  if (PUBLISH_MARKS.indexOf(mark) !== -1) return true;
  return /홈페이지|공개/.test(mark);
}

/* ---------- 응답 (JSONP 지원: CORS 우회) ---------- */
function reply(e, obj) {
  var json = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 보조 함수 ---------- */
function firstNonEmpty(arr) {
  for (var i = 0; i < arr.length; i++) {
    var v = String(arr[i] || '').trim();
    if (v) return v;
  }
  return '';
}
function joinSpace(arr) {
  return arr.map(function (v) { return String(v || '').trim(); }).filter(String).join(' ');
}
function buildTitle(building, type, dong) {
  var t = building || String(dong || '').trim() || '매물';
  var ty = String(type || '').trim();
  return ty ? (t + ' ' + ty) : t;
}
function floorText(cur, total) {
  cur = String(cur || '').trim();
  total = String(total || '').trim();
  if (cur && total) return cur + '/' + total;
  return cur || total || '';
}
function areaText(g) {
  var pyeong = firstNonEmpty([g('공급(평)'), g('전용(평)')]);
  var m2 = firstNonEmpty([g('공급㎡'), g('전용㎡')]);
  if (pyeong && m2) return m2 + '㎡ (' + pyeong + '평)';
  if (pyeong) return pyeong + '평';
  if (m2) return m2 + '㎡';
  return '';
}
function num(v) { return String(v || '').replace(/[, ]/g, ''); }

function priceFor(deal, g) {
  deal = String(deal || '').trim();
  if (deal === '매매') return num(g('매매가(만)'));
  if (deal === '전세') return num(g('전세금(만)'));
  var bo = num(g('보증금(만)'));
  var wol = num(g('월세(만)'));
  var label = (deal === '연세') ? '연' : '월';
  if (bo || wol) return '보증 ' + (bo || '0') + ' / ' + label + ' ' + (wol || '0');
  return '';
}
function priceValFor(deal, g) {
  deal = String(deal || '');
  var v;
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

// 사진: 웹주소(http)면 사용, 아니면 빈값 → 홈페이지 기본 썸네일 표시
function imageUrl(v) {
  var s = String(v || '').trim();
  if (/^https?:\/\//i.test(s)) return s.split(/[\s,]/)[0];
  return '';
}

// 상가/상가건물 권리금 금액 숨김
function stripKeyMoney(s) {
  return String(s || '').replace(/권리금?\s*[\d,]+\s*(억\s*)?(만\s*)?원?/g, '권리금 협의');
}

// 매물설명에서 다른 중개업소 정보/전화/URL 제거 (안전)
function cleanDesc(v) {
  var s = String(v || '');
  s = s.replace(/https?:\/\/\S+/g, '');
  s = s.replace(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '');
  s = s.replace(/[^\n]*중개사[^\n]*/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/\n{2,}/g, '\n').trim();
  return s.slice(0, 600);
}
