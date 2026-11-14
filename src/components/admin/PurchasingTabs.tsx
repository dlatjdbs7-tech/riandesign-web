import Link from "next/link";

// 발주·업체 메뉴 공통 탭: 발주서와 업체정보를 한 메뉴에서 오간다.
const TABS = [
  { href: "/admin/field-management/purchase-orders", label: "발주서" },
  { href: "/admin/vendors", label: "업체정보" },
];

export default function PurchasingTabs({ active }: { active: "/admin/field-management/purchase-orders" | "/admin/vendors" }) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">발주·업체</h1>
      <div className="mt-4 flex gap-1 border-b border-nude/60">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active === tab.href
                ? "border-orange-500 text-orange-700"
                : "border-transparent text-charcoal/50 hover:text-charcoal"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
