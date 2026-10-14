// Public demo accounts for reviewers. Intentionally not secret: the login page signs in with
// these (creating the account on first use), and `npm run seed` can pre-create them with sample docs.
export const DEMO_PASSWORD = 'ajaia-demo-2026'

export const DEMO_ACCOUNTS = [
  { name: 'Alice', email: 'alice@example.com', hint: 'Demo document owner' },
  { name: 'Bob', email: 'bob@example.com', hint: 'Demo collaborator' },
] as const
