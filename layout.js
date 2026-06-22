/* =====================================================================
   공통 레이아웃 — 헤더 / 푸터 / 전화버튼 / 모달을 모든 페이지에 주입
   각 HTML은 <body data-page="..."> 만 지정하면 됩니다.
   ===================================================================== */

(function () {
  const CFG = window.BREEZE_CONFIG;
  const tel = "tel:" + CFG.phone.replace(/[^0-9+]/g, "");
  const page = document.body.dataset.page || "home";
  const naverViewUrl =
    (CFG.naver && CFG.naver.placeUrl) ||
    "https://map.naver.com/p/search/" + encodeURIComponent(CFG.address || CFG.addressShort);
  const nv = CFG.naver || {};
  // 카카오내비/길안내 — 좌표가 있으면 도착지로, 없으면 주소 검색
  const kakaoNaviUrl =
    nv.lat && nv.lng
      ? `https://map.kakao.com/link/to/${encodeURIComponent(CFG.brandKo)},${nv.lat},${nv.lng}`
      : "https://map.kakao.com/?q=" + encodeURIComponent(CFG.address || CFG.addressShort);

  const nav = [
    { key: "home", label: "홈", href: "index.html" },
    { key: "listings", label: "매물", href: "매물.html" },
    { key: "news", label: "뉴스", href: "뉴스.html" },
    { key: "board", label: "게시판", href: "게시판.html" },
  ];

  const callIcon = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.6c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.3 2.2Z"/></svg>`;

  const navHtml = nav
    .map((n) => `<a href="${n.href}" class="${n.key === page ? "active" : ""}">${n.label}</a>`)
    .join("");

  const header = `
    <header class="site-header" id="header">
      <div class="container nav-bar">
        <a href="index.html" class="logo" aria-label="${CFG.brandKo} 홈">
          <img class="logo-img" src="assets/logo.png" alt="${CFG.brand}"
               onerror="this.onerror=null;this.src='assets/logo.svg'" />
          <span class="logo-text">${CFG.brand}<small>${CFG.brandKo}</small></span>
        </a>
        <nav class="nav-links" id="navLinks">
          ${navHtml}
          <a href="${tel}" class="nav-cta">전화상담</a>
        </nav>
        <button class="nav-toggle" id="navToggle" aria-label="메뉴 열기" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`;

  // 채널 아이콘 (전화·문자 + 네이버·카카오톡·유튜브·인스타·블로그 + 전자책)
  const sms = "sms:" + CFG.phone.replace(/[^0-9+]/g, "");
  const socials = CFG.social || {};
  const channelDefs = [
    { label: "네이버", cls: "ch-naver", url: socials.naver,
      svg: `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M14.1 12.5 9.6 6H6v12h3.9v-6.5l4.5 6.5H18V6h-3.9v6.5Z"/></svg>` },
    { label: "카카오톡", cls: "ch-kakao", url: CFG.kakaoUrl,
      svg: `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 6-.2.6-.7 2.5-.8 2.9 0 .2.1.4.4.2.3-.1 3-2 4.1-2.7.4 0 .7.1 1.1.1 5 0 9-3.1 9-7 0-3.9-4-7-9-7Z"/></svg>` },
    { label: "유튜브", cls: "ch-youtube", url: socials.youtube,
      svg: `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5 3-5 3Z"/></svg>` },
    { label: "인스타", cls: "ch-instagram", url: socials.instagram,
      svg: `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="none" stroke="currentColor" stroke-width="1.9" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor"/></svg>` },
    { label: "블로그", cls: "ch-blog", url: socials.blog,
      svg: `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 5.5h-.001L8 14h1.5v-2.2l1.6 2.2h1.9l-2.1-2.6c.7-.3 1.1-.9 1.1-1.6 0-1-.8-1.8-2-1.8H8v1.5Zm1.5 0h.6c.4 0 .7.2.7.5s-.3.5-.7.5h-.6v-1Zm5.2.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>` },
    { label: "전자책", cls: "ch-ebook", url: CFG.ebookUrl,
      svg: `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M6 3h11a2 2 0 0 1 2 2v16l-3.5-2.2L12 21l-3.5-2.2L5 21V5a2 2 0 0 1 1-2Z"/><path fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" d="M9 7.5h6M9 10.5h6"/></svg>` },
  ];
  const channelHtml = channelDefs
    .map((c) =>
      c.url
        ? `<a class="chan ${c.cls}" href="${c.url}" target="_blank" rel="noopener" aria-label="${c.label}"><span class="chan-ic">${c.svg}</span><span class="chan-label">${c.label}</span></a>`
        : `<span class="chan ${c.cls} soon" aria-label="${c.label} 준비중" title="준비중"><span class="chan-ic">${c.svg}</span><span class="chan-label">${c.label}</span></span>`
    )
    .join("");

  const comp = CFG.company || {};

  const footer = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-contact">
          <h4>오시는 길</h4>
          <ul class="fc-list">
            <li><span>주소</span><em>${CFG.addressShort}</em></li>
            <li><span>전화</span><em><a href="${tel}">${CFG.phone}</a></em></li>
            ${CFG.email ? `<li><span>이메일</span><em><a href="mailto:${CFG.email}">${CFG.email}</a></em></li>` : ""}
            ${CFG.hours ? `<li><span>영업시간</span><em>${CFG.hours}</em></li>` : ""}
            ${CFG.parking ? `<li><span>주차</span><em>${CFG.parking}</em></li>` : ""}
          </ul>
        </div>
        <div class="footer-map">
          <div id="naverMap" class="nmap">
            <a class="nmap-inner" href="${naverViewUrl}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="#03C75A" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>
              <b>네이버 지도</b>
              <span class="nmap-addr">${CFG.addressShort}</span>
              <span class="nmap-go">지도 보기 · 길찾기 ↗</span>
            </a>
          </div>
          <div class="map-actions">
            <a class="map-btn naver" href="${naverViewUrl}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>
              네이버 지도
            </a>
            <a class="map-btn kakao" href="${kakaoNaviUrl}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M5 16 3 21l5-2.2A10 10 0 1 0 5 16Z"/></svg>
              카카오내비
            </a>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="footer-channels">
          <div class="chan-list">${channelHtml}</div>
          <div class="biz-info">
            <p class="biz-name">${comp.name || CFG.brandKo} ${CFG.brand}</p>
            ${comp.ceo ? `<p class="biz-line">대표자 ${comp.ceo}</p>` : ""}
            ${comp.bizNo ? `<p class="biz-line">사업자등록번호 ${comp.bizNo}</p>` : ""}
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="container">© ${new Date().getFullYear()} ${CFG.brand}. All rights reserved.</div>
      </div>
    </footer>`;

  const floatCall = `<a href="${tel}" class="float-call" aria-label="전화 걸기">${callIcon}</a>`;

  const modal = `
    <div class="modal" id="listingModal" hidden>
      <div class="modal-backdrop" data-close></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="상세">
        <button class="modal-close" data-close aria-label="닫기">&times;</button>
        <div class="modal-body" id="modalBody"></div>
      </div>
    </div>`;

  // 주입
  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer + floatCall + modal);
})();
