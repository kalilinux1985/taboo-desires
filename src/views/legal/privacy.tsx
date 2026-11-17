import Link from "next/link";
import { COMPANY } from "@/lib/legal.ts";
import LegalPage, { List, Section } from "./legal-page.tsx";

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This policy explains what ${COMPANY.name} collects about you, why, and the choices you have. The Site is for adults only and is not meant for anyone under 18.`}
    >
      <Section title="What we collect">
        <List
          items={[
            "Account details: your email address, username, password (stored by our sign-in provider, never in plain text) and the account type you choose.",
            "Profile details: your country, gender, age group, profile picture and anything else you add to your profile or settings.",
            "Content: listings, photos, videos, posts, comments, messages, reviews, favorites and follows.",
            "Verification: if you apply for a verified badge or an age check, a photo (and, for an age check, ID and a selfie). These are used for the check and deleted afterwards. We keep only the result.",
            "Reports: if you report content, the details you give us, including your name and email.",
            "Technical data: device, browser, pages visited and basic logs, used to keep the Site working and secure.",
          ]}
        />
      </Section>

      <Section title="How we use it">
        <List
          items={[
            "to run the Site: your account, listings, messages and notifications",
            "to keep people safe: checking age, reviewing reports, preventing fraud and abuse, and following the law",
            "to contact you about your account, your reports and important changes",
            "to improve the Site",
          ]}
        />
        <p>We don't sell your personal information.</p>
      </Section>

      <Section title="Who sees it">
        <List
          items={[
            "Other users see your profile and the content you post, according to your privacy setting. You can make your profile private in Settings.",
            "Sellers and buyers you deal with see what you send them.",
            "Service providers who host and run the Site for us (such as our hosting and database providers), under their own privacy commitments.",
            "Authorities, when the law requires it or when we need to report illegal content or protect someone's safety.",
          ]}
        />
      </Section>

      <Section title="Keeping and deleting data">
        <p>
          We keep your data while your account is open. You can delete your account in Settings, which removes your
          profile, listings, messages and other content. We may keep limited records where the law requires it, for
          example reports, records of removed content, and information about illegal activity.
        </p>
      </Section>

      <Section title="Your choices">
        <List
          items={[
            "Edit your profile and details, or make your profile private, in Settings.",
            "Delete your account in Settings.",
            "Depending on where you live, you may have rights to access, correct or delete your data, or to object to some uses. Contact us and we will respond as the law requires.",
          ]}
        />
      </Section>

      <Section title="Security">
        <p>
          We use reasonable measures to protect your data, but no system is completely secure. Choose a strong password
          and don't share it. If you believe your account has been accessed by someone else, change your password and
          tell us.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use cookies and similar storage to keep you signed in and remember your settings. We don't use them to
          build advertising profiles.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          We may update this policy and will post the new date here. Questions about your data:{" "}
          {COMPANY.email ? <a href={`mailto:${COMPANY.email}`} className="text-[#7b3aec] hover:underline">{COMPANY.email}</a> : <>use the <Link href="/report" className="text-[#7b3aec] hover:underline">report form</Link></>}
          {COMPANY.address ? `, ${COMPANY.address}` : ""}.
        </p>
      </Section>
    </LegalPage>
  );
}
