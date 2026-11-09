"use client";

import { useState } from "react";
import { formatPhoneNumber } from "@/lib/format";

export type AsContactOption = {
  value: string; // "c:<고객 id>" | "w:<현장 id>" | "i:<상담 id>"
  group: "고객" | "현장" | "상담접수";
  label: string;
  name: string;
  phone: string;
  address: string;
};

// AS 등록/수정의 고객 입력 칸.
// 고객·현장·상담접수에서 고르면 이름·연락처·주소가 채워지고, 채워진 값은 직접 고칠 수 있다.
// 고객·우수회원 명단에서 고른 경우에만 customer_id로 연결된다.
export default function AsContactFields({
  options,
  fieldClass,
  initial,
}: {
  options: AsContactOption[];
  fieldClass: string;
  initial?: { customerId: string | null; name: string; phone: string; address: string };
}) {
  const [selected, setSelected] = useState(initial?.customerId ? `c:${initial.customerId}` : "");
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(formatPhoneNumber(initial?.phone ?? ""));
  const [address, setAddress] = useState(initial?.address ?? "");

  function handleSelect(value: string) {
    setSelected(value);
    const option = options.find((o) => o.value === value);
    if (!option) return;
    setName(option.name);
    if (option.phone) setPhone(formatPhoneNumber(option.phone));
    if (option.address) setAddress(option.address);
  }

  const groups = (["고객", "현장", "상담접수"] as const)
    .map((group) => ({ group, items: options.filter((o) => o.group === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <input type="hidden" name="customer_id" value={selected.startsWith("c:") ? selected.slice(2) : ""} />
      <select value={selected} onChange={(e) => handleSelect(e.target.value)} className={fieldClass}>
        <option value="">고객 불러오기 (현장·상담접수)</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <input
        name="caller_name"
        placeholder="고객 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={fieldClass}
      />
      <input
        name="phone"
        inputMode="numeric"
        placeholder="연락처"
        value={phone}
        onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
        className={fieldClass}
      />
      <input
        name="address"
        placeholder="현장 주소 (선택)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className={fieldClass}
      />
    </>
  );
}
