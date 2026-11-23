import Link from "next/link";
import { COMPANY } from "@/lib/legal.ts";
import LegalPage, { List, Section } from "./legal-page.tsx";

export default function Copyright() {
  return (
    <LegalPage
      title="Copyright and DMCA"
      intro={`${COMPANY.name} respects the rights of creators. If you believe something on the Site infringes your copyright, you can ask us to remove it.`}
    >
      <Section title="Sending a notice">
        <p>
          Use the <Link href="/report" className="text-[#7c3aed] hover:underline">report form</Link> and choose
          "Copyright infringement", or send a written notice
          {COMPANY.email ? <> to <a href={`mailto:${COMPANY.email}`} className="text-[#7c3aed] hover:underline">{COMPANY.email}</a></> : null}
          {COMPANY.copyrightAgent ? <> addressed to our designated agent, {COMPANY.copyrightAgent}</> : null}
          {COMPANY.address ? <> ({COMPANY.address})</> : null}. A notice must include:
        </p>
        <List
          items={[
            "your physical or electronic signature (a typed full name on the form counts)",
            "a description of the copyrighted work you say was infringed",
            "the link to the material on the Site, or enough detail for us to find it",
            "your name, address, email and phone number",
            "a statement that you believe in good faith that the use isn't authorized by the owner, its agent or the law",
            "a statement, under penalty of perjury, that the information is accurate and that you are the owner or authorized to act for the owner",
          ]}
        />
        <p>Knowingly sending a false notice can make you liable for damages.</p>
      </Section>

      <Section title="If your content was removed">
        <p>
          If you believe we removed your content by mistake, you can send us a counter-notice with your signature, a
          description of the removed content and where it was, a statement under penalty of perjury that you believe it
          was removed by mistake, your contact details, and your agreement to the jurisdiction of the federal court for
          your address. We may restore the content after a waiting period unless the person who complained takes legal
          action.
        </p>
      </Section>

      <Section title="Repeat infringers">
        <p>We end the accounts of users who are repeatedly found to infringe copyright.</p>
      </Section>
    </LegalPage>
  );
}
