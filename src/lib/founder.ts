// Founder gate — restricts founder-only surfaces (War Room) to specific
// account email(s). This is a CLIENT gate for the UI; sensitive data (metrics)
// is additionally gated server-side in the RPC. Never put passwords here.
export const FOUNDER_EMAILS = ['kavazovic.ahmed@gmail.com'];

export const isFounder = (user: { email?: string | null } | null | undefined): boolean =>
  !!user?.email && FOUNDER_EMAILS.includes(user.email.trim().toLowerCase());
