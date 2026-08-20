// Every mutating server action returns this same shape (never a union of
// distinct object types) so callers can do `if (result.error)` without
// TypeScript narrowing headaches on the other branch's fields.
export type ActionResult<T extends object = Record<never, never>> = { error?: string } & Partial<T>;
