"use client";

import { useRouter } from "next/navigation";
import { createVendor, deleteVendor, updateVendor } from "@/app/admin/vendors/actions";
import type { Vendor } from "@/lib/types";

export default function VendorTierCell({
  vendor,
  category,
  tier,
  canManage,
}: {
  vendor: Vendor | null;
  category: string;
  tier: string;
  canManage: boolean;
}) {
  const router = useRouter();

  if (vendor) {
    if (!canManage) {
      return (
        <div>
          <p className="truncate text-xs font-medium text-charcoal">{vendor.name}</p>
          {vendor.contact && <p className="truncate text-[11px] text-charcoal/50">{vendor.contact}</p>}
        </div>
      );
    }

    return (
      <div className="group flex flex-col gap-0.5">
        <input
          key={vendor.name}
          defaultValue={vendor.name}
          onBlur={async (event) => {
            const name = event.target.value.trim();
            if (!name) {
              event.target.value = vendor.name;
              return;
            }
            if (name === vendor.name) return;
            const formData = new FormData();
            formData.set("name", name);
            formData.set("contact", vendor.contact ?? "");
            await updateVendor(vendor.id, formData);
            router.refresh();
          }}
          className="w-full truncate border-b border-transparent bg-transparent text-xs font-medium text-charcoal outline-none hover:border-nude focus:border-orange-400"
        />
        <input
          key={vendor.contact ?? ""}
          defaultValue={vendor.contact ?? ""}
          placeholder="연락처"
          onBlur={async (event) => {
            const contact = event.target.value.trim();
            if (contact === (vendor.contact ?? "")) return;
            const formData = new FormData();
            formData.set("name", vendor.name);
            formData.set("contact", contact);
            await updateVendor(vendor.id, formData);
            router.refresh();
          }}
          className="w-full truncate border-b border-transparent bg-transparent text-[11px] text-charcoal/50 outline-none hover:border-nude focus:border-orange-400"
        />
        <form action={deleteVendor.bind(null, vendor.id)}>
          <button
            type="submit"
            className="text-[10px] text-charcoal/30 opacity-0 hover:text-red-600 group-hover:opacity-100"
          >
            삭제
          </button>
        </form>
      </div>
    );
  }

  if (!canManage) return <p className="text-center text-[11px] text-charcoal/20">-</p>;

  return (
    <form action={createVendor} className="flex flex-col gap-0.5">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="tier" value={tier} />
      <input
        name="name"
        placeholder="업체명"
        className="w-full border-b border-nude bg-transparent text-xs outline-none focus:border-orange-400"
      />
      <input
        name="contact"
        placeholder="연락처"
        className="w-full border-b border-nude bg-transparent text-[11px] outline-none focus:border-orange-400"
      />
      <button type="submit" className="self-start text-[10px] text-orange-600 hover:underline">
        + 추가
      </button>
    </form>
  );
}
