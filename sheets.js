/* =====================================================================
   구글 시트 연동 모듈
   ---------------------------------------------------------------------
   공개(뷰어 공유)된 구글 시트를 gviz JSON 으로 읽어와서
   매물/소식 데이터를 JS 객체 배열로 변환합니다. (서버 불필요)

   ▸ 매물 탭 권장 컬럼(첫 행 머리글):
     매물종류 | 거래유형 | 제목 | 가격 | 위치 | 면적 | 층 | 방향 | 설명 | 이미지URL | 상태 | 등록일
   ▸ 소식 탭 권장 컬럼:
     제목 | 내용 | 카테고리 | 날짜 | 링크 | 이미지URL
   ===================================================================== */

(function () {
  const CFG = window.BREEZE_CONFIG;

  // gviz 응답에서 순수 JSON만 추출
  function parseGviz(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return JSON.parse(text.slice(start, end + 1));
  }

  // gviz table → [{머리글:값, ...}, ...]
  function tableToRows(table) {
    const headers = table.cols.map((c, i) => (c.label || `col${i}`).trim());
    return table.rows
      .map((r) => {
        const obj = {};
        (r.c || []).forEach((cell, i) => {
          obj[headers[i]] = cell && cell.v != null ? cell.v : "";
        });
        return obj;
      })
      .filter((row) => Object.values(row).some((v) => String(v).trim() !== ""));
  }

  async function fetchTab(tabName) {
    if (!CFG.sheetId) return null; // 시트 미설정 → 샘플 사용
    const url =
      `https://docs.google.com/spreadsheets/d/${CFG.sheetId}` +
      `/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
    const res = await fetch(url);
    const text = await res.text();
    return tableToRows(parseGviz(text).table);
  }

  // 머리글 이름이 조금 달라도 최대한 매칭
  function pick(row, names, fallback = "") {
    for (const n of names) {
      const key = Object.keys(row).find(
        (k) => k.replace(/\s/g, "").toLowerCase() === n.replace(/\s/g, "").toLowerCase()
      );
      if (key && String(row[key]).trim() !== "") return row[key];
    }
    return fallback;
  }

  function normalizeListing(row) {
    return {
      type: pick(row, ["매물종류", "종류", "type"], "기타"),
      deal: pick(row, ["거래유형", "거래", "deal"], "매매"),
      title: pick(row, ["제목", "title"], "매물"),
      price: pick(row, ["가격", "금액", "price"], ""),
      location: pick(row, ["위치", "주소", "location"], ""),
      area: pick(row, ["면적", "평수", "area"], ""),
      floor: pick(row, ["층", "floor"], ""),
      direction: pick(row, ["방향", "향", "direction"], ""),
      desc: pick(row, ["설명", "비고", "desc"], ""),
      image: pick(row, ["이미지URL", "이미지", "사진", "image"], ""),
      status: pick(row, ["상태", "공개", "status"], "공개"),
      date: pick(row, ["등록일", "날짜", "date"], ""),
    };
  }

  function normalizeNews(row) {
    return {
      title: pick(row, ["제목", "title"], ""),
      body: pick(row, ["내용", "본문", "body"], ""),
      category: pick(row, ["카테고리", "분류", "category"], "소식"),
      date: pick(row, ["날짜", "등록일", "date"], ""),
      link: pick(row, ["링크", "url", "link"], ""),
      image: pick(row, ["이미지URL", "이미지", "image"], ""),
    };
  }

  function normalizeBoard(row) {
    return {
      title: pick(row, ["제목", "title"], ""),
      body: pick(row, ["내용", "본문", "body"], ""),
      category: pick(row, ["카테고리", "분류", "category"], "공지"),
      author: pick(row, ["작성자", "글쓴이", "author"], "BREEZE"),
      date: pick(row, ["날짜", "등록일", "date"], ""),
    };
  }

  // 공개로 표시된(숨김이 아닌) 매물만
  function isVisible(l) {
    const s = String(l.status).replace(/\s/g, "");
    return !["숨김", "비공개", "hide", "false", "x", "X"].includes(s);
  }

  /* ===================================================================
     앱시트형 시트(종류별 탭) 직접 읽기 — 앱스 스크립트 배포 전 테스트용
     '캘린더' 칸 공개표시 + 완료 제외 + 안전한 열만 (개인정보 제외)
     =================================================================== */
  const LISTING_TABS = [
    "아파트", "오피스텔", "원투룸", "연립다세대", "단독 다가구 상가주택",
    "상가", "상가건물", "공장 창고", "토지", "분양권", "기타매물",
  ];
  const PUB_MARKS = ["O", "o", "ㅇ", "홈페이지", "공개", "Y", "y", "V", "v", "체크", "1", "TRUE"];
  function isPublishMark(v) {
    const s = String(v || "").trim();
    if (!s) return false;
    if (PUB_MARKS.includes(s)) return true;
    return /홈페이지|공개/.test(s);
  }
  function numStr(v) { return String(v == null ? "" : v).replace(/[, ]/g, ""); }
  function feedDate(v) {
    const s = String(v || "");
    const m = s.match(/^Date\((\d+),(\d+),(\d+)/);
    if (m) return m[1] + "-" + String(+m[2] + 1).padStart(2, "0") + "-" + String(+m[3]).padStart(2, "0");
    return s.slice(0, 10);
  }
  function feedPrice(deal, row) {
    deal = String(deal || "");
    if (/매매/.test(deal)) return numStr(pick(row, ["매매가(만)"]));
    if (/전세/.test(deal)) return numStr(pick(row, ["전세금(만)"]));
    const bo = numStr(pick(row, ["보증금(만)"]));
    const wol = numStr(pick(row, ["월세(만)"]));
    const label = /연세/.test(deal) ? "연" : "월";
    if (bo || wol) return "보증 " + (bo || "0") + " / " + label + " " + (wol || "0");
    return "";
  }
  function feedArea(row) {
    const py = pick(row, ["공급(평)", "전용(평)"]);
    const m2 = pick(row, ["공급㎡", "전용㎡"]);
    if (py && m2) return m2 + "㎡ (" + py + "평)";
    if (py) return py + "평";
    if (m2) return m2 + "㎡";
    return "";
  }
  function feedFloor(row) {
    const c = String(pick(row, ["해당층"]) || "").trim();
    const t = String(pick(row, ["총층"]) || "").trim();
    if (c && t) return c + "/" + t;
    return c || t || "";
  }
  function feedImage(v) {
    const s = String(v || "").trim();
    return /^https?:\/\//i.test(s) ? s.split(/[\s,]/)[0] : "";
  }
  function cleanDesc(v) {
    let s = String(v || "");
    s = s.replace(/https?:\/\/\S+/g, "");
    s = s.replace(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, "");
    s = s.replace(/[^\n]*중개사[^\n]*/g, "");
    return s.replace(/[ \t]{2,}/g, " ").replace(/\n{2,}/g, "\n").trim().slice(0, 600);
  }
  function feedPriceVal(deal, row) {
    deal = String(deal || "");
    let v;
    if (/매매/.test(deal)) v = numStr(pick(row, ["매매가(만)"]));
    else if (/전세/.test(deal)) v = numStr(pick(row, ["전세금(만)"]));
    else v = numStr(pick(row, ["보증금(만)"]));
    return parseInt(v, 10) || 0;
  }
  // 주소·지도 숨길 종류 / 권리금 숨길 종류
  const NO_ADDR_TYPES = ["상가", "상가건물", "토지", "공장 창고", "기타매물"];
  const NO_KEYMONEY_TYPES = ["상가", "상가건물"];
  function stripKeyMoney(s) {
    return String(s || "").replace(/권리금?\s*[\d,]+\s*(억\s*)?(만\s*)?원?/g, "권리금 협의");
  }
  function mapSheetRow(row, tabName) {
    const deal = String(pick(row, ["구분"]) || "").trim();
    if (/거래완료|계약완료|완료/.test(deal)) return null; // 완료 매물 제외
    const hideAddr = NO_ADDR_TYPES.includes(tabName);
    const building = pick(row, ["건물명", "상호 건물명", "단지명", "상호"]);
    const dong = pick(row, ["읍면동"]);
    const sigungu = pick(row, ["시군구"]);
    const type2 = pick(row, ["타입"]);
    let desc = cleanDesc(pick(row, ["매물설명"]));
    if (NO_KEYMONEY_TYPES.includes(tabName)) desc = stripKeyMoney(desc);
    const titleBase = building || (hideAddr ? tabName : dong || tabName);
    return {
      key: pick(row, ["key"]),
      type: tabName,
      deal: deal,
      title: titleBase + (type2 ? " " + type2 : ""),
      price: feedPrice(deal, row),
      priceVal: feedPriceVal(deal, row),
      location: hideAddr ? "" : [sigungu, dong].filter(Boolean).join(" "),
      addr: hideAddr ? "" : [sigungu, dong, building].filter(Boolean).join(" "),
      region: dong || "",
      noMap: hideAddr,
      area: feedArea(row),
      floor: feedFloor(row),
      direction: pick(row, ["방향"]),
      rooms: pick(row, ["방수"]),
      desc: desc,
      image: feedImage(pick(row, ["사진"])),
      date: feedDate(pick(row, ["등록일"])),
    };
  }
  async function getListingsMultiTab() {
    const groups = await Promise.all(
      LISTING_TABS.map(async (tab) => {
        try {
          const rows = await fetchTab(tab);
          if (!rows) return [];
          return rows
            .filter((r) => isPublishMark(pick(r, ["캘린더"])))
            .map((r) => mapSheetRow(r, tab))
            .filter(Boolean);
        } catch (e) {
          return [];
        }
      })
    );
    const all = [].concat.apply([], groups);
    all.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return all;
  }

  // 앱스 스크립트 피드(JSONP) — CORS 우회용
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      const cb = "__breezeFeed_" + Date.now();
      const s = document.createElement("script");
      const timer = setTimeout(function () { cleanup(); reject(new Error("feed timeout")); }, 10000);
      function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
      window[cb] = function (data) { cleanup(); resolve(data); };
      s.onerror = function () { cleanup(); reject(new Error("feed error")); };
      s.src = url + (url.indexOf("?") > -1 ? "&" : "?") + "callback=" + cb;
      document.head.appendChild(s);
    });
  }

  // 네이버 블로그 RSS → 글 목록 (rss2json 으로 변환, CORS 허용)
  function stripHtml(s) { return String(s).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
  function firstImg(s) { const m = String(s).match(/<img[^>]+src=["']([^"']+)["']/i); return m ? m[1] : ""; }
  function decodeEnt(s) {
    return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  async function fetchBlogPosts(rssUrl) {
    const api = "https://api.rss2json.com/v1/api.json?count=20&rss_url=" + encodeURIComponent(rssUrl);
    const res = await fetch(api);
    const data = await res.json();
    if (!data || data.status !== "ok" || !data.items) return null;
    return data.items.map((it) => ({
      title: decodeEnt(it.title || ""),
      body: stripHtml(it.description || it.content || "").slice(0, 180),
      category: (it.categories && it.categories[0]) || "블로그",
      cats: it.categories || [],
      date: String(it.pubDate || "").slice(0, 10),
      link: it.link || "",
      image: it.thumbnail || firstImg(it.content || it.description || "") || "",
    }));
  }
  function postInCat(p, cat) {
    if (!cat) return false;
    return (p.cats || []).some((c) => String(c).indexOf(cat) > -1) || String(p.category).indexOf(cat) > -1;
  }

  window.BreezeSheets = {
    async getListings() {
      // 1순위: 앱스 스크립트 피드 (개인정보 안전 + 캘린더 공개표시 기준)
      if (CFG.feedUrl) {
        try {
          const data = await jsonp(CFG.feedUrl);
          const list = (data && data.listings) || [];
          return list.length ? list : window.BREEZE_SAMPLE.listings;
        } catch (e) {
          console.warn("매물 피드 로드 실패 → 샘플 사용", e);
          return window.BREEZE_SAMPLE.listings;
        }
      }
      // 2순위: 공개 구글시트(gviz) — 종류별 탭 + 캘린더 공개표시 / 3순위: 샘플
      if (CFG.sheetId) {
        try {
          const list = await getListingsMultiTab();
          return list.length ? list : window.BREEZE_SAMPLE.listings;
        } catch (e) {
          console.warn("매물 시트 로드 실패 → 샘플 사용", e);
          return window.BREEZE_SAMPLE.listings;
        }
      }
      return window.BREEZE_SAMPLE.listings;
    },
    async getNews() {
      // 1순위: 블로그 '뉴스 카테고리' → 2순위: 시트 → 3순위: 샘플
      const b = CFG.blog || {};
      if (b.rss && b.newsCategory) {
        try {
          const posts = await fetchBlogPosts(b.rss);
          const list = (posts || []).filter((p) => postInCat(p, b.newsCategory));
          if (list.length) return list;
        } catch (e) {
          console.warn("블로그(뉴스) 로드 실패 → 시트/샘플", e);
        }
      }
      try {
        const rows = await fetchTab(CFG.newsTab);
        if (!rows) return window.BREEZE_SAMPLE.news;
        const list = rows.map(normalizeNews).filter((n) => n.title);
        return list.length ? list : window.BREEZE_SAMPLE.news;
      } catch (e) {
        console.warn("소식 시트 로드 실패 → 샘플 사용", e);
        return window.BREEZE_SAMPLE.news;
      }
    },
    async getBoard() {
      // 1순위: 블로그 '게시판 카테고리' → 2순위: 시트 → 3순위: 샘플
      const b = CFG.blog || {};
      if (b.rss && b.boardCategory) {
        try {
          const posts = await fetchBlogPosts(b.rss);
          const list = (posts || [])
            .filter((p) => postInCat(p, b.boardCategory))
            .map((p) => ({ title: p.title, body: p.body, category: p.category || "게시판", author: "BREEZE", date: p.date, link: p.link }));
          if (list.length) return list;
        } catch (e) {
          console.warn("블로그(게시판) 로드 실패 → 시트/샘플", e);
        }
      }
      try {
        const rows = await fetchTab(CFG.boardTab);
        if (!rows) return window.BREEZE_SAMPLE.board;
        const list = rows.map(normalizeBoard).filter((b) => b.title);
        return list.length ? list : window.BREEZE_SAMPLE.board;
      } catch (e) {
        console.warn("게시판 시트 로드 실패 → 샘플 사용", e);
        return window.BREEZE_SAMPLE.board;
      }
    },
  };
})();
