// Colours and type of the seller profile design (sampled from the reference):
// #0f172a page, #0a1123 panels, #040a18 darker cards, white borders at 28%,
// #1f2235 resting tabs and #7b3aec (violet-600) accents.

/** Outer panel: a section of the page */
export const PANEL =
  "rounded-[1px] border border-white/28 bg-[#0a1123] shadow-[0_14px_34px_-8px_rgba(0,0,0,0.45)]";
/** Inner box inside a panel (forms, posts, cards) */
export const INSET = "rounded-[1px] border border-white/28 bg-[#040a18]";
/** Body text in the book serif */
export const TEXT_FONT = "[font-family:var(--font-profile-text),ui-serif,Georgia,serif]";
/** Section headings in the old-style serif */
export const HEADING_FONT = "[font-family:var(--font-profile-heading),ui-serif,Georgia,serif]";
/** Small violet outlined action ("VIEW ALL LISTINGS") */
export const OUTLINE_ACTION =
  "inline-flex cursor-pointer items-center rounded-[1px] border-2 border-violet-600 px-4 py-1.5 text-sm font-bold uppercase tracking-tight text-violet-600 transition-colors hover:bg-violet-600 hover:text-white";
/** Tab pill: #1f2235 with white text at rest, violet-600 when active or hovered */
export const TAB_PILL =
  "h-[26px] min-w-[64px] w-full flex-none cursor-pointer rounded-[1px] border-0 bg-[#1f2235] px-[13px] py-0 text-[12px] text-white shadow-none transition-colors hover:bg-violet-600 hover:text-white md:w-auto dark:text-white dark:hover:text-white data-[state=active]:bg-violet-600 data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-none dark:data-[state=active]:border-0 dark:data-[state=active]:bg-violet-600 dark:data-[state=active]:text-white";
/** Panel around the profile tabs */
export const TABS_PANEL =
  "rounded-[1px] border border-white/28 bg-[#0a1123] px-3 py-3 shadow-[0_14px_34px_-8px_rgba(0,0,0,0.45)] sm:px-[25px] sm:py-[17px]";
/** Darker bar inside the tabs panel that holds the tab pills */
export const TABS_BAR =
  "flex gap-2 rounded-[1px] border border-white/28 bg-[#0f172a] px-[12px] py-[9px] md:items-center md:gap-[15px]";
