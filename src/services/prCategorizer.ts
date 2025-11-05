import type { PullRequest } from '../generated/schema';
import { getReviewStates, getHasCommented } from '../utils/timelineParser';

export interface PrCategory {
  title: string;
  overviews: PullRequest[];
}

/**
 * Removes duplicates from an array of PRs, keeping only the first occurrence of each unique ID.
 */
function deduplicatePullRequests(pullRequests: Array<PullRequest | null | undefined>): PullRequest[] {
  const seen = new Set<string>();
  const result: PullRequest[] = [];

  for (const pr of pullRequests) {
    if (pr && !seen.has(pr.id)) {
      seen.add(pr.id);
      result.push(pr);
    }
  }

  return result;
}

/**
 * Categorizes pull requests into different buckets based on the viewer's relationship to them.
 *
 * Categories:
 * - Blocking others (direct): PRs where you've been directly requested to review
 * - Blocking others (team): PRs where your review is needed (via team) but you haven't commented
 * - Actionable: PRs you authored that have received reviews requiring action
 * - Waiting on reviewers: PRs you authored that are awaiting reviews
 * - Waiting on author: PRs you've reviewed that are waiting on the author
 */
export function categorizePullRequests(
  pullRequests: Array<PullRequest | null | undefined>,
  viewerUsername: string
): PrCategory[] {
  const uniquePrs = deduplicatePullRequests(pullRequests);

  const authoredActionable: PullRequest[] = [];
  const authoredWaiting: PullRequest[] = [];
  const reviewedBy: PullRequest[] = [];
  const reviewRequestedDirect: PullRequest[] = [];
  const reviewRequestedTeam: PullRequest[] = [];

  for (const pr of uniquePrs) {
    const reviewStates = getReviewStates(pr);
    const hasCommented = getHasCommented(pr);

    const isAuthor = pr.author?.login === viewerUsername;

    if (isAuthor) {
      // Remove viewer's own review state if they're the author
      delete reviewStates[viewerUsername];

      // Check if there are any reviews that require action
      const hasActionableReviews = Object.values(reviewStates).some(
        (state) => state === 'CHANGES_REQUESTED' || state === 'APPROVED'
      );

      if (Object.keys(reviewStates).length > 0 && hasActionableReviews) {
        authoredActionable.push(pr);
      } else {
        authoredWaiting.push(pr);
      }
    } else {
      // Viewer is a reviewer
      const viewerReviewState = reviewStates[viewerUsername];
      const viewerHasCommented = hasCommented[viewerUsername];

      if (viewerReviewState === 'REVIEW_REQUESTED') {
        reviewRequestedDirect.push(pr);
      } else if (viewerReviewState === undefined && !viewerHasCommented) {
        reviewRequestedTeam.push(pr);
      } else {
        reviewedBy.push(pr);
      }
    }
  }

  return [
    { title: 'Blocking others (direct)', overviews: reviewRequestedDirect },
    { title: 'Blocking others (team)', overviews: reviewRequestedTeam },
    { title: 'Actionable', overviews: authoredActionable },
    { title: 'Waiting on reviewers', overviews: authoredWaiting },
    { title: 'Waiting on author', overviews: reviewedBy },
  ];
}
