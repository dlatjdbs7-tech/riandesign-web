"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { restoreFromTrash } from "@/app/admin/trash/actions";

export default function RestoreButton({ trashId }: { trashId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreFromTrash(trashId);
            if ("error" in result) setError(result.error);
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1 rounded-full border border-orange-300 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
      >
        <RotateCcw size={13} /> {isPending ? "되돌리는 중" : "되돌리기"}
      </button>
    </span>
  );
}
