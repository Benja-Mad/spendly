import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

let cachedBrowser: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseBrowser = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  if (!cachedBrowser) {
    cachedBrowser = createBrowserClient(supabaseUrl, supabaseKey, {
      isSingleton: true,
    });
  }
  return cachedBrowser;
};
