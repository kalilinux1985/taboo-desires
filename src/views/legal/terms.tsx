import Link from "next/link";
import { COMPANY } from "@/lib/legal.ts";
import LegalPage, { List, Section } from "./legal-page.tsx";

export default function Terms() {
  const who = COMPANY.legalName || COMPANY.name;
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms are the agreement between you and ${who} ("we", "us") for using ${COMPANY.name} (the "Site"). By creating an account or using the Site you agree to them. If you don't agree, don't use the Site.`}
    >
      <Section title="1. Who can use the Site">
        <List
          items={[
            "You must be at least 18 years old, or the age of majority where you live if that is higher. The Site contains adult material and is not for anyone under 18.",
            "You must give accurate information when you sign up and keep your account secure. You are responsible for what happens under your account.",
            "You can only use the Site if the law where you live allows you to view and take part in adult content and sales.",
            "We may ask you to verify your age or identity, and we may refuse or end accounts that don't.",
          ]}
        />
      </Section>

      <Section title="2. What the Site is">
        <p>
          {COMPANY.name} is a marketplace where sellers list items (such as worn or used items) and digital photos and
          videos ("Instant Content"), and buyers contact sellers to buy them. We provide the platform. We are not a
          party to a sale between a buyer and a seller.
        </p>
        <List
          items={[
            "The Site does not currently process payments or hold money. Buyers and sellers agree how payment is made between themselves, and any payment is at your own risk.",
            "Instant Content stays locked until the seller approves a buyer's request, usually after the seller has been paid. Access to unlocked Instant Content lasts 24 hours from the moment the seller approves it. Don't save, copy, share or re-post it.",
            "Sellers are responsible for describing items honestly, shipping them, and following the laws that apply to their sales, including taxes.",
            "Paid seller plans (\"Pro\") give extra features. Plan terms and prices are shown on the pricing page.",
          ]}
        />
      </Section>

      <Section title="3. What you must not do">
        <p>
          Our <Link href="/content-policy" className="text-[#7b3aec] hover:underline">Content Policy</Link> is part of
          these terms. In short, you must not:
        </p>
        <List
          items={[
            "post or send anything involving a person under 18, or anyone who looks or is presented as under 18",
            "post a person's image, video or voice without their clear consent, including intimate images shared without consent and fake or AI-generated images of a real person",
            "post illegal content, or use the Site for trafficking, coercion, exploitation, fraud or scams",
            "harass, threaten, stalk or impersonate anyone, or share someone's private information",
            "post content you don't have the right to use, or infringe anyone's copyright or other rights",
            "copy, resell or share content you unlocked, or get around the Site's locks and limits",
            "use the Site to spam, scrape it, interfere with it, or try to access accounts or data that aren't yours",
          ]}
        />
      </Section>

      <Section title="4. Your content">
        <List
          items={[
            "You keep ownership of what you post. You give us a worldwide, non-exclusive licence to host, display, copy and distribute it on the Site so that we can run the Site.",
            "You promise that you own or have the rights to everything you post, that every person shown is at least 18 and has agreed to appear and to the content being posted and sold, and that you can prove this if we ask.",
            "If we ask, you must give us proof of the age, identity and consent of everyone shown. Sellers who post sexually explicit images of real people must keep the records the law requires for them, such as those under 18 U.S.C. § 2257.",
            "We may review, refuse, hide or remove any content, and we may do so without notice.",
          ]}
        />
      </Section>

      <Section title="5. Reports and takedowns">
        <p>
          Anyone can report content at any time using the <Link href="/report" className="text-[#7b3aec] hover:underline">report form</Link>.
          We remove intimate images shared without consent within 48 hours of a valid request, and we review other reports
          promptly. We act on copyright notices as described on the{" "}
          <Link href="/copyright" className="text-[#7b3aec] hover:underline">Copyright page</Link>.
        </p>
      </Section>

      <Section title="6. Ending your account">
        <p>
          You can delete your account at any time in Settings. We can suspend or end an account, and remove content, if
          you break these terms or the law, if we are asked to by law, or if we think it is needed to protect people or
          the Site. Repeat or serious violations may be reported to the authorities.
        </p>
      </Section>

      <Section title="7. No guarantees">
        <p>
          The Site is provided "as is" and "as available". We do not promise that it will always work, or that
          listings, sellers, buyers or their content are accurate, lawful or safe. We are not responsible for what users
          post or do, or for a transaction between users.
        </p>
      </Section>

      <Section title="8. Limit of liability">
        <p>
          To the fullest extent the law allows, we are not liable for indirect, incidental or consequential losses, or
          for lost profits, data or goodwill, arising from your use of the Site. Our total liability to you for any claim
          is limited to the amount you paid us in the 12 months before the claim, or $100 if you paid nothing. Some places
          don't allow these limits, so they may not apply to you.
        </p>
      </Section>

      <Section title="9. Your responsibility to us">
        <p>
          You agree to cover the losses, costs and legal fees we incur because of content you post or because you break
          these terms or the law.
        </p>
      </Section>

      <Section title="10. Changes and contact">
        <p>
          We may update these terms. If the changes are important we will tell you on the Site. If you keep using the
          Site after a change you accept the new terms.
        </p>
        <p>
          Questions or legal notices:{" "}
          {COMPANY.email ? <a href={`mailto:${COMPANY.email}`} className="text-[#7b3aec] hover:underline">{COMPANY.email}</a> : "use the report form"}
          {COMPANY.address ? `, ${COMPANY.address}` : ""}.
        </p>
      </Section>
    </LegalPage>
  );
}
