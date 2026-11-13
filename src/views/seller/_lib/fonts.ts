// Fonts of the seller profile design: an old-style serif for "Latest Activity",
// a book serif for text, and a capital serif for the name and Message Seller.
// Applied by the profile routes as CSS variables.
import { Cinzel, IM_Fell_English, Libre_Baskerville } from "next/font/google";

const heading = IM_Fell_English({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-profile-heading",
});
const text = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-profile-text",
});
const display = Cinzel({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-profile-display",
});

export const profileFontVars = `${heading.variable} ${text.variable} ${display.variable}`;
