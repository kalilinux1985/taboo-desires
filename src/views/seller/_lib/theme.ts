// Colours and type of the seller profile design (dark navy panels, violet accents).

/** Outer panel: a section of the page */
export const PANEL =
  "rounded-sm border border-white/[0.06] bg-[#0a1020] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]";
/** Inner box inside a panel (forms, posts, cards) */
export const INSET = "rounded-sm border border-white/[0.06] bg-[#050a16]";
/** Body text in the book serif */
export const TEXT_FONT = "[font-family:var(--font-profile-text),ui-serif,Georgia,serif]";
/** Section headings in the old-style serif */
export const HEADING_FONT = "[font-family:var(--font-profile-heading),ui-serif,Georgia,serif]";
/** Small violet outlined action ("VIEW ALL LISTINGS") */
export const OUTLINE_ACTION =
  "inline-flex cursor-pointer items-center rounded-sm border-2 border-violet-600 px-4 py-1.5 text-sm font-bold uppercase tracking-tight text-violet-400 transition-colors hover:bg-violet-600 hover:text-white";
/** Tab pill, active state via data-[state=active] */
export const TAB_PILL =
  "cursor-pointer rounded-sm border-0 bg-[#1b2235] px-4 py-1.5 text-sm text-slate-400 shadow-none data-[state=active]:bg-violet-600 data-[state=active]:font-bold data-[state=active]:text-white";
