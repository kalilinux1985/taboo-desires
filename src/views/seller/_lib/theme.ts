// Colours and type of the seller profile design (dark navy panels, violet accents).

/** Outer panel: a section of the page */
export const PANEL =
  "rounded-sm border border-white/[0.06] bg-slate-800 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]";
/** Inner box inside a panel (forms, posts, cards) */
export const INSET = "rounded-sm border border-white/[0.06] bg-[#050b1b]";
/** Body text in the book serif */
export const TEXT_FONT = "[font-family:var(--font-profile-text),ui-serif,Georgia,serif]";
/** Section headings in the old-style serif */
export const HEADING_FONT = "[font-family:var(--font-profile-heading),ui-serif,Georgia,serif]";
/** Small violet outlined action ("VIEW ALL LISTINGS") */
export const OUTLINE_ACTION =
  "inline-flex cursor-pointer items-center rounded-sm border-2 border-violet-600 px-4 py-1.5 text-sm font-bold uppercase tracking-tight text-violet-600 transition-colors hover:bg-violet-600 hover:text-white";
/** Tab pill: slate-900 at rest, violet-600 when active or hovered */
export const TAB_PILL =
  "h-[26px] min-w-[70px] w-full flex-none cursor-pointer rounded-[3px] border-0 bg-slate-900 px-[12px] py-0 text-[11.5px] text-[#6b7180] shadow-none transition-colors hover:bg-violet-600 hover:text-white md:w-auto dark:text-[#6b7180] dark:hover:text-white data-[state=active]:bg-violet-600 data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-none dark:data-[state=active]:border-0 dark:data-[state=active]:bg-violet-600 dark:data-[state=active]:text-white";
/** Panel around the profile tabs (the lower, lighter layer) */
export const TABS_PANEL =
  "rounded-[3px] border border-white/[0.05] bg-slate-800 px-3 py-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] sm:px-[25px] sm:py-[17px]";
/** Darker inset bar that holds the tab pills */
export const TABS_BAR =
  "flex gap-2 rounded-[3px] border border-white/[0.05] bg-slate-950/50 px-[12px] py-[10px] shadow-[0_6px_12px_-4px_rgba(0,0,0,0.45)] md:items-center md:gap-[15px]";
