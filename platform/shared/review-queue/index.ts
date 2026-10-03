// ============================================================
// Insurance / Healthcare Platform — Generic Review Queue Utility
// ============================================================
// Provides framework-agnostic helpers consumed by both the
// API server and (where safe) the client.  All database
// interaction uses string-building; actual query execution is
// left to the calling service so this module has zero runtime
// dependencies on a specific DB client.
// ============================================================

import type { ReviewDecision, ReviewStatus } from '../types/index.js';

// ----------------------------------------------------------
// Re-exports so callers only need to import from one place
// ----------------------------------------------------------
export type { ReviewDecision, ReviewStatus };

// ----------------------------------------------------------
// Review Queue Filter Types
// ----------------------------------------------------------

/**
 * Subset of filter criteria that can be applied to any review-queue
 * query.  All fields are optional; omitting a field means "no filter
 * on that dimension".
 */
export interface ReviewQueueFilters {
  /** Narrow to a specific review status. */
  status?: ReviewStatus;
  /** Return only items assigned to (or submitted by) this reviewer profile id. */
  reviewer_id?: string;
  /** Return only items submitted by this profile id. */
  submitted_by?: string;
  /** Return only items created on or after this ISO-8601 datetime. */
  created_after?: string;
  /** Return only items created on or before this ISO-8601 datetime. */
  created_before?: string;
  /**
   * Maximum rows to return.  Defaults to 50; capped at 200 on the
   * server side to prevent runaway queries.
   */
  limit?: number;
  /** Zero-based page offset (used alongside `limit`). */
  page?: number;
}

// ----------------------------------------------------------
// Review Queue Item Wrapper
// ----------------------------------------------------------

/**
 * A typed wrapper that enriches any reviewable entity with the
 * common review-lifecycle fields.  `T` is the underlying entity
 * (e.g. `FamilyMember`, `HospitalBranchApplication`, `Claim`).
 */
export interface ReviewQueueItem<T> {
  /** The underlying domain entity. */
  entity: T;
  /** Current review status extracted from the entity for quick access. */
  status: ReviewStatus;
  /** Profile id of the assigned reviewer, if any. */
  reviewer_id: string | null;
  /** Human-readable reason recorded by the reviewer. */
  decision_reason: string | null;
  /** ISO-8601 datetime when the review decision was recorded. */
  reviewed_at: string | null;
  /** ISO-8601 datetime when this item entered the queue. */
  queued_at: string;
  /** Stable name of the DB table this item originates from. */
  source_table: string;
}

// ----------------------------------------------------------
// Built Query Descriptor
// ----------------------------------------------------------

/**
 * The result of `buildReviewQueueQuery`.  Callers receive a structured
 * descriptor instead of a raw SQL string so they can apply it against
 * any PostgREST / Supabase client or raw `pg` pool.
 *
 * Usage with the Supabase JS client:
 * ```ts
 * const desc = buildReviewQueueQuery('family_members', filters);
 * let q = supabase.from(desc.table).select(desc.select);
 * for (const [col, op, val] of desc.filters) {
 *   q = q.filter(col, op, val);
 * }
 * const { data, error } = await q.range(desc.rangeFrom, desc.rangeTo);
 * ```
 */
export interface ReviewQueueQueryDescriptor {
  /** Target table name (already validated against the allow-list). */
  table: string;
  /** PostgREST select expression — always '*' for review queues. */
  select: string;
  /**
   * Ordered list of filter tuples to be applied with `.filter()`.
   * Each tuple is `[column, postgrest-operator, value]`.
   */
  filters: Array<[string, string, string]>;
  /** Inclusive start index for `.range()` pagination. */
  rangeFrom: number;
  /** Inclusive end index for `.range()` pagination. */
  rangeTo: number;
  /** Human-readable label for logging / tracing. */
  description: string;
}

// ----------------------------------------------------------
// Allow-listed Reviewable Tables
// ----------------------------------------------------------

/**
 * Tables that expose a standard review-queue shape.
 * Only these table names are accepted by `buildReviewQueueQuery`
 * to prevent accidental exposure of arbitrary tables.
 */
const REVIEWABLE_TABLES = new Set([
  'family_members',
  'hospital_branch_applications',
  'claims',
] as const);

export type ReviewableTable = 'family_members' | 'hospital_branch_applications' | 'claims';

// ----------------------------------------------------------
// Core Builder
// ----------------------------------------------------------

/**
 * Builds a structured query descriptor for the given reviewable table and
 * filter set.  Does **not** execute the query.
 *
 * @param table   - One of the allow-listed reviewable table names.
 * @param filters - Optional filter criteria.  Missing fields are ignored.
 * @returns       A `ReviewQueueQueryDescriptor` ready for execution.
 *
 * @throws {Error} If `table` is not in the allow-list.
 * @throws {Error} If `filters.limit` exceeds the server-side cap of 200.
 */
export function buildReviewQueueQuery(
  table: string,
  filters: ReviewQueueFilters = {},
): ReviewQueueQueryDescriptor {
  if (!REVIEWABLE_TABLES.has(table as ReviewableTable)) {
    throw new Error(
      `buildReviewQueueQuery: "${table}" is not a reviewable table. ` +
        `Allowed tables: ${[...REVIEWABLE_TABLES].join(', ')}`,
    );
  }

  const LIMIT_CAP = 200;
  const DEFAULT_LIMIT = 50;

  const rawLimit = filters.limit ?? DEFAULT_LIMIT;
  if (rawLimit > LIMIT_CAP) {
    throw new Error(
      `buildReviewQueueQuery: requested limit ${rawLimit} exceeds the cap of ${LIMIT_CAP}.`,
    );
  }

  const limit = rawLimit;
  const page = Math.max(0, filters.page ?? 0);
  const rangeFrom = page * limit;
  const rangeTo = rangeFrom + limit - 1;

  const postgrestFilters: Array<[string, string, string]> = [];

  if (filters.status !== undefined) {
    postgrestFilters.push(['status', 'eq', filters.status]);
  }

  if (filters.reviewer_id !== undefined) {
    postgrestFilters.push(['reviewer_id', 'eq', filters.reviewer_id]);
  }

  if (filters.submitted_by !== undefined) {
    // Different tables use different column names for the submitter.
    const submitterColumn =
      table === 'hospital_branch_applications' ? 'submitted_by' : 'profile_id';
    postgrestFilters.push([submitterColumn, 'eq', filters.submitted_by]);
  }

  if (filters.created_after !== undefined) {
    postgrestFilters.push(['created_at', 'gte', filters.created_after]);
  }

  if (filters.created_before !== undefined) {
    postgrestFilters.push(['created_at', 'lte', filters.created_before]);
  }

  const filterSummary =
    postgrestFilters.length === 0
      ? 'no additional filters'
      : postgrestFilters.map(([c, o, v]) => `${c} ${o} ${v}`).join(', ');

  return {
    table,
    select: '*',
    filters: postgrestFilters,
    rangeFrom,
    rangeTo,
    description: `Review queue for "${table}" — ${filterSummary} — page ${page} (rows ${rangeFrom}–${rangeTo})`,
  };
}

// ----------------------------------------------------------
// Review Decision Validation
// ----------------------------------------------------------

/**
 * Validation error detail for a single field.
 */
export interface ReviewDecisionValidationError {
  field: string;
  message: string;
}

/**
 * Result returned by `validateReviewDecision`.
 */
export interface ReviewDecisionValidationResult {
  valid: boolean;
  errors: ReviewDecisionValidationError[];
}

/**
 * Validates a `ReviewDecision` payload before it is persisted.
 *
 * Rules:
 * - `status` must be present and equal to `'approved'` or `'rejected'`.
 * - `decision_reason` is **required** when `status` is `'rejected'`.
 * - `decision_reason`, when provided, must be a non-empty string with
 *   at most 2 000 characters.
 *
 * @param decision - The raw review decision payload.
 * @returns A result object indicating validity and any errors.
 */
export function validateReviewDecision(
  decision: ReviewDecision,
): ReviewDecisionValidationResult {
  const errors: ReviewDecisionValidationError[] = [];

  // --- status validation ---
  if (!decision.status) {
    errors.push({ field: 'status', message: '"status" is required.' });
  } else if (decision.status !== 'approved' && decision.status !== 'rejected') {
    errors.push({
      field: 'status',
      message: `"status" must be "approved" or "rejected"; received "${decision.status}".`,
    });
  }

  // --- decision_reason validation ---
  if (decision.status === 'rejected' && !decision.decision_reason) {
    errors.push({
      field: 'decision_reason',
      message: '"decision_reason" is required when status is "rejected".',
    });
  }

  if (decision.decision_reason !== undefined && decision.decision_reason !== null) {
    if (typeof decision.decision_reason !== 'string') {
      errors.push({
        field: 'decision_reason',
        message: '"decision_reason" must be a string.',
      });
    } else if (decision.decision_reason.trim().length === 0) {
      errors.push({
        field: 'decision_reason',
        message: '"decision_reason" must not be blank.',
      });
    } else if (decision.decision_reason.length > 2_000) {
      errors.push({
        field: 'decision_reason',
        message: `"decision_reason" must be 2 000 characters or fewer (got ${decision.decision_reason.length}).`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ----------------------------------------------------------
// Helper: wrap a raw entity in a ReviewQueueItem
// ----------------------------------------------------------

/**
 * Wraps a raw database row (any reviewable entity) into a typed
 * `ReviewQueueItem<T>`.  The raw row is expected to have at minimum the
 * fields `status`, `reviewer_id`, `decision_reason`, `reviewed_at`, and
 * `created_at`.
 *
 * @param entity      - The raw entity row from the database.
 * @param sourceTable - The table name the entity was fetched from.
 * @returns           A fully typed `ReviewQueueItem<T>`.
 */
export function wrapReviewQueueItem<T extends Record<string, unknown>>(
  entity: T,
  sourceTable: ReviewableTable,
): ReviewQueueItem<T> {
  return {
    entity,
    status: (entity['status'] as ReviewStatus) ?? 'pending',
    reviewer_id: (entity['reviewer_id'] as string | null) ?? null,
    decision_reason: (entity['decision_reason'] as string | null) ?? null,
    reviewed_at: (entity['reviewed_at'] as string | null) ?? null,
    queued_at: (entity['created_at'] as string) ?? new Date().toISOString(),
    source_table: sourceTable,
  };
}

// ----------------------------------------------------------
// Helper: apply a ReviewDecision to an entity patch object
// ----------------------------------------------------------

/**
 * Produces the partial update payload to persist a review decision.
 * Apply this patch to the relevant table row using the service-role client.
 *
 * @param reviewerProfileId - The profile `id` of the acting reviewer.
 * @param decision          - The validated review decision.
 * @returns                 A plain object suitable for a DB `UPDATE` call.
 */
export function buildDecisionPatch(
  reviewerProfileId: string,
  decision: ReviewDecision,
): {
  status: 'approved' | 'rejected';
  reviewer_id: string;
  decision_reason: string | null;
  reviewed_at: string;
} {
  return {
    status: decision.status,
    reviewer_id: reviewerProfileId,
    decision_reason: decision.decision_reason ?? null,
    reviewed_at: new Date().toISOString(),
  };
}
