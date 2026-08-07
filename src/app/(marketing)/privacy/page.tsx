import { createClient } from "@/utils/supabase/server";
import type { CompanySettings } from "@/lib/types";

const SECTIONS = [
  {
    title: "제1조 (개인정보의 수집 항목 및 방법)",
    body: [
      "1. 수집 항목",
      "필수: 성함, 연락처, 문의내용",
      "선택: 첨부파일(평면도, 레퍼런스 이미지)",
      "2. 수집 방법",
      "홈페이지 문의폼 · 이메일 · 전화 상담",
    ],
  },
  {
    title: "제2조 (개인정보의 수집 및 이용 목적)",
    body: [
      "회사는 수집한 개인정보를 다음 목적을 위해 활용하며, 이용 목적이 변경될 경우 사전 동의를 구합니다.",
      "견적 안내 및 1:1 상담 · 계약 체결 및 결제 처리 · 인테리어 시공 서비스 제공 및 사후 지원 · 고객 관리 및 문의 응답 · 시공 후 A/S 및 하자 처리",
    ],
  },
  {
    title: "제3조 (개인정보의 보유 및 이용 기간)",
    body: [
      "문의 처리 완료 후 3년간 보관 후 파기",
      "계약 체결 후에는 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 5년간 보관",
      "회계 관련 정보는 「국세기본법」에 따라 5년간 보관",
      "보유 기간 경과 시 즉시 파기합니다.",
    ],
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    body: [
      "회사는 정보주체의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 다음의 경우는 예외로 합니다.",
      "정보주체가 사전에 동의한 경우 · 법령의 규정에 따라 수사기관의 요구가 있는 경우",
    ],
  },
  {
    title: "제5조 (개인정보 처리 위탁)",
    body: [
      "회사는 원활한 서비스 운영을 위해 다음 업무를 외부에 위탁할 수 있습니다.",
      "호스팅·서버 운영: Vercel / Supabase",
    ],
  },
  {
    title: "제6조 (정보주체의 권리)",
    body: [
      "정보주체는 회사에 대해 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다.",
      "위 권리 행사는 아래 연락처로 하실 수 있으며, 회사는 지체 없이 조치합니다.",
    ],
  },
  {
    title: "제7조 (개인정보의 파기)",
    body: [
      "보유기간 경과 또는 처리목적 달성 시 즉시 파기합니다.",
      "전자적 파일: 복구·재생이 불가능한 방법으로 영구 삭제",
    ],
  },
  {
    title: "제8조 (개인정보의 안전성 확보 조치)",
    body: [
      "회사는 「개인정보 보호법」 제29조에 따라 관리적·기술적·물리적 안전성 확보 조치를 취하고 있습니다.",
    ],
  },
  {
    title: "제9조 (개인정보 보호책임자)",
    body: [], // 대표/이메일/전화는 company_settings에서 실시간으로 가져와 아래에서 별도 렌더링
  },
  {
    title: "제10조 (권익침해 구제방법)",
    body: [
      "정보주체는 개인정보 침해에 대한 구제를 받기 위해 다음 기관에 도움을 요청할 수 있습니다.",
      "개인정보분쟁조정위원회 (1833-6972) · 개인정보침해신고센터 (118) · 대검찰청 사이버수사과 (1301) · 경찰청 사이버수사국 (182)",
    ],
  },
  {
    title: "제11조 (정책 변경)",
    body: [
      "본 처리방침의 내용 추가·삭제 및 수정이 있을 경우 시행 7일 전부터 홈페이지를 통해 사전 공지합니다.",
    ],
  },
];

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single<CompanySettings>();

  const companyName = settings?.company_name ?? "리안디자인";
  const representative = settings?.representative_name ?? "임상혁";
  const email = settings?.email ?? "red7@hanmail.net";
  const phone = settings?.phone ?? "042-721-9714";

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10">
        <p className="text-xs tracking-[0.4em] text-taupe">PRIVACY POLICY</p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-charcoal sm:text-5xl">
          개인정보처리방침
        </h1>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 sm:px-10">
        <p className="mb-10 leading-relaxed text-charcoal/70">
          {companyName}(이하 &ldquo;회사&rdquo;)은 「개인정보 보호법」 제30조에 따라 정보주체의
          개인정보를 보호하고, 관련 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같은
          처리방침을 운영합니다.
        </p>

        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="font-serif text-lg font-semibold text-charcoal">{section.title}</h2>
              <div className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-charcoal/70">
                {section.title.startsWith("제9조") ? (
                  <>
                    <p>보호책임자: {representative} (대표)</p>
                    <p>이메일: {email}</p>
                    <p>전화: {phone}</p>
                    <p>
                      정보주체는 위 연락처로 개인정보 관련 문의·불만·피해구제 등을 요청할 수
                      있으며, 회사는 신속하게 답변·조치합니다.
                    </p>
                  </>
                ) : (
                  section.body.map((line, index) => <p key={index}>{line}</p>)
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-14 text-center text-xs text-charcoal/50">
          본 개인정보처리방침은 2026년 8월 7일부터 시행됩니다.
        </p>
      </section>
    </div>
  );
}
