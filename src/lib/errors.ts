/** An error whose message is already safe and friendly to show to the user. */
export class UserFacingError extends Error {}

type ErrorLike = { message?: unknown; code?: unknown; name?: unknown }

const GENERIC = 'Something went wrong. Please try again.'

/**
 * Turns Supabase/PostgREST/network errors into a message suitable for the UI.
 * Our own SQL functions raise friendly messages with specific SQLSTATE codes; those are passed through.
 */
export function errorMessage(error: unknown, fallback = GENERIC): string {
  if (error instanceof UserFacingError) return error.message
  if (!error || typeof error !== 'object') return fallback

  const { message, code, name } = error as ErrorLike
  const msg = typeof message === 'string' ? message : ''

  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return "Can't reach the server. Check your connection and try again."
  }

  // Supabase Auth errors (invalid credentials, weak password, ...) are already readable.
  if (typeof name === 'string' && name.startsWith('Auth') && msg) return msg

  switch (code) {
    case 'PGRST116':
      return "Document not found, or you don't have access to it."
    case '42501':
      // RLS violations carry a technical message; our RPC raises a friendly one.
      return /row-level security|permission denied/i.test(msg) || !msg
        ? "You don't have permission to do that."
        : msg
    case 'P0002': // no_data_found, raised by share_document
    case '22023': // invalid_parameter_value, raised by share_document
      return msg || fallback
    case '23514': // check_violation
      if (msg.includes('documents_title_length')) return 'Title must be between 1 and 200 characters.'
      if (msg.includes('documents_content_size')) return 'This document is too large to save (2 MB limit).'
      return 'That value is not allowed.'
    case '22P02': // invalid_text_representation, e.g. a malformed uuid in the URL
      return "Document not found, or you don't have access to it."
  }

  if (import.meta.env.DEV) console.error(error)
  return fallback
}
