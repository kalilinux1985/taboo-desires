// Fonts of the seller profile design: an old-style serif for headings and a
// book serif for text. Applied by the profile routes as CSS variables.
import { IM_Fell_English, Libre_Baskerville } from "next/font/google";

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

export const profileFontVars = `${heading.variable} ${text.variable}`;
