/** Vercel has no writable SQLite file; user data goes through Supabase. */
export function useSupabaseApp() {
  return process.env.VERCEL === "1";
}
