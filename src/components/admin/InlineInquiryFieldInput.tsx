"use client";

import { useRouter } from "next/navigation";
import { updateInquiryField } from "@/app/admin/sites/actions";

export default function InlineInquiryFieldInput({
  inquiryId,
  field,
  value,
  placeholder,
  className,
}: {
  inquiryId: string;
  field: "address" | "size_py";
  value: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <input
      key={value}
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      onClick={(event) => event.stopPropagation()}
      onBlur={async (event) => {
        const raw = event.target.value.trim();
        if (raw === value) return;
        await updateInquiryField(inquiryId, field, raw);
        router.refresh();
      }}
      className={
        className ??
        "border-b border-transparent bg-transparent outline-none hover:border-nude focus:border-orange-400"
      }
    />
  );
}
