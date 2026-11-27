import type { MetadataRoute } from "next";

/** Lets members add the site to their home screen; iPhones need this for push notifications. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taboo Desires",
    short_name: "Taboo Desires",
    description: "An 18+ marketplace to buy and sell worn intimates.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0C0F15",
    theme_color: "#0C0F15",
    icons: [{ src: "/logo.png", sizes: "256x256", type: "image/png", purpose: "any" }],
  };
}
