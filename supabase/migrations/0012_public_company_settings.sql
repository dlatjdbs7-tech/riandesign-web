-- company_settings는 공개 홈페이지 Footer/Contact 페이지에서도 표시되는데,
-- 기존 정책은 로그인한 승인 직원만 조회 가능해서 익명 방문자는 항상 null을 받고 있었다.
-- (지금까지 Footer가 정상으로 보인 건 하드코딩된 폴백 값이 실제 값과 우연히 같았기 때문)
-- portfolio_items/site_content와 동일하게 조회는 공개, 수정은 대표만 가능하도록 맞춘다.

create policy "anyone_can_view_company_settings" on company_settings for select
  using (true);
