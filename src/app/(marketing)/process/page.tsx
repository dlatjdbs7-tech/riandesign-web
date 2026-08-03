import { createClient } from "@/utils/supabase/server";
import type { ProcessStep, SiteContent } from "@/lib/types";

export default async function ProcessPage() {
  const supabase = await createClient();
  const [{ data: steps }, { data: content }] = await Promise.all([
    supabase.from("process_steps").select("*").order("display_order").returns<ProcessStep[]>(),
    supabase.from("site_content").select("*").eq("id", 1).single<SiteContent>(),
  ]);

  const intro = content?.process_intro || "고객과 함께 하는 공간, 투명한 절차로 진행됩니다.";

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10">
        <p className="text-xs tracking-[0.4em] text-taupe">PROCESS</p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-charcoal sm:text-5xl">
          How we work
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-charcoal/60">{intro}</p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 sm:px-10">
        <ol className="flex flex-col gap-8">
          {(steps ?? []).map((step) => (
            <li
              key={step.id}
              className="flex flex-col gap-2 border-b border-nude/60 pb-8 last:border-0 sm:flex-row sm:gap-8"
            >
              <span className="font-serif text-3xl text-gold sm:w-20 sm:shrink-0">
                {String(step.step_number).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-serif text-xl font-semibold text-charcoal">{step.title}</h2>
                {step.description && (
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/70">{step.description}</p>
                )}
              </div>
            </li>
          ))}
          {(!steps || steps.length === 0) && (
            <p className="text-center text-sm text-charcoal/50">준비 중입니다.</p>
          )}
        </ol>
      </section>
    </div>
  );
}
