/**
 * Represents the possible states of a message's preview zone.
 * This identifies whether the generated content is still pending,
 * has been validated by the user, or has been cancelled.
 */
export enum PreviewState {
  /** The generated content is waiting for user action. */
  PENDING = 'PENDING',
  /** The user has validated/accepted the generated content. */
  VALIDATED = 'VALIDATED',
  /** The user has cancelled or rejected the generated content. */
  CANCELLED = 'CANCELLED'
}
