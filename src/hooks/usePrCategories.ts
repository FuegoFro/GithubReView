import { useMemo } from 'react';
import type { PullRequest } from '../generated/schema';
import { categorizePullRequests, type PrCategory } from '../services/prCategorizer';

/**
 * Custom hook to categorize pull requests based on viewer's relationship to them.
 *
 * @param pullRequests - Array of pull requests to categorize
 * @param username - Username of the current viewer
 * @returns Array of categorized PR groups
 */
export function usePrCategories(
  pullRequests: Array<PullRequest | null | undefined> | null,
  username: string | null
): PrCategory[] | null {
  return useMemo(() => {
    if (!pullRequests || !username) {
      return null;
    }
    return categorizePullRequests(pullRequests, username);
  }, [pullRequests, username]);
}
