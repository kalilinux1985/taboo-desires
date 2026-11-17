"use client";

import { useSearchParams } from "@/lib/navigation.ts";
import ReportForm, { REPORT_TYPES, type ReportType } from "@/components/report-form.tsx";
import { cn } from "@/lib/utils.ts";
import { NURMA, OUTER, SANS } from "@/views/seller/_lib/profile-design.tsx";
import LegalPage, { List, Section } from "./legal-page.tsx";

export default function ReportPage() {
  const [params] = useSearchParams();
  const asked = params.get("type");
  const type = (REPORT_TYPES.find((t) => t.value === asked)?.value ?? "nonconsensual_intimate") as ReportType;
  return (
    <LegalPage
      title="Report Content"
      intro="Use this form to report content on the Site or to ask for it to be taken down. You don't need an account."
    >
      <Section title="Intimate images shared without consent">
        <p>
          If an intimate image or video of you was posted without your consent, including a fake or AI-generated one,
          you can ask us to remove it. We remove it within 48 hours of a valid request and look for identical copies.
          A valid request has:
        </p>
        <List
          items={[
            "your signature (type your full name below), or that of the person acting for you",
            "the link to the content, or enough detail for us to find it",
            "a short statement that you believe in good faith that it is an intimate image shared without consent",
            "your contact details",
          ]}
        />
      </Section>
      <Section title="Anything else">
        <p>
          Report anyone who is or looks under 18, illegal content, harassment or copyright infringement with the same
          form. We review those within 7 days, and sooner when someone may be in danger. If someone is in immediate
          danger, contact your local emergency services.
        </p>
      </Section>
      <div className={cn(OUTER, SANS, "p-5 sm:p-6")}>
        <h2 className={cn(NURMA, "mb-4 text-[24px] text-white")}>Send a report</h2>
        <ReportForm defaultType={type} />
      </div>
    </LegalPage>
  );
}
