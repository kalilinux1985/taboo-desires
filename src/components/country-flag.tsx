// Small flag for the countries members can pick (see shared/sellerDetails.ts).
// Pictures rather than emoji, because Windows shows emoji flags as letters.
// The flags are part of the site (not loaded from another website), so a
// visitor's browser never contacts a third party just to show one.

import {
  AR, AT, AU, BE, BR, CA, CH, CL, CO, CZ, DE, DK, ES, FI, FR, GB, IE, IN, IT, JP, KR, MX, NL, NO, NZ, PH, PL, PT, SE, TH, US, ZA,
} from "country-flag-icons/react/3x2";
import type { FlagComponent } from "country-flag-icons/react/3x2";

type Flag = FlagComponent;

const FLAGS: Record<string, Flag> = {
  "United States": US, Canada: CA, "United Kingdom": GB, Ireland: IE,
  Australia: AU, "New Zealand": NZ, Germany: DE, France: FR, Spain: ES,
  Italy: IT, Netherlands: NL, Belgium: BE, Sweden: SE, Norway: NO,
  Denmark: DK, Finland: FI, Poland: PL, Portugal: PT, Austria: AT,
  Switzerland: CH, "Czech Republic": CZ, Mexico: MX, Brazil: BR,
  Argentina: AR, Colombia: CO, Chile: CL, "South Africa": ZA, Japan: JP,
  "South Korea": KR, Philippines: PH, Thailand: TH, India: IN,
};

export default function CountryFlag({ country, className }: { country: string; className?: string }) {
  const Flag = FLAGS[country];
  if (!Flag) return null;
  return (
    <span role="img" aria-label={country} title={country} className={className ?? "inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px]"}>
      <Flag className="size-full" preserveAspectRatio="xMidYMid slice" />
    </span>
  );
}
