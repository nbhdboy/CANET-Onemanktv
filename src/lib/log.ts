export function logApp(event: string, extra?: Record<string, unknown>) {
  console.info(
    "[kplus1]",
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      vercel: process.env.VERCEL === "1",
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ...extra,
    }),
  );
}

export function logAppError(event: string, extra?: Record<string, unknown>) {
  console.error(
    "[kplus1]",
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      vercel: process.env.VERCEL === "1",
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ...extra,
    }),
  );
}
