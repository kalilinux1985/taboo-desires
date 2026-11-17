import type { ReactNode } from "react";
import ZoomImage from "@/components/zoom-image.tsx";
import { formatDistanceToNow } from "date-fns";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";

// Profile design shared by buyer and seller profiles: #191a1f page, #212227
// outer cards, #141519 inner cards with a faint edge, violet #7b3aec, grey
// #a4a4a4 labels. Inside `.profile-design` the site's violet classes turn #7b3aec.

export const SERIF = "[font-family:var(--font-profile-buyer),Cambria,Georgia,serif]";
export const SANS = "[font-family:Arial,Helvetica,sans-serif]";
/** Nurma display face: member names and page titles */
export const NURMA = "[font-family:var(--font-nurma),Arial,sans-serif]";
export const OUTER = "rounded-[2px] border border-white/[3%] bg-[#202227] shadow-[0_6px_14px_rgba(0,0,0,0.35)]";
export const INNER =
  "rounded-[2px] border border-[#59595b4f] bg-[#141519] shadow-[0_4px_10px_rgba(0,0,0,0.3)]";
/** A card inside an inner card (listings, posts, tiles) */
export const CARD =
  "rounded-[2px] border border-[#2a2c33] bg-[#202227] shadow-[0_4px_10px_rgba(0,0,0,0.3)]";
/** "1 year ago", without date-fns' "about"/"over"/"almost". */
export const joinedAgo = (date: string | number) =>
  formatDistanceToNow(new Date(date), { addSuffix: true }).replace(/^(about|over|almost) /, "");
export const imagesLabel = (n: number) => `${n} ${n === 1 ? "Image" : "Images"}`;

/** Filled violet action (Message Buyer / Message Seller) */
export const FILLED_ACTION = cn(
  SANS,
  "inline-flex h-[29px] w-[168px] cursor-pointer items-center justify-center rounded-[2px] bg-[#7b3aec] text-[10px] font-bold uppercase tracking-[0.02em] text-[#020516] transition-colors hover:bg-[#8a4ff0]",
);
/** Outlined violet action (Edit Profile, the ⋮ menu) */
export const OUTLINED_ACTION =
  "inline-flex h-[29px] cursor-pointer items-center justify-center rounded-[2px] border-2 border-[#5e2faf] text-[#7b3aec] transition-colors hover:bg-[#7b3aec] hover:text-white";

/** Page background and the two-column grid: picture | header, picture | tabs, about | content. */
export function ProfilePage({ children }: { children: ReactNode }) {
  return (
    <div className="profile-design min-h-[calc(100dvh-3.5rem)] bg-[#0C0F15]">
      <div
        className={cn(
          "mx-auto grid max-w-[1170px] gap-5 px-5 py-8 lg:py-[97px]",
          "[grid-template-areas:'avatar'_'header'_'about'_'tabs'_'content']",
          "lg:grid-cols-[minmax(0,445fr)_minmax(0,665fr)] lg:grid-rows-[1fr_auto_auto] lg:[grid-template-areas:'avatar_header'_'avatar_tabs'_'about_content']",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** The square profile picture: white with a picture icon when there's none. */
export function ProfilePicture({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="relative aspect-square w-full max-w-[445px] self-start overflow-hidden rounded-[6px] bg-white shadow-[0_6px_14px_rgba(0,0,0,0.45)] [grid-area:avatar]">
      {url ? (
        <ZoomImage src={url} alt={name} className="size-full"><img src={url} alt={name} className="size-full object-cover" /></ZoomImage>
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImageIcon className="size-[84%] text-[#adacb1]" strokeWidth={1.1} />
        </div>
      )}
    </div>
  );
}

/** Outer card holding an inner card, the design's section frame. */
export function Frame({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(OUTER, "p-[19px]", className)}>
      <div className={cn(INNER, "h-full", innerClassName)}>{children}</div>
    </section>
  );
}

/** "Photos 1 Image" with the short violet underline. `onCount` makes the count open the full list. */
export function SectionTitle({ title, count, onCount }: { title: string; count?: string; onCount?: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className={cn(SERIF, "flex flex-wrap items-baseline gap-x-1.5 leading-tight")}>
        <span className="text-[22px] text-white">{title}</span>
        {count &&
          (onCount ? (
            <button type="button" onClick={onCount} className="cursor-pointer text-[16px] text-[#7b3aec] hover:underline">
              {count}
            </button>
          ) : (
            <span className="text-[16px] text-[#7b3aec]">{count}</span>
          ))}
      </h2>
      <span className="h-0.5 w-[60px] bg-[#7b3aec]/55" />
    </div>
  );
}

/** The tab bar: dark buttons on an outer card; the open tab's text is violet. */
export function ProfileTabBar<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <nav aria-label="Profile sections" className={cn(OUTER, "flex flex-wrap gap-x-5 gap-y-2 px-[19px] py-[7px] [grid-area:tabs]")}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-current={value === t.value ? "page" : undefined}
          onClick={() => onChange(t.value)}
          className={cn(
            SERIF,
            "h-[30px] cursor-pointer rounded-[2px] bg-[#141519] px-[14px] text-[17px] transition-colors hover:text-[#7b3aec]",
            value === t.value ? "text-[#7b3aec]" : "text-white",
          )}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

/** One "Label: value" row of the About card. */
export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[15px] leading-[32px]">
      <dt className="shrink-0 text-[#ffffff]">{label}:</dt>
      <dd className="truncate text-right text-white">{value}</dd>
    </div>
  );
}
