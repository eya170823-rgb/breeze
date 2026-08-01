/* =====================================================================
   브리즈부동산중개 BREEZE — 사이트 설정
   여기 값(따옴표 " " 안)만 바꾸면 사이트 전체에 반영됩니다.
   ===================================================================== */

window.BREEZE_CONFIG = {
  // 업체 기본 정보
  brand: "BREEZE",
  brandKo: "브리즈부동산중개",
  slogan: "바른 기준, 가치 있는 동행",
  sloganSub: "BREEZE가 당신과 함께합니다.",
  phone: "010-2601-0110",
  email: "eya170823@gmail.com",
  hours: "09:00 - 20:00",
  parking: "전면주차 가능",
  address: "제주특별자치도 제주시 삼무로1길 13, 1층",
  addressShort: "제주시 삼무로1길 13, 1층 (연동)",

  // 카카오톡 상담 링크(채널/오픈채팅). 비우면 '카카오 상담' 버튼 숨김.
  kakaoUrl: "",

  // 전자책 링크. 비우면 '준비중'. (예스24 — 알라딘·밀리의서재 등록되면 추가)
  ebookUrl: "https://www.yes24.com/product/goods/193451248",

  // 채널 링크 (비우면 '준비중'). 카카오톡은 위 kakaoUrl 사용.
  social: {
    naver: "",
    blog: "https://blog.naver.com/eya81",
    youtube: "https://www.youtube.com/@BREEZE%EB%B6%80%EB%8F%99%EC%82%B0%EC%A4%91%EA%B0%9C",
    instagram: "https://www.instagram.com/170_55",
  },

  // 사업자 정보 (푸터 표시)
  company: {
    name: "브리즈 부동산중개",
    ceo: "박정희",
    bizNo: "547-48-01397", // 사업자등록번호
    regNo: "50110-2026-00057", // 중개사무소 등록번호 (부동산 광고 시 표기 의무)
  },

  // 네이버 지도 — NCP Client ID 넣으면 페이지 안에 실제 지도. 비우면 '네이버 지도에서 보기' 패널.
  naver: {
    mapClientId: "",
    lat: 33.4904326, // 제주시 삼무로1길 13 (구글지도 기준 정확 좌표)
    lng: 126.4896438,
    placeUrl: "", // 네이버 플레이스/지도 공유 링크 (있으면 버튼이 여기로 연결)
  },

  // ★ 매물·뉴스·게시판 엔진 (구글 앱스 스크립트 웹앱 주소)
  //   매물 = 브리즈 CRM '매물관리' 시트 (2026-08-01 CRM 백엔드 v9로 이전 — 계약완료·테스트 제외, 개인정보·지번 미노출)
  //   뉴스/게시판 = 네이버 블로그 카테고리에서 자동 (CRM 백엔드가 동일하게 처리)
  //   ⚠ 이 주소는 CRM GAS v9 배포 후에만 동작 — v9 배포 전에는 푸시하지 말 것.
  //   (예전 홈페이지엔진: AKfycbyaYgUnLwFvLkcLD9peBbSfZ7g4jJgQhbl63epbmMD-Tj89ScFIjsUAMHmkEeSwI8qv)
  feedUrl: "https://script.google.com/macros/s/AKfycbwM-LUL3NJ19XGeedp0Toz71cYR_RW38bVuh4bfSIzTd2qn-dGyGFLfjsodIyTA4LWu/exec",
};
