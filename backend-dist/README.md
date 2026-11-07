`api.cjs` is the built backend (from `supabase/functions/api`). Don't edit it by
hand: the "Build backend" GitHub Action rebuilds it on every push to main. The
live Supabase Edge Function (`supabase/functions/loader`) downloads it from
GitHub and runs it.
