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

  // 가격대 필터 (priceVal: 만원)
  function inPrice(l) {
    if (curPrice === "전체") return true;
    const v = +(l.priceVal || 0);
    if (curPrice === "a") return v > 0 && v <= 1000;
    if (curPrice === "b") return v > 1000 && v <= 3000;
    if (curPrice === "c") return v > 3000 && v <= 5000;
    if (curPrice === "d") return v > 5000 && v <= 10000;
    if (curPrice === "e") return v > 10000 && v <= 30000;
    if (curPrice === "f") return v > 30000;
    return true;
  }
  function areaPyeong(area) {
    const m = String(area || "").match(/([\d.]+)\s*평/);
    return m ? m[1] + "평" : "";
  }
  function floorShort(floor) {
    return String(floor || "").split("/")[0].trim();
  }
  function priceLine(l) {
    const p = String(l.price || "");
    if (/^[\d,]+$/.test(p)) return esc(formatPrice(p));
    return esc(p.replace(/\d+/g, (n) => (+n).toLocaleString()));
  }

  // 거래중/완료(공실 아님) 여부
  function isDone(l) { return /임대중|계약완료/.test(l.status || ""); }

  // 가로형 리스트 카드 (왼쪽 사진 / 오른쪽 정보)
  function listingRow(l, idx) {
    const thumb = l.image
      ? `<img src="${esc(l.image)}" alt="${esc(l.title)}" loading="lazy" draggable="false" oncontextmenu="return false" onerror="this.style.display='none';this.parentNode.querySelector('.ph').style.display='flex'" /><span class="ph" style="display:none">BREEZE</span><span class="wm" aria-hidden="true"></span>`
      : `<span class="ph">BREEZE</span>`;
    const title = l.title || l.location || "매물";
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
            ${l.key ? `<span class="lcard-no">${esc(l.key)}</span>` : ""}
          </div>
          <div class="lcard-price">${priceLine(l)}</div>
          <div class="lcard-spec">${esc(spec)}</div>
        </div>
      </article>`;
  }

  function listingCard(l, idx) {
    const thumb = l.image
      ? `<img src="${esc(l.image)}" alt="${esc(l.title)}" loading="lazy" draggable="false" oncontextmenu="return false" onerror="this.style.display='none';this.parentNode.querySelector('.ph').style.display='flex'" /><span class="ph" style="display:none">BREEZE</span><span class="wm" aria-hidden="true"></span>`
      : `<span class="ph">BREEZE</span>`;
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
          <div class="lc-title">${esc(l.title)}</div>
          <div class="lc-price">${formatPrice(l.price)}</div>
          <div class="lc-meta">${meta}</div>
          ${l.key ? `<div class="lc-key">매물번호 ${esc(l.key)}</div>` : ""}
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
    const thumb = l.image
      ? `<img src="${esc(l.image)}" alt="${esc(l.title)}" draggable="false" oncontextmenu="return false" onerror="this.style.display='none';this.parentNode.querySelector('.ph').style.display='flex'" /><span class="ph" style="display:none">BREEZE</span><span class="wm" aria-hidden="true"></span>`
      : `<span class="ph">BREEZE</span>`;
    const rows = [
      ["매물번호", l.key], ["상태", isDone(l) ? l.status : ""], ["거래유형", l.deal],
      ["매물종류", l.type], ["위치", l.location], ["면적", l.area], ["층", l.floor],
      ["방향", l.direction], ["방수", l.rooms], ["등록일", l.date],
    ].filter(([, v]) => v && v !== "—");
    const mapAddr = l.addr || l.location;
    const showMap = !l.noMap && mapAddr;
    return `
      <div class="modal-thumb">${thumb}</div>
      <div class="modal-content">
        <span class="deal-tag">${esc(l.deal)} · ${esc(l.type)}</span>
        <h3>${esc(l.title)}</h3>
        <div class="m-price">${priceLine(l)}</div>
        <dl class="m-grid">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        ${l.desc ? `<p class="m-desc">${esc(l.desc)}</p>` : ""}
        ${showMap ? `<div class="m-map"><iframe title="위치 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(mapAddr)}&z=16&output=embed"></iframe></div>` : ""}
        <a href="${telHref}" class="btn btn-primary" style="width:100%">전화로 문의하기</a>
      </div>`;
  }

  /* ---------- 당근식 필터 (알약 + 바텀시트) ---------- */
  const PRICE_OPTS = [
    { k: "전체", label: "전체" },
    { k: "a", label: "1천만원 이하" },
    { k: "b", label: "1천만 ~ 3천만" },
    { k: "c", label: "3천만 ~ 5천만" },
    { k: "d", label: "5천만 ~ 1억" },
    { k: "e", label: "1억 ~ 3억" },
    { k: "f", label: "3억 이상" },
  ];
  const DEAL_OPTS = ["매매", "전세", "월세", "연세"];
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
    const po = PRICE_OPTS.find((o) => o.k === curPrice);
    setPill("price", curPrice !== "전체", curPrice !== "전체" ? po.label : "가격");
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
      sheetTmp = curPrice;
      body.innerHTML = PRICE_OPTS.map((o) => sheetChip(o.k, o.label, sheetTmp === o.k, true)).join("");
    }
    sheet.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    const sheet = document.getElementById("filterSheet");
    if (sheet) sheet.hidden = true;
    document.body.style.overflow = "";
  }
  function onSheetChip(e) {
    const chip = e.target.closest(".sheet-chip");
    if (!chip) return;
    const val = chip.dataset.val;
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
    else curPrice = sheetTmp;
    closeSheet(); updatePills(); renderListings();
  }
  function resetSheet() {
    const name = document.getElementById("filterSheet").dataset.name;
    sheetTmp = name === "price" ? "전체" : [];
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
  function onCategory(cat) {
    const c = CATEGORIES[cat];
    if (!c) return;
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

  async function initListings() {
    const grid = document.getElementById("listingGrid");
    if (!grid) return;
    // 1) 캐시 즉시 표시 (재방문 시 빠르게) → 2) 뒤에서 최신으로 갱신
    const showList = (list) => { allListings = list || []; renderListings(); updatePills(); };
    const cached = loadCache("breeze_listings");
    if (cached && cached.length) showList(cached);
    window.BreezeSheets.getListings()
      .then((fresh) => {
        if (fresh && fresh.length) { saveCache("breeze_listings", fresh); showList(fresh); }
        else if (!cached) showList(fresh);
      })
      .catch(() => { if (!cached) showList([]); });

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
      <article class="news-card reveal">
        <span class="news-cat">${esc(n.category)}</span>
        <h3>${esc(n.title)}</h3>
        <p>${esc(n.body)}</p>
        ${n.link ? `<a class="more" href="${esc(n.link)}" target="_blank" rel="noopener">자세히 보기 →</a>` : ""}
        ${n.date ? `<span class="news-date">${esc(n.date)}</span>` : ""}
      </article>`)
      .join("");
    observeReveals();
  }
  async function initNews() {
    const grid = document.getElementById("newsGrid");
    if (!grid) return;
    const cachedN = loadCache("breeze_news");
    renderNews(grid, (cachedN && cachedN.length) ? cachedN : window.BREEZE_SAMPLE.news); // 즉시 표시
    try {
      const items = await window.BreezeSheets.getNews();
      if (items && items.length) { saveCache("breeze_news", items); renderNews(grid, items); } // 최신으로 교체
    } catch (e) { /* 캐시/샘플 유지 */ }
  }

  /* ===================================================================
     게시판 페이지
     =================================================================== */
  let allBoard = [];
  function renderBoardList(list) {
    list.innerHTML = allBoard
      .map((b, i) => `
      <button class="board-row reveal" data-idx="${i}">
        <span class="board-cat">${esc(b.category)}</span>
        <span class="board-title">${esc(b.title)}</span>
        <span class="board-date">${esc(b.date)}</span>
      </button>`)
      .join("");
    observeReveals();
  }
  async function initBoard() {
    const list = document.getElementById("boardList");
    if (!list) return;
    const cachedB = loadCache("breeze_board");
    allBoard = (cachedB && cachedB.length) ? cachedB : window.BREEZE_SAMPLE.board; // 즉시 표시
    renderBoardList(list);
    list.addEventListener("click", (e) => {
      const row = e.target.closest(".board-row");
      if (!row) return;
      const b = allBoard[+row.dataset.idx];
      openModal(`
        <div class="modal-content">
          <span class="deal-tag">${esc(b.category)}</span>
          <h3>${esc(b.title)}</h3>
          <p class="board-meta">${esc(b.author)} · ${esc(b.date)}</p>
          <p class="m-desc" style="white-space:pre-line">${esc(b.body)}</p>
          ${b.link ? `<a href="${esc(b.link)}" target="_blank" rel="noopener" class="btn btn-ghost" style="width:100%;margin-bottom:8px">블로그에서 자세히 보기 →</a>` : ""}
          <a href="${telHref}" class="btn btn-primary" style="width:100%">전화 문의하기</a>
        </div>`);
    });
    try {
      const items = await window.BreezeSheets.getBoard();
      if (items && items.length) { saveCache("breeze_board", items); allBoard = items; renderBoardList(list); } // 최신으로 교체
    } catch (e) { /* 샘플 유지 */ }
  }

  /* ===================================================================
     홈 미리보기 (최신 매물 몇 개)
     =================================================================== */
  async function initHomePreview() {
    const grid = document.getElementById("previewGrid");
    if (!grid) return;
    const items = (await window.BreezeSheets.getListings()).slice(0, 3);
    grid.innerHTML = items.map((l, i) => listingCard(l, i)).join("");
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".listing-card");
      if (card) openModal(listingModalHtml(items[+card.dataset.idx]));
    });
    observeReveals();
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
