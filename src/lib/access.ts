// Who can see what on the hire desk.
// Performance analysis (income, utilisation): only these desk usernames, as Homer asked (Nov 2026).
// Checked on the server in /api/hire/staff/performance; the desk only hides the section for everyone else.
// When James adds roles to staff logins, this list can move to a role instead.
export const PERFORMANCE_USERS = ["homer.johnstone", "james.boyd.moss"];

export function canSeePerformance(username: string | null | undefined) {
  return Boolean(username) && PERFORMANCE_USERS.includes(String(username).trim().toLowerCase());
}
