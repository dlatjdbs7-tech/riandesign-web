import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { ProcessStep } from "@/lib/types";

export default async function ProcessPreview() {
  const supabase = await createClient();
  const { data: steps } = await supabase
    .from("process_steps")
    .select("*")
    .order("display_order")
    .limit(4)
    .returns<ProcessStep[]>();

  if (!steps || steps.length === 0) return null;

  return (
    <section className="px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <p className="text-xs tracking-[0.4em] text-taupe">PROCESS</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
            투명한 절차로 진행됩니다
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex flex-col gap-3 rounded-sm border border-nude/60 bg-cream p-8"
            >
              <span className="font-serif text-2xl text-gold">
                {String(step.step_number).padStart(2, "0")}
              </span>
              <h3 className="font-serif text-lg font-semibold text-charcoal">{step.title}</h3>
              {step.description && (
                <p className="text-sm leading-relaxed text-charcoal/70">{step.description}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/process"
            className="inline-flex items-center gap-2 rounded-full border border-charcoal/30 px-8 py-3 text-sm tracking-wide text-charcoal transition-colors hover:border-charcoal"
          >
            PROCESS 전체보기 <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
