/* 리안디자인 기존 홈페이지(reandesign.kr, 카페24) 방문 기록 (2026-11-15)
 * 카페24 관리자 > 디자인 편집 > 공통 레이아웃 </body> 바로 위에 아래 한 줄을 넣는다:
 *   <script src="https://www.reandesign.co.kr/rean-track.js" defer></script>
 * 대표님·팀원 기기는 한 번만 https://reandesign.kr/?rean_staff=1 로 들어가면 그 기기 방문이 빠진다.
 */
(function () {
  try {
    var KEY_VISITOR = "rean_vid";
    var KEY_STAFF = "rean_staff";
    var params = new URLSearchParams(location.search);
    if (params.get("rean_staff") === "1") localStorage.setItem(KEY_STAFF, "1");
    if (params.get("rean_staff") === "0") localStorage.removeItem(KEY_STAFF);
    if (localStorage.getItem(KEY_STAFF) === "1") return;

    var vid = localStorage.getItem(KEY_VISITOR);
    if (!vid) {
      vid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/[^a-zA-Z0-9-]/g, "");
      localStorage.setItem(KEY_VISITOR, vid);
    }

    // 어디서 왔나: 같은 홈페이지 안에서 옮겨 다닌 것은 빼고, 블로그는 아이디까지 (새 홈페이지와 같은 방식)
    var refHost = null;
    var blogSource = null;
    if (document.referrer) {
      var ref = new URL(document.referrer);
      var h = ref.hostname.replace(/^www\./, "");
      if (h !== location.hostname.replace(/^www\./, "")) {
        refHost = h;
        if (h.indexOf("blog.naver") >= 0) {
          var id = ref.searchParams.get("blogId") || ref.pathname.split("/").filter(Boolean)[0];
          if (id && /^[a-zA-Z0-9_-]+$/.test(id) && !/\.naver$/.test(id)) blogSource = "blog:" + id;
        }
      }
    }
    var utm = params.get("utm_source") || blogSource;

    var body = JSON.stringify({ v: vid, p: location.pathname || "/", r: refHost, u: utm });
    var url = "https://www.reandesign.co.kr/api/track";
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
    else fetch(url, { method: "POST", body: body, keepalive: true, mode: "cors" });
  } catch (e) {
    /* 기록 실패해도 홈페이지는 그대로 */
  }
})();
