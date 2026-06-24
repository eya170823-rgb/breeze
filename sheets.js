/* =====================================================================
   데이터 연결 — 앱스 스크립트 엔진(config.js의 feedUrl)에서
   매물·뉴스·게시판을 받아옵니다.
   ▸ 매물 가공·블로그 연동·개인정보 제외는 모두 엔진에서 처리합니다.
   ▸ 엔진이 비었거나 실패하면 sample-data.js 의 샘플을 보여줍니다 (빈 화면 방지).
   ===================================================================== */
(function () {
  const CFG = window.BREEZE_CONFIG;
  const SAMPLE = window.BREEZE_SAMPLE;

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
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function load(action, key, fallback) {
    if (!CFG.feedUrl) return fallback;
    try {
      const data = await fetchFeed(action);
      const list = (data && data[key]) || [];
      return list.length ? list : fallback;
    } catch (e) {
      console.warn(action + " 로드 실패 → 샘플 사용", e);
      return fallback;
    }
  }

  window.BreezeSheets = {
    getListings() { return load("listings", "listings", SAMPLE.listings); },
    getNews() { return load("news", "news", SAMPLE.news); },
    getBoard() { return load("board", "board", SAMPLE.board); },
  };
})();
