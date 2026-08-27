/* =====================================================================
   데이터 연결 — 앱스 스크립트 엔진(config.js의 feedUrl)에서
   매물·뉴스·게시판을 받아옵니다.
   ▸ 매물 가공·블로그 연동·개인정보 제외는 모두 엔진에서 처리합니다.
   ▸ 2026-08-27: 샘플(가공) 데이터 폴백 제거.
     실패하면 지어낸 매물을 보여주는 대신 "불러오지 못했습니다"라고 말한다.
     개업 공인중개사 사이트에서 없는 매물이 진짜처럼 보이면 허위·과장광고가 된다.
     → 실패는 reject, 진짜로 매물이 0건이면 빈 배열. 화면이 둘을 구분해서 안내한다.
   ===================================================================== */
(function () {
  const CFG = window.BREEZE_CONFIG;

  function feedUrl(action) {
    const u = CFG.feedUrl || "";
    return u + (u.indexOf("?") > -1 ? "&" : "?") + "action=" + action;
  }

  // 엔진은 CORS 허용(Access-Control-Allow-Origin:*)이라 fetch로 직접 호출
  async function fetchFeed(action) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000); // 콜드스타트 대비 20초
    try {
      const res = await fetch(feedUrl(action), { signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function load(action, key) {
    if (!CFG.feedUrl) throw new Error("feedUrl 미설정");
    const data = await fetchFeed(action);
    return (data && data[key]) || [];
  }

  window.BreezeSheets = {
    getListings() { return load("listings", "listings"); },
    getNews() { return load("news", "news"); },
    getBoard() { return load("board", "board"); },
  };
})();
