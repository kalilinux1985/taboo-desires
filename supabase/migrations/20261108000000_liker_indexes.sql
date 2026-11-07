-- Recent likers of a post or comment, newest first (feed avatars and "More+")
create index if not exists post_likes_post_recent_idx
  on public.post_likes (post_id, created_at desc, id desc);
create index if not exists post_comment_likes_comment_recent_idx
  on public.post_comment_likes (comment_id, created_at desc, id desc);
