import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileText, Link2 } from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GUIDANCE_LEAFLETS, GUIDANCE_LINKS } from "@/lib/guidance";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "المكتبة الإرشادية | الذات" },
      {
        name: "description",
        content: "مطويات ونشرات إرشادية وروابط مفيدة للطلاب وأولياء الأمور والمعلمين.",
      },
      { property: "og:title", content: "المكتبة الإرشادية | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <PublicLayout
      title="المكتبة الإرشادية"
      subtitle="مطويات ونشرات مختصرة يمكن قراءتها مباشرة، إضافة إلى روابط الجهات والمنصات الرسمية."
    >
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
        <div className="flex items-center gap-3">
          <FileText className="size-6 text-primary" />
          <h2 className="text-2xl font-black">مطويات ونشرات</h2>
        </div>

        <Accordion type="single" collapsible className="mt-6 space-y-3">
          {GUIDANCE_LEAFLETS.map((leaflet) => (
            <AccordionItem
              key={leaflet.title}
              value={leaflet.title}
              className="rounded-2xl border border-border/70 bg-card px-5"
            >
              <AccordionTrigger className="text-right hover:no-underline">
                <span className="flex flex-col items-start gap-1">
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {leaflet.category}
                    </span>
                    <span className="font-bold">{leaflet.title}</span>
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {leaflet.summary}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pb-2 text-sm leading-7">
                  {leaflet.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="border-t border-border/60 bg-muted/20 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link2 className="size-6 text-primary" />
            <h2 className="text-2xl font-black">روابط مفيدة</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDANCE_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{link.title}</h3>
                  <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{link.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
