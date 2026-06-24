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
  address: "제주특별자치도 제주시 연동 260-18",
  addressShort: "제주시 연동 260-18",

  // 카카오톡 상담 링크(채널/오픈채팅). 비우면 '카카오 상담' 버튼 숨김.
  kakaoUrl: "",

  // 전자책 링크. 비우면 '준비중'.
  ebookUrl: "",

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
    bizNo: "", // 발급되면 입력 (예: "123-45-67890")
  },

  // 네이버 지도 — NCP Client ID 넣으면 페이지 안에 실제 지도. 비우면 '네이버 지도에서 보기' 패널.
  naver: {
    mapClientId: "",
    lat: 33.4889, // 사무실 좌표 (정확히 맞추려면 수정)
    lng: 126.4914,
    placeUrl: "", // 네이버 플레이스/지도 공유 링크 (있으면 버튼이 여기로 연결)
  },

  // ★ 매물·뉴스·게시판 엔진 (구글 앱스 스크립트 웹앱 주소)
  //   매물 = 시트의 '등록자=광고완료', 뉴스/게시판 = 블로그 카테고리에서 자동.
  //   (블로그 RSS·카테고리·매물 가공·개인정보 제외는 모두 엔진 'apps-script/홈페이지엔진.gs'에서 처리)
  //   엔진 교체 시 이 주소만 새 배포 주소로 바꾸면 됩니다.
  feedUrl: "https://script.google.com/macros/s/AKfycbyaYgUnLwFvLkcLD9peBbSfZ7g4jJgQhbl63epbmMD-Tj89ScFIjsUAMHmkEeSwI8qv/exec",
};
