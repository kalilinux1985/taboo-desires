// Small flag for the countries members can pick (see shared/sellerDetails.ts).
// Images rather than emoji, because Windows shows emoji flags as letters.

const CODES: Record<string, string> = {
  "United States": "us", Canada: "ca", "United Kingdom": "gb", Ireland: "ie",
  Australia: "au", "New Zealand": "nz", Germany: "de", France: "fr", Spain: "es",
  Italy: "it", Netherlands: "nl", Belgium: "be", Sweden: "se", Norway: "no",
  Denmark: "dk", Finland: "fi", Poland: "pl", Portugal: "pt", Austria: "at",
  Switzerland: "ch", "Czech Republic": "cz", Mexico: "mx", Brazil: "br",
  Argentina: "ar", Colombia: "co", Chile: "cl", "South Africa": "za", Japan: "jp",
  "South Korea": "kr", Philippines: "ph", Thailand: "th", India: "in",
};

export default function CountryFlag({ country, className }: { country: string; className?: string }) {
  const code = CODES[country];
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      className={className ?? "h-3.5 w-5 rounded-[1px] object-cover"}
    />
  );
}
