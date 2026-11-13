// Seller profile design (Sellers_Profile_2): #0f172a page; cards are #030917 at
// 50% (a card inside a card reads darker); 1px white borders at 25%; violet
// #7f22fe; drop shadows black at 30%; inner shadows black at 28%.

const SHADOW = "shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)]";

/** Lighter, outer card: a section of the page */
export const PANEL = `rounded-[1px] border border-white/25 bg-[#030917]/50 ${SHADOW}`;
/** Darker card inside a card (listing cards, posts, the header box) */
export const INSET = `rounded-[1px] border border-white/25 bg-[#030917]/50 ${SHADOW}`;
/** Body text in the book serif */
export const TEXT_FONT = "[font-family:var(--font-profile-text),ui-serif,Georgia,serif]";
/** Old-style serif ("Latest Activity") */
export const HEADING_FONT = "[font-family:var(--font-profile-heading),ui-serif,Georgia,serif]";
/** Capital serif of the name and the Message Seller button */
export const DISPLAY_FONT = "[font-family:var(--font-profile-display),ui-serif,Georgia,serif]";
/** Small violet outlined action */
export const OUTLINE_ACTION =
  "inline-flex cursor-pointer items-center rounded-[1px] border border-violet-600 px-4 py-1.5 text-sm font-bold uppercase tracking-tight text-violet-600 transition-colors hover:bg-violet-600 hover:text-white";
