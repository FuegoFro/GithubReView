import type { PullRequest, PullRequestReviewState } from '../generated/schema';

export type ReviewStatesMap = Record<string, PullRequestReviewState | 'REVIEW_REQUESTED' | 'REVIEW_REMOVED'>;
export type HasCommentedMap = Record<string, boolean>;

/**
 * Extracts review states for each reviewer from a PR's timeline events.
 * Returns a map of reviewer login -> their latest review state.
 */
export function getReviewStates(pullRequest: PullRequest): ReviewStatesMap {
  const states: ReviewStatesMap = {};

  if (!pullRequest.timelineItems?.nodes) {
    return states;
  }

  for (const node of pullRequest.timelineItems.nodes) {
    if (!node) continue;

    if (node.__typename === 'PullRequestReview') {
      if (node.author?.login && node.state && node.state !== 'COMMENTED') {
        states[node.author.login] = node.state;
      }
    } else if (node.__typename === 'ReviewRequestedEvent') {
      if (node.requestedReviewer && 'login' in node.requestedReviewer) {
        states[node.requestedReviewer.login] = 'REVIEW_REQUESTED';
      }
    } else if (node.__typename === 'ReviewRequestRemovedEvent') {
      if (node.requestedReviewer && 'login' in node.requestedReviewer) {
        states[node.requestedReviewer.login] = 'REVIEW_REMOVED';
      }
    }
  }

  return states;
}

/**
 * Checks which reviewers have left comments on a PR.
 * Returns a map of reviewer login -> boolean indicating if they've commented.
 */
export function getHasCommented(pullRequest: PullRequest): HasCommentedMap {
  const hasCommented: HasCommentedMap = {};

  if (!pullRequest.timelineItems?.nodes) {
    return hasCommented;
  }

  for (const node of pullRequest.timelineItems.nodes) {
    if (!node) continue;

    if (node.__typename === 'PullRequestReview') {
      if (node.author?.login && node.state === 'COMMENTED') {
        hasCommented[node.author.login] = true;
      }
    }
  }

  return hasCommented;
}
