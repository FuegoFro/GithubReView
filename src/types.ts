export interface PrOverviewI {
  id: string;
  title: string;
  prNumber: number;
  repoOwner: string;
  repoName: string;
}

export const PrReviewState = {
  REVIEW_REQUESTED: 'REVIEW_REQUESTED',
  PENDING: 'PENDING',
  COMMENTED: 'COMMENTED',
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  DISMISSED: 'DISMISSED',
  REVIEW_REMOVED: 'REVIEW_REMOVED',
} as const;

export type PrReviewState = typeof PrReviewState[keyof typeof PrReviewState];

export interface PrOverviewCategoryI {
  title: string;
  overviews: PrOverviewI[];
}

export interface PrReviewStateChangeI {
  reviewerName: string;
  state: PrReviewState;
  createdAt: Date;
}

export interface ExtendedPrOverviewI extends PrOverviewI {
  authorName: string;
  reviewStateEvents: PrReviewStateChangeI[];
}