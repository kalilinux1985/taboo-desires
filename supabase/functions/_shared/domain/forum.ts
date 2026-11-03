// Shared by backend and frontend (pure, no Convex imports)
export const FORUM_TOPICS = [
  {
    id: "seller_tips",
    label: "Seller tips",
    blurb: "Photos, pricing, shipping and safety",
  },
  {
    id: "buyer_talk",
    label: "Buyer talk",
    blurb: "Wishlists, recommendations, favorite shops",
  },
  { id: "introductions", label: "Introductions", blurb: "New here? Say hi" },
  { id: "off_topic", label: "Off-topic", blurb: "Anything else" },
] as const;

export type ForumTopic = (typeof FORUM_TOPICS)[number]["id"];

export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const POST_MAX = 5000;
export const REPLY_MAX = 2000;

export function topicLabel(id: ForumTopic): string {
  return FORUM_TOPICS.find((t) => t.id === id)?.label ?? id;
}
