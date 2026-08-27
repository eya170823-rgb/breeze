/* =====================================================================
   BREEZE — 앱 로직 (멀티페이지 공용)
   layout.js 가 헤더/푸터/모달을 먼저 주입한 뒤 실행됩니다.
   각 페이지에 존재하는 요소만 골라서 렌더링합니다.
   ===================================================================== */

(function () {
  const CFG = window.BREEZE_CONFIG;
  const telHref = "tel:" + CFG.phone.replace(/[^0-9+]/g, "");

  const smsHref = "sms:" + CFG.phone.replace(/[^0-9+]/g, "");

  /* ---------- 설정값 주입 ---------- */
  function applyConfig() {
    document.querySelectorAll("[data-tel]").forEach((el) => (el.href = telHref));
    document.querySelectorAll("[data-phone]").forEach((el) => (el.textContent = CFG.phone));
    document.querySelectorAll("[data-address]").forEach((el) => (el.textContent = CFG.addressShort));
    renderContacts();
  }

  /* ---------- 네이버 지도 (Client ID 있을 때 실제 지도 임베드) ---------- */
  function initNaverMap() {
    const el = document.getElementById("naverMap");
    const nv = CFG.naver || {};
    if (!el || !nv.mapClientId) return; // ID 없으면 안내 패널 그대로 유지

    // 네이버가 키 파라미터를 바꿔서(신: ncpKeyId / 구: ncpClientId) 둘 다 자동 시도
    const endpoints = [
      "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=" + nv.mapClientId,
      "https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=" + nv.mapClientId,
    ];
    let tried = 0;

    function draw() {
      if (!(window.naver && window.naver.maps)) return;
      el.innerHTML = "";
      const pos = new naver.maps.LatLng(nv.lat, nv.lng);
      const map = new naver.maps.Map(el, { center: pos, zoom: 16 });
      new naver.maps.Marker({ position: pos, map: map, title: CFG.brandKo });
    }
    function load() {
      if (tried >= endpoints.length) {
        console.warn("네이버 지도 인증 실패 — Client ID와 등록 도메인을 확인하세요.");
        return;
      }
      const s = document.createElement("script");
      s.src = endpoints[tried++];
      s.onload = draw;
      s.onerror = load;
      document.head.appendChild(s);
    }
    window.navermap_authFailure = load; // 인증 실패 시 다른 방식으로 재시도
    load();
  }

  /* ---------- 상담 버튼(전화·문자·카카오) 주입 ---------- */
  function renderContacts() {
    const phoneIcon = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.6c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.3 2.2Z"/></svg>`;
    const smsIcon = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1Z"/></svg>`;
    const kakaoIcon = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 3C6.9 3 3 6.3 3 10.3c0 2.6 1.8 4.9 4.5 6.1-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.6-1.8 3.7-2.5.4 0 .8.1 1.2.1 5.1 0 9-3.3 9-7.4S17.1 3 12 3Z"/></svg>`;

    const item = (cls, href, icon, label, extra = "") =>
      `<a class="cbtn ${cls}" href="${href}" ${extra} aria-label="${label}">
        <span class="cbtn-ic">${icon}</span><span class="cbtn-label">${label}</span></a>`;

    let html =
      item("cbtn-call", telHref, phoneIcon, "전화상담") +
      item("cbtn-sms", smsHref, smsIcon, "문자상담");
    if (CFG.kakaoUrl) {
      html += item("cbtn-kakao", CFG.kakaoUrl, kakaoIcon, "카카오 상담", 'target="_blank" rel="noopener"');
    }
    document.querySelectorAll("[data-contact]").forEach((el) => (el.innerHTML = html));
  }

  /* ---------- 유틸 ---------- */
  function formatPrice(raw) {
    const s = String(raw).trim();
    if (!s) return "가격문의";
    if (!/^[\d,]+$/.test(s)) return s;
    const man = parseInt(s.replace(/,/g, ""), 10);
    if (man >= 10000) {
      const eok = Math.floor(man / 10000);
      const rest = man % 10000;
      return rest ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${man.toLocaleString()}만원`;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  /* ---------- 매물 사진 (2026-08-27) ----------
     CRM이 사진을 보내주기 시작하면 코드를 안 고쳐도 바로 화면에 뜨도록 미리 받아둔다.
     ▸ 받는 칸 이름: image / images / photo / photos 아무거나 (쉼표·줄바꿈으로 여러 장)
     ▸ 구글 드라이브 공유링크는 <img src>로 바로 안 뜨므로 thumbnail 주소로 바꿔준다.
       (드라이브 파일이 '링크가 있는 모든 사용자에게 공개'여야 보입니다)
     ▸ 워터마크가 찍힌 '보정완료' 사진만 내보내는 원칙은 CRM 쪽에서 지켜집니다. */
  function driveImg(u) {
    const s = String(u || "").trim();
    if (!s) return "";
    const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^]*&)?id=|thumbnail\?(?:[^]*&)?id=)([-\w]{20,})/);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200";
    return /^https?:\/\//i.test(s) ? s : "";
  }
  function photoUrls(l) {
    const raw = [l.image, l.images, l.photo, l.photos].filter(Boolean).join(",");
    const out = [];
    raw.split(/[,\n|]+/).forEach((u) => {
      const v = driveImg(u);
      if (v && out.indexOf(v) === -1) out.push(v);
    });
    return out;
  }

  /* ---------- 홈페이지에 내보낼 매물인지 (2026-08-27) ----------
     매물장에 입력된 게 전부 그대로 올라가는 구조라, 종류·면적이 비어 있는
     '기타매물'까지 위치도 없이 홈페이지에 떴다. 정보가 덜 채워진 매물은 일단 숨긴다.
     ※ 임시 조치입니다. 근본 해결은 CRM 광고관리에 '홈페이지' 플랫폼을 추가해
        사장님이 켠 매물만 나가게 하는 것 — 보완계획 문서 3단계 참고. */
  const HIDDEN = [];
  function isPublishable(l) {
    if (!l) return false;
    if (!l.type || l.type === "기타매물") return false;                  // 물건유형 미분류
    if (!String(l.price || "").replace(/[^0-9]/g, "")) return false;     // 가격 없음
    if (!String(l.area || "").trim()) return false;                      // 면적 없음
    if (!l.region && !l.location) return false;                          // 위치 없음
    return true;
  }
  function publishable(list) {
    HIDDEN.length = 0;
    const ok = (list || []).filter((l) => {
      if (isPublishable(l)) return true;
      HIDDEN.push((l && l.key) || (l && l.title) || "?");
      return false;
    });
    if (HIDDEN.length) {
      console.info(
        "[BREEZE] 정보가 덜 채워져 홈페이지에서 숨긴 매물 " + HIDDEN.length + "건: " + HIDDEN.join(", ") +
        "\n→ CRM 매물관리에서 물건유형(kind)·면적(area)·가격을 채우면 바로 올라갑니다."
      );
    }
    return ok;
  }

  // 소식 날짜를 짧게: "Fri, 17 Jul 2026" / "2026-07-17" → "26.07.17"
  const MON3 = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  function shortDate(s) {
    s = String(s || "").trim();
    if (!s) return "";
    let m = s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); // RSS 영문 날짜
    if (m) return m[3].slice(2) + "." + (MON3[m[2]] || "01") + "." + String(m[1]).padStart(2, "0");
    m = s.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/); // ISO 날짜
    if (m) return m[1].slice(2) + "." + String(m[2]).padStart(2, "0") + "." + String(m[3]).padStart(2, "0");
    return s;
  }

  /* ---------- 모달 ---------- */
  function openModal(html) {
    const modal = document.getElementById("listingModal");
    if (!modal) return;
    document.getElementById("modalBody").innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    const modal = document.getElementById("listingModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  /* ===================================================================
     매물 페이지
     =================================================================== */
  let allListings = [];
  let selTypes = [];   // 다중 선택
  let selDeals = [];   // 다중 선택
  let curPrice = "전체";
  let curPriceDeal = "월세"; // 가격 구간이 어느 거래유형 기준인지 (매물 불러온 뒤 최다 유형으로 맞춤)
  let curQuery = "";
  let selRegions = []; // 지역(동) 선택 — 다중
  let curCat = "";     // 현재 카테고리(지역시트용)

  // 카테고리 아이콘 → 필터 매핑
  const CATEGORIES = {
    "아파트": { types: ["아파트"], deals: [] },
    "원투룸": { types: ["원투룸"], deals: [] },
    "오피스텔": { types: ["오피스텔"], deals: [] },
    "상가임대": { types: ["상가"], deals: ["월세", "전세", "연세"] },
  };
  // 제주시 동/읍면 대략 좌표 (지도 버블용)
  const JEJU_COORDS = {
    "연동": [33.4890, 126.4914], "노형동": [33.4823, 126.4783], "이도일동": [33.5096, 126.5276],
    "이도이동": [33.4985, 126.5390], "일도일동": [33.5160, 126.5292], "일도이동": [33.5142, 126.5370],
    "삼도일동": [33.5135, 126.5225], "삼도이동": [33.5118, 126.5203], "건입동": [33.5160, 126.5410],
    "용담일동": [33.5140, 126.5125], "용담이동": [33.5120, 126.5030], "도두일동": [33.5085, 126.4680],
    "이호일동": [33.4985, 126.4530], "이호이동": [33.4960, 126.4490], "외도일동": [33.4905, 126.4350],
    "오라일동": [33.4980, 126.5150], "오라이동": [33.4860, 126.5150], "아라일동": [33.4750, 126.5450],
    "아라이동": [33.4700, 126.5500], "오등동": [33.4720, 126.5250], "영평동": [33.4700, 126.5600],
    "화북일동": [33.5230, 126.5750], "화북이동": [33.5180, 126.5820], "삼양일동": [33.5290, 126.5970],
    "삼양이동": [33.5250, 126.6050], "봉개동": [33.4810, 126.5850], "월평동": [33.4520, 126.5650],
    "애월읍": [33.4620, 126.3100], "한림읍": [33.4140, 126.2690], "한경면": [33.3450, 126.1800],
    "조천읍": [33.5390, 126.6350], "구좌읍": [33.5280, 126.8550], "추자면": [33.9570, 126.3000],
  };
  function regionOf(l) {
    return l.region || (l.location ? String(l.location).trim().split(/\s+/).pop() : "");
  }

  // 매물종류 표시 순서 + 짧은 라벨
  const TYPE_ORDER = ["아파트", "오피스텔", "원투룸", "연립다세대", "단독 다가구 상가주택",
    "상가", "상가건물", "공장 창고", "토지", "분양권", "기타매물"];
  const TYPE_LABEL = { "단독 다가구 상가주택": "단독다가구 상가주택", "공장 창고": "공장창고" };

  /* ---------- 가격대 필터 (2026-08-27 개편) ----------
     예전엔 거래유형과 상관없이 priceVal(만원) 하나로 걸렀다. 그런데 월세의 priceVal은
     '보증금'이라, 매물 대부분이 월세인 지금은 "1천만원 이하"에 거의 전부 들어가고
     "3억 이상"은 언제나 0건이었다 — 필터가 사실상 없는 것과 같았다.
     → 거래유형마다 기준 금액이 다르므로(매매가 / 전세보증금 / 월 임대료 / 연 임대료)
        가격 구간도 거래유형별로 따로 둔다. 금액 단위는 모두 '만원'. */
  const DEAL_OPTS = ["매매", "전세", "월세", "연세"];
  const PRICE_BANDS = {
    "매매": { unit: "매매가", opts: [
      { k: "s1", label: "1억원 이하", lo: 0, hi: 10000 },
      { k: "s2", label: "1억 ~ 3억원", lo: 10000, hi: 30000 },
      { k: "s3", label: "3억 ~ 5억원", lo: 30000, hi: 50000 },
      { k: "s4", label: "5억 ~ 10억원", lo: 50000, hi: 100000 },
      { k: "s5", label: "10억원 이상", lo: 100000, hi: Infinity },
    ] },
    "전세": { unit: "전세보증금", opts: [
      { k: "j1", label: "5천만원 이하", lo: 0, hi: 5000 },
      { k: "j2", label: "5천만 ~ 1억원", lo: 5000, hi: 10000 },
      { k: "j3", label: "1억 ~ 2억원", lo: 10000, hi: 20000 },
      { k: "j4", label: "2억 ~ 3억원", lo: 20000, hi: 30000 },
      { k: "j5", label: "3억원 이상", lo: 30000, hi: Infinity },
    ] },
    "월세": { unit: "월 임대료", opts: [
      { k: "m1", label: "월 30만원 이하", lo: 0, hi: 30 },
      { k: "m2", label: "월 30 ~ 50만원", lo: 30, hi: 50 },
      { k: "m3", label: "월 50 ~ 80만원", lo: 50, hi: 80 },
      { k: "m4", label: "월 80 ~ 150만원", lo: 80, hi: 150 },
      { k: "m5", label: "월 150만원 이상", lo: 150, hi: Infinity },
    ] },
    "연세": { unit: "연 임대료", opts: [
      { k: "y1", label: "연 500만원 이하", lo: 0, hi: 500 },
      { k: "y2", label: "연 500 ~ 1,000만원", lo: 500, hi: 1000 },
      { k: "y3", label: "연 1,000 ~ 2,000만원", lo: 1000, hi: 2000 },
      { k: "y4", label: "연 2,000만원 이상", lo: 2000, hi: Infinity },
    ] },
  };

  // 그 매물이 해당 거래유형으로 나와 있는지 ("매매/전세"처럼 겹쳐 있을 수 있다)
  function hasDeal(l, deal) {
    return String(l.deal).split(/[\/,·]/).map((s) => s.trim()).indexOf(deal) > -1;
  }
  // 거래유형별 비교 기준 금액(만원). 월세·연세는 가격 문구에서 임대료를 뽑는다.
  //   "보증금 300 / 월 49" → 49 · "보증금 2,000 / 연 2,000" → 2000
  function priceBasis(l, deal) {
    if (deal === "월세" || deal === "연세") {
      const m = String(l.price || "").match(deal === "월세" ? /월\s*([\d,.]+)/ : /연\s*([\d,.]+)/);
      return m ? parseFloat(m[1].replace(/,/g, "")) : NaN;
    }
    return +(l.priceVal || 0); // 매매가 · 전세보증금
  }
  function priceBand() {
    const b = PRICE_BANDS[curPriceDeal];
    return b ? b.opts.filter((o) => o.k === curPrice)[0] : null;
  }
  function inPrice(l) {
    if (curPrice === "전체") return true;
    const band = priceBand();
    if (!band) return true;
    if (!hasDeal(l, curPriceDeal)) return false; // 다른 거래유형 매물은 이 가격대에 해당 없음
    const v = priceBasis(l, curPriceDeal);
    return isFinite(v) && v > band.lo && v <= band.hi;
  }
  function areaPyeong(area) {
    const m = String(area || "").match(/([\d.]+)\s*평/);
    return m ? m[1] + "평" : "";
  }
  function floorShort(floor) {
    return String(floor || "").split("/")[0].trim();
  }
  // 아파트 제목 = 동 + 아파트명 + 평수 + 층수 (엔진 title엔 '동 아파트명'까지 들어있음)
  function displayTitle(l) {
    let t = l.title || l.location || "매물";
    if (l.type === "아파트") {
      const py = areaPyeong(l.area);   // "32평" 또는 ""
      const fl = floorShort(l.floor);  // "10"
      if (py) t += " " + py;
      if (fl) t += " " + fl + "층";
    }
    return t;
  }
  function priceLine(l) {
    const p = String(l.price || "");
    if (/^[\d,]+$/.test(p)) return esc(formatPrice(p));
    return esc(p.replace(/\d+/g, (n) => (+n).toLocaleString()));
  }

  // 거래중/완료(공실 아님) 여부
  function isDone(l) { return /임대중|계약완료/.test(l.status || ""); }

  /* 대표 사진 한 장 (사진이 없으면 BREEZE 회색 박스).
     사진이 여러 장이면 오른쪽 아래에 장수를 표시한다. */
  function thumbHtml(l, lazy) {
    const ps = photoUrls(l);
    if (!ps.length) return `<span class="ph">BREEZE</span>`;
    return `<img src="${esc(ps[0])}" alt="${esc(displayTitle(l))}"${lazy ? ' loading="lazy"' : ""} draggable="false" oncontextmenu="return false" onerror="this.style.display='none';this.parentNode.querySelector('.ph').style.display='flex'" /><span class="ph" style="display:none">BREEZE</span><span class="wm" aria-hidden="true"></span>` +
      (ps.length > 1 ? `<span class="photo-n" aria-label="사진 ${ps.length}장">📷 ${ps.length}</span>` : "");
  }

  // 가로형 리스트 카드 (왼쪽 사진 / 오른쪽 정보)
  function listingRow(l, idx) {
    const thumb = thumbHtml(l, true);
    const title = displayTitle(l);
    const spec = [l.type, areaPyeong(l.area), floorShort(l.floor)].filter((x) => x && x !== "—").join(" / ");
    const done = isDone(l);
    return `
      <article class="lcard reveal${done ? " is-done" : ""}" data-idx="${idx}" tabindex="0">
        <div class="lcard-photo">${thumb}
          ${l.deal ? `<span class="lcard-deal">${esc(l.deal)}</span>` : ""}
          ${done ? `<span class="lcard-status">${esc(l.status)}</span>` : ""}
        </div>
        <div class="lcard-info">
          <div class="lcard-top">
            <span class="lcard-title">${esc(title)}</span>
          </div>
          <div class="lcard-price">${priceLine(l)}</div>
          <div class="lcard-spec">${esc(spec)}</div>
        </div>
      </article>`;
  }

  function listingCard(l, idx) {
    const thumb = thumbHtml(l, true);
    const meta = [l.location, l.area, l.floor]
      .filter((x) => x && x !== "—")
      .map((x) => `<span>${esc(x)}</span>`)
      .join("");
    return `
      <article class="listing-card reveal" data-idx="${idx}" tabindex="0">
        <div class="lc-thumb">
          ${thumb}
          <div class="lc-badge"><span class="deal">${esc(l.deal)}</span><span>${esc(l.type)}</span></div>
        </div>
        <div class="lc-body">
          <div class="lc-title">${esc(displayTitle(l))}</div>
          <div class="lc-price">${priceLine(l)}</div>
          <div class="lc-meta">${meta}</div>
        </div>
      </article>`;
  }

  function renderListings() {
    const grid = document.getElementById("listingGrid");
    const empty = document.getElementById("listingEmpty");
    const filtered = allListings.filter((l) => {
      const deals = String(l.deal).split(/[\/,·]/).map((s) => s.trim());
      const okType = !selTypes.length || selTypes.includes(l.type);
      const okDeal = !selDeals.length || selDeals.some((d) => deals.includes(d));
      const okRegion = !selRegions.length || selRegions.includes(regionOf(l));
      const hay = `${l.title} ${l.type} ${l.location} ${l.desc} ${l.deal} ${l.key || ""}`.toLowerCase();
      return okType && okDeal && okRegion && inPrice(l) && (!curQuery || hay.includes(curQuery.toLowerCase()));
    });
    filtered.sort((a, b) => (isDone(a) ? 1 : 0) - (isDone(b) ? 1 : 0)); // 공실 먼저, 거래중/완료는 뒤로
    grid.innerHTML = filtered.map((l) => listingRow(l, allListings.indexOf(l))).join("");
    if (empty) empty.hidden = filtered.length > 0;
    observeReveals();
  }

  function listingModalHtml(l) {
    // 사진이 2장 이상이면 옆으로 넘겨보는 띠, 1장이면 그대로, 없으면 회색 박스
    const ps = photoUrls(l);
    const thumb = ps.length > 1
      ? `<div class="m-gallery">${ps.map((u, i) =>
          `<img src="${esc(u)}" alt="${esc(displayTitle(l))} 사진 ${i + 1}"${i ? ' loading="lazy"' : ""} draggable="false" oncontextmenu="return false" onerror="this.remove()" />`
        ).join("")}</div><span class="wm" aria-hidden="true"></span>`
      : thumbHtml(l, false);
    const rows = [
      ["상태", isDone(l) ? l.status : ""], ["거래유형", l.deal],
      ["매물종류", l.type], ["위치", l.location], ["면적", l.area], ["층", l.floor],
      ["방향", l.direction], ["방수", l.rooms], ["등록일", shortDate(l.date)],
    ].filter(([, v]) => v && v !== "—");
    const mapAddr = l.addr || l.location;
    const showMap = !l.noMap && mapAddr;
    return `
      <div class="modal-thumb">${thumb}</div>
      <div class="modal-content">
        <span class="deal-tag">${esc(l.deal)} · ${esc(l.type)}</span>
        <h3>${esc(displayTitle(l))}</h3>
        <div class="m-price">${priceLine(l)}</div>
        <dl class="m-grid">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        ${l.desc ? `<p class="m-desc">${esc(l.desc)}</p>` : ""}
        ${showMap ? `<div class="m-map"><iframe title="위치 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(mapAddr)}&z=16&output=embed"></iframe></div>` : ""}
        <a href="${telHref}" class="btn btn-primary" style="width:100%">전화로 문의하기</a>
      </div>`;
  }

  /* ---------- 당근식 필터 (알약 + 바텀시트) ----------
     가격 구간표(PRICE_BANDS)와 거래유형 목록(DEAL_OPTS)은 위쪽 '가격대 필터'에 있습니다. */
  let sheetTmp = null;

  function presentTypes() {
    const p = TYPE_ORDER.filter((t) => allListings.some((l) => l.type === t));
    allListings.forEach((l) => { if (l.type && !p.includes(l.type)) p.push(l.type); });
    return p;
  }
  function updatePills() {
    const setPill = (name, active, label) => {
      const pill = document.querySelector(`.fpill[data-filter="${name}"]`);
      if (!pill) return;
      pill.classList.toggle("active", active);
      pill.querySelector(".fpill-label").textContent = label;
    };
    setPill("type", selTypes.length > 0,
      selTypes.length ? (TYPE_LABEL[selTypes[0]] || selTypes[0]) + (selTypes.length > 1 ? ` 외 ${selTypes.length - 1}` : "") : "종류");
    setPill("region", selRegions.length > 0,
      selRegions.length ? selRegions[0] + (selRegions.length > 1 ? ` 외 ${selRegions.length - 1}` : "") : "지역");
    setPill("deal", selDeals.length > 0, selDeals.length ? selDeals.join("·") : "거래");
    const band = priceBand();
    setPill("price", !!band, band ? band.label : "가격");
    const reset = document.getElementById("filterReset");
    if (reset) reset.hidden = !(selTypes.length || selDeals.length || curPrice !== "전체" || selRegions.length);
  }
  function sheetChip(val, label, on, single) {
    return `<button class="sheet-chip${on ? " on" : ""}" data-val="${esc(val)}" data-single="${single ? 1 : 0}">${esc(label)}</button>`;
  }
  function openSheet(name) {
    const sheet = document.getElementById("filterSheet");
    const body = document.getElementById("sheetBody");
    if (!sheet) return;
    sheet.dataset.name = name;
    if (name === "type") {
      document.getElementById("sheetTitle").textContent = "매물종류 (여러 개 선택 가능)";
      sheetTmp = selTypes.slice();
      body.innerHTML = presentTypes().map((t) => sheetChip(t, TYPE_LABEL[t] || t, sheetTmp.includes(t), false)).join("");
    } else if (name === "deal") {
      document.getElementById("sheetTitle").textContent = "거래유형 (여러 개 선택 가능)";
      sheetTmp = selDeals.slice();
      body.innerHTML = DEAL_OPTS.map((d) => sheetChip(d, d, sheetTmp.includes(d), false)).join("");
    } else if (name === "region") {
      document.getElementById("sheetTitle").textContent = "지역 · 동 (여러 곳 선택 가능)";
      sheetTmp = selRegions.slice();
      const counts = {};
      allListings.forEach((l) => { const r = regionOf(l); if (r) counts[r] = (counts[r] || 0) + 1; });
      const regions = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      body.innerHTML = regions.length
        ? regions.map((r) => sheetChip(r, `${r} ${counts[r]}`, sheetTmp.includes(r), false)).join("")
        : `<p style="color:var(--gray);padding:10px">표시할 지역이 없습니다.</p>`;
    } else {
      document.getElementById("sheetTitle").textContent = "가격대";
      // 매물이 있는 거래유형을 기본으로 (없으면 지금 기준 유지)
      const best = DEAL_OPTS.filter((d) => allListings.some((l) => hasDeal(l, d)))
        .sort((a, b) => allListings.filter((l) => hasDeal(l, b)).length - allListings.filter((l) => hasDeal(l, a)).length)[0];
      sheetTmp = { deal: (curPrice !== "전체" ? curPriceDeal : (best || curPriceDeal)), k: curPrice };
      renderPriceBody();
    }
    sheet.hidden = false;
    document.body.style.overflow = "hidden";
  }

  /* 가격 시트 = [거래유형 고르기] + [그 유형의 가격 구간].
     거래유형마다 기준 금액이 달라서(매매가 / 보증금 / 월 임대료) 한 화면에서 같이 고른다. */
  function renderPriceBody() {
    const body = document.getElementById("sheetBody");
    if (!body) return;
    const deal = sheetTmp.deal;
    const band = PRICE_BANDS[deal] || PRICE_BANDS["월세"];
    const n = (d) => allListings.filter((l) => hasDeal(l, d)).length;
    body.innerHTML =
      `<p class="sheet-note">거래유형마다 기준 금액이 다릅니다. 거래유형을 먼저 골라 주세요.</p>` +
      `<div class="price-deals">` +
        DEAL_OPTS.map((d) =>
          `<button type="button" class="pdeal${d === deal ? " on" : ""}" data-pdeal="${esc(d)}"${n(d) ? "" : " disabled"}>${esc(d)}<b>${n(d)}</b></button>`
        ).join("") +
      `</div>` +
      `<p class="sheet-sub">${esc(deal)} · <b>${esc(band.unit)}</b> 기준</p>` +
      `<div class="sheet-chips">` +
        sheetChip("전체", deal + " 전체", sheetTmp.k === "전체", true) +
        band.opts.map((o) => sheetChip(o.k, o.label, sheetTmp.k === o.k, true)).join("") +
      `</div>`;
  }
  function closeSheet() {
    const sheet = document.getElementById("filterSheet");
    if (sheet) sheet.hidden = true;
    document.body.style.overflow = "";
  }
  function onSheetChip(e) {
    // 가격 시트의 거래유형 버튼 — 누르면 그 유형의 가격 구간으로 다시 그린다
    const pd = e.target.closest(".pdeal");
    if (pd && !pd.disabled) {
      sheetTmp = { deal: pd.dataset.pdeal, k: "전체" };
      renderPriceBody();
      return;
    }
    const chip = e.target.closest(".sheet-chip");
    if (!chip) return;
    const val = chip.dataset.val;
    const sheetName = document.getElementById("filterSheet").dataset.name;
    if (sheetName === "price") {
      document.querySelectorAll("#sheetBody .sheet-chip").forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
      sheetTmp.k = val;
      return;
    }
    if (chip.dataset.single === "1") {
      document.querySelectorAll("#sheetBody .sheet-chip").forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
      sheetTmp = val;
    } else {
      const i = sheetTmp.indexOf(val);
      if (i > -1) sheetTmp.splice(i, 1); else sheetTmp.push(val);
      chip.classList.toggle("on");
    }
  }
  function applySheet() {
    const name = document.getElementById("filterSheet").dataset.name;
    if (name === "type") selTypes = sheetTmp.slice();
    else if (name === "deal") selDeals = sheetTmp.slice();
    else if (name === "region") selRegions = sheetTmp.slice();
    else {
      curPriceDeal = sheetTmp.deal;
      curPrice = sheetTmp.k;
      // 가격 구간을 고르면 그 거래유형으로 목록도 맞춰준다 (매매를 보면서 월세 가격대를
      // 고르면 결과가 0건이 되어 "필터가 고장났다"고 느끼게 되므로)
      if (curPrice !== "전체") selDeals = [curPriceDeal];
    }
    closeSheet(); updatePills(); renderListings();
  }
  function resetSheet() {
    const name = document.getElementById("filterSheet").dataset.name;
    if (name === "price") { sheetTmp = { deal: sheetTmp.deal, k: "전체" }; renderPriceBody(); return; }
    sheetTmp = [];
    document.querySelectorAll("#sheetBody .sheet-chip").forEach((c) => {
      c.classList.toggle("on", c.dataset.single === "1" && c.dataset.val === "전체");
    });
  }

  /* ---------- 카테고리 아이콘 + 지역별 지도 ---------- */
  function matchCategory(cat) {
    const c = CATEGORIES[cat];
    return (l) => {
      if (c.types.length && !c.types.includes(l.type)) return false;
      if (c.deals.length) {
        const deals = String(l.deal).split(/[\/,·]/).map((s) => s.trim());
        if (!c.deals.some((d) => deals.includes(d))) return false;
      }
      return true;
    };
  }
  function updateCats() {
    document.querySelectorAll(".cat").forEach((b) => b.classList.toggle("active", b.dataset.cat === curCat));
  }
  /* 매물이 하나도 없는 카테고리 비활성화 (2026-08-27)
     예전엔 아파트·오피스텔·상가임대를 눌러도 "전체 0"과 텅 빈 지도만 떴다.
     지금 매물 구성에 맞춰 개수를 표시하고, 0건이면 아예 눌리지 않게 한다.
     ※ 매물이 들어오면 자동으로 다시 켜집니다 — 따로 손댈 것 없음. */
  function updateCatAvailability() {
    document.querySelectorAll(".cat").forEach((b) => {
      const cat = b.dataset.cat;
      const n = CATEGORIES[cat] ? allListings.filter(matchCategory(cat)).length : 0;
      b.disabled = n === 0;
      b.classList.toggle("is-empty", n === 0);
      b.setAttribute("title", n ? cat + " " + n + "건" : cat + " 매물이 아직 없습니다");
      const badge = b.querySelector(".cat-n");
      if (badge) badge.textContent = n || "";
      else if (n) b.insertAdjacentHTML("beforeend", '<span class="cat-n">' + n + "</span>");
    });
  }
  function onCategory(cat) {
    const c = CATEGORIES[cat];
    if (!c) return;
    if (!allListings.some(matchCategory(cat))) return; // 매물 0건이면 빈 화면만 뜨므로 무시
    curCat = cat;
    selTypes = c.types.slice();
    selDeals = c.deals.slice();
    selRegions = [];
    curPrice = "전체";
    updateCats();
    updatePills();
    renderListings();
    openRegionSheet(cat);
  }
  let regionMap = null;
  function openRegionSheet(cat) {
    const sheet = document.getElementById("regionSheet");
    if (!sheet) return;
    const items = allListings.filter(matchCategory(cat));
    const counts = {};
    items.forEach((l) => { const r = regionOf(l); if (r) counts[r] = (counts[r] || 0) + 1; });
    const regions = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    document.getElementById("regionTitle").textContent = cat + " · 지역별 매물";
    document.getElementById("regionChips").innerHTML =
      `<button class="rchip${selRegions.length === 0 ? " on" : ""}" data-region="">전체 ${items.length}</button>` +
      regions.map((r) => `<button class="rchip${selRegions.includes(r) ? " on" : ""}" data-region="${esc(r)}">${esc(r)} ${counts[r]}</button>`).join("");
    sheet.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => initRegionMap(counts), 60);
  }
  // Leaflet(지도)은 실제 지도 열 때만 불러옴 (매물 페이지 첫 로딩 빠르게)
  function ensureLeaflet(cb) {
    if (window.L) return cb();
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (window.__leafletLoading) { setTimeout(() => ensureLeaflet(cb), 200); return; }
    window.__leafletLoading = true;
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = cb;
    s.onerror = () => { const el = document.getElementById("regionMap"); if (el) el.style.display = "none"; };
    document.head.appendChild(s);
  }
  function initRegionMap(counts) {
    const el = document.getElementById("regionMap");
    if (!el) return;
    if (typeof L === "undefined") { ensureLeaflet(() => initRegionMap(counts)); return; }
    el.style.display = "";
    if (regionMap) { regionMap.remove(); regionMap = null; }
    regionMap = L.map(el, { scrollWheelZoom: false, attributionControl: false }).setView([33.43, 126.56], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(regionMap);
    const bounds = [];
    Object.keys(counts).forEach((r) => {
      const c = JEJU_COORDS[r];
      if (!c) return;
      const icon = L.divIcon({
        className: "rbubble-wrap",
        html: `<div class="rbubble"><span>${esc(r)}</span><b>${counts[r]}</b></div>`,
        iconSize: [1, 1],
      });
      L.marker(c, { icon }).addTo(regionMap).on("click", () => selectRegion(r));
      bounds.push(c);
    });
    if (bounds.length) regionMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    setTimeout(() => regionMap && regionMap.invalidateSize(), 120);
  }
  function selectRegion(r) {
    selRegions = r ? [r] : [];
    closeRegionSheet();
    updatePills();
    renderListings();
  }
  function closeRegionSheet() {
    const sheet = document.getElementById("regionSheet");
    if (sheet) sheet.hidden = true;
    document.body.style.overflow = "";
    if (regionMap) { regionMap.remove(); regionMap = null; }
  }

  function saveCache(key, data) { try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {} }
  function loadCache(key) { try { const o = JSON.parse(localStorage.getItem(key) || "null"); return o ? o.d : null; } catch (e) { return null; } }

  // 피드를 못 불러왔을 때 — 지어낸 샘플 대신 사실대로 알리고 전화로 연결한다
  function feedErrorHtml(what) {
    return `<div class="feed-error">
        <b>${esc(what)}을 불러오지 못했습니다.</b>
        <span>잠시 후 새로고침해 주세요. 급하시면 바로 전화 주세요.</span>
        <a href="${telHref}" class="btn btn-primary">${esc(CFG.phone)} 전화하기</a>
      </div>`;
  }

  async function initListings() {
    const grid = document.getElementById("listingGrid");
    if (!grid) return;
    // 1) 캐시 즉시 표시 (재방문 시 빠르게) → 2) 뒤에서 최신으로 갱신
    const showList = (list) => {
      allListings = publishable(list);       // 정보가 덜 채워진 매물은 제외
      // 가격 구간의 기준 거래유형을 지금 매물 구성에 맞춘다 (지금은 월세가 대부분)
      const best = DEAL_OPTS.filter((d) => allListings.some((l) => hasDeal(l, d)))
        .sort((a, b) => allListings.filter((l) => hasDeal(l, b)).length - allListings.filter((l) => hasDeal(l, a)).length)[0];
      if (best && curPrice === "전체") curPriceDeal = best;
      renderListings();
      updatePills();
      updateCatAvailability();
    };
    const cached = loadCache("breeze_listings");
    if (cached && cached.length) showList(cached);
    window.BreezeSheets.getListings()
      .then((fresh) => {
        saveCache("breeze_listings", fresh || []);
        showList(fresh);
      })
      .catch((e) => {
        console.warn("매물 로드 실패", e);
        if (!(cached && cached.length)) grid.innerHTML = feedErrorHtml("매물");
      });

    const bar = document.getElementById("filterBar");
    if (bar) bar.addEventListener("click", (e) => {
      const pill = e.target.closest(".fpill");
      if (!pill) return;
      if (pill.id === "filterReset") {
        selTypes = []; selDeals = []; curPrice = "전체"; selRegions = []; curCat = "";
        updateCats(); updatePills(); renderListings(); return;
      }
      openSheet(pill.dataset.filter);
    });

    const catRow = document.getElementById("catRow");
    if (catRow) catRow.addEventListener("click", (e) => {
      const b = e.target.closest(".cat");
      if (b) onCategory(b.dataset.cat);
    });
    const rchips = document.getElementById("regionChips");
    if (rchips) rchips.addEventListener("click", (e) => {
      const b = e.target.closest(".rchip");
      if (b) selectRegion(b.dataset.region);
    });
    document.querySelectorAll("[data-region-close]").forEach((el) => el.addEventListener("click", closeRegionSheet));
    const rsheet = document.getElementById("regionSheet");
    if (rsheet) rsheet.addEventListener("click", (e) => { if (e.target === rsheet) closeRegionSheet(); });
    const sb = document.getElementById("sheetBody");
    if (sb) sb.addEventListener("click", onSheetChip);
    document.querySelectorAll("[data-sheet-close]").forEach((el) => el.addEventListener("click", closeSheet));
    const apply = document.getElementById("sheetApply");
    if (apply) apply.addEventListener("click", applySheet);
    const sreset = document.getElementById("sheetReset");
    if (sreset) sreset.addEventListener("click", resetSheet);

    const search = document.getElementById("listingSearch");
    if (search) {
      let t;
      search.addEventListener("input", (e) => {
        clearTimeout(t);
        t = setTimeout(() => { curQuery = e.target.value; renderListings(); }, 180);
      });
    }
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".lcard");
      if (card) openModal(listingModalHtml(allListings[+card.dataset.idx]));
    });
    grid.addEventListener("keydown", (e) => {
      const card = e.target.closest(".lcard");
      if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openModal(listingModalHtml(allListings[+card.dataset.idx])); }
    });
  }

  /* ===================================================================
     뉴스 페이지
     =================================================================== */
  function renderNews(grid, items) {
    grid.innerHTML = items
      .map((n) => `
      <a class="board-row reveal"${n.link ? ` href="${esc(n.link)}" target="_blank" rel="noopener"` : ""}>
        <span class="board-cat">${esc(n.category)}</span>
        <span class="board-title">${esc(n.title)}</span>
        <span class="board-date">${esc(shortDate(n.date))}</span>
      </a>`)
      .join("");
    observeReveals();
  }
  async function initNews() {
    const grid = document.getElementById("newsGrid");
    if (!grid) return;
    const cachedN = loadCache("breeze_news");
    const hadCache = !!(cachedN && cachedN.length);
    if (hadCache) renderNews(grid, cachedN); // 캐시가 있으면 즉시 표시 (없으면 스켈레톤 유지)
    try {
      const items = await window.BreezeSheets.getNews();
      if (items && items.length) { saveCache("breeze_news", items); renderNews(grid, items); }
      else if (!hadCache) grid.innerHTML = `<p class="empty-msg">아직 등록된 소식이 없습니다.</p>`;
    } catch (e) {
      if (!hadCache) grid.innerHTML = feedErrorHtml("부동산 소식");
    }
  }

  /* ===================================================================
     게시판 페이지
     =================================================================== */
  let allBoard = [];
  function renderBoardList(list) {
    list.innerHTML = allBoard
      .map((b) => `
      <a class="board-row reveal"${b.link ? ` href="${esc(b.link)}" target="_blank" rel="noopener"` : ""}>
        <span class="board-cat">${esc(b.category)}</span>
        <span class="board-title">${esc(b.title)}</span>
        <span class="board-date">${esc(shortDate(b.date))}</span>
      </a>`)
      .join("");
    observeReveals();
  }
  async function initBoard() {
    const list = document.getElementById("boardList");
    if (!list) return;
    const cachedB = loadCache("breeze_board");
    const hadCache = !!(cachedB && cachedB.length);
    if (hadCache) { allBoard = cachedB; renderBoardList(list); } // 없으면 스켈레톤 유지
    try {
      const items = await window.BreezeSheets.getBoard();
      if (items && items.length) { saveCache("breeze_board", items); allBoard = items; renderBoardList(list); }
      else if (!hadCache) list.innerHTML = `<p class="empty-msg">아직 등록된 소식이 없습니다.</p>`;
    } catch (e) {
      if (!hadCache) list.innerHTML = feedErrorHtml("브리즈 소식");
    }
  }

  /* ===================================================================
     홈 미리보기 (최신 매물 몇 개)
     =================================================================== */
  async function initHomePreview() {
    const grid = document.getElementById("previewGrid");
    if (!grid) return;
    let items = [];
    const draw = (list) => {
      items = publishable(list).slice(0, 3);
      grid.innerHTML = items.length
        ? items.map((l, i) => listingCard(l, i)).join("")
        : `<p class="empty-msg">등록된 매물이 없습니다.</p>`;
      observeReveals();
    };
    // 카드 클릭은 한 번만 연결 (items가 바뀌어도 최신 배열을 참조한다)
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".listing-card");
      if (card && items[+card.dataset.idx]) openModal(listingModalHtml(items[+card.dataset.idx]));
    });
    // 매물 페이지와 같은 캐시를 써서 앱스스크립트 콜드스타트 동안 화면이 비지 않게 한다
    const cached = loadCache("breeze_listings");
    if (cached && cached.length) draw(cached);
    else grid.innerHTML = `<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>`;
    try {
      const fresh = await window.BreezeSheets.getListings();
      saveCache("breeze_listings", fresh || []);
      draw(fresh);
    } catch (e) {
      console.warn("최신 매물 로드 실패", e);
      if (!(cached && cached.length)) grid.innerHTML = feedErrorHtml("매물");
    }
  }

  /* ---------- 스크롤 리빌 ---------- */
  let io;
  function observeReveals() {
    if (!io) {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
        { threshold: 0.12 }
      );
    }
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  /* ---------- 공통 이벤트 ---------- */
  function bindCommon() {
    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");
    if (toggle && links) {
      toggle.addEventListener("click", () => {
        const open = links.classList.toggle("open");
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open);
      });
      links.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => { links.classList.remove("open"); toggle.classList.remove("open"); })
      );
    }
    const header = document.getElementById("header");
    if (header) {
      const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  /* ---------- 초기화 ---------- */
  function init() {
    applyConfig();
    bindCommon();
    observeReveals();
    initNaverMap();
    initListings();
    initNews();
    initBoard();
    initHomePreview();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
