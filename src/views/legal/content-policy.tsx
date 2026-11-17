import Link from "next/link";
import { COMPANY } from "@/lib/legal.ts";
import LegalPage, { List, Section } from "./legal-page.tsx";

export default function ContentPolicy() {
  return (
    <LegalPage
      title="Content Policy"
      intro={`${COMPANY.name} is an adult marketplace. It only works if everyone shown is an adult who agreed to be there. These rules apply to everything on the Site: listings, photos, videos, posts, comments, messages and profiles.`}
    >
      <Section title="Never allowed">
        <List
          items={[
            "Anyone under 18, in any form. This includes anyone who looks or is described as under 18, and cartoon or AI-made images of minors. We report it to the authorities.",
            "Intimate images or videos of a person shared without their consent, including images taken in private, leaked or stolen content, and fake or AI-generated images of a real person.",
            "Content showing a person who has not clearly agreed to appear and to have it posted and sold.",
            "Trafficking, coercion, or anything involving someone who is forced, threatened or deceived. Content that promotes or arranges sexual services in exchange for money.",
            "Sexual content involving animals, real violence, or sexual content that shows or encourages serious harm.",
            "Illegal items or activity, fraud, scams, or selling things you don't have the right to sell.",
            "Harassment, threats, hate, doxxing (sharing someone's private information) or impersonation.",
            "Content that infringes someone's copyright or other rights.",
          ]}
        />
      </Section>

      <Section title="What sellers must do">
        <List
          items={[
            "Be at least 18, and make sure everyone shown in your content is at least 18.",
            "Have the written consent of every person shown to appear in the content and to its posting and sale, and keep proof of their age and identity. We may ask you for it, and we remove content if you can't provide it.",
            "Only post content you created or have the right to sell.",
            "Follow the laws that apply to you, including record-keeping rules for sexually explicit content (such as 18 U.S.C. § 2257) and tax rules.",
            "Describe items honestly and ship what you sell.",
          ]}
        />
      </Section>

      <Section title="What buyers must do">
        <List
          items={[
            "Be at least 18.",
            "Don't save, copy, share or re-post content you unlock, and don't use it to harass or expose anyone.",
            "Respect sellers' boundaries and don't pressure them for anything outside what they listed.",
          ]}
        />
      </Section>

      <Section title="How we enforce this">
        <p>
          We may review, hide or remove content and suspend or end accounts that break these rules, with or without
          notice. Serious or repeated violations may be reported to the authorities, and illegal content involving
          minors is reported as the law requires.
        </p>
      </Section>

      <Section title="Report something">
        <p>
          Use the <Link href="/report" className="text-[#7b3aec] hover:underline">report form</Link>, or the Report
          button on a listing, post or profile. You don't need an account. If you are shown in an intimate image that
          was shared without your consent, we remove it within 48 hours of a valid request.
        </p>
      </Section>
    </LegalPage>
  );
}
