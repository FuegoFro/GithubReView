import { useCallback, useEffect, useState } from 'react';
import type { PullRequest } from '../generated/schema';
import { getPullRequestData, viewerUsername } from '../graphql_helpers';
import { POLLING_INTERVAL_MS } from '../constants';

export interface UsePrDataResult {
  pullRequests: Array<PullRequest | null | undefined> | null;
  username: string | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and poll PR data from GitHub.
 *
 * @param repoOwnerFilter - Optional filter to limit PRs to a specific repository owner
 * @returns Object containing PRs, username, error state, and refetch function
 */
export function usePrData(repoOwnerFilter: string = ''): UsePrDataResult {
  const [pullRequests, setPullRequests] = useState<Array<PullRequest | null | undefined> | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const fetchedUsername = await viewerUsername();
      setUsername(fetchedUsername);

      const repoOwnerExtraSearchTerm = repoOwnerFilter ? ` user:${repoOwnerFilter}` : '';
      const searchPrefix = 'is:open is:pr archived:false' + repoOwnerExtraSearchTerm;

      const searchQueries = {
        authoredAllSearch: `${searchPrefix} author:${fetchedUsername}`,
        reviewRequestedSearch: `${searchPrefix} draft:false review-requested:${fetchedUsername}`,
        reviewedBySearch: `${searchPrefix} draft:false reviewed-by:${fetchedUsername}`,
      };

      const data = await getPullRequestData(
        searchQueries.authoredAllSearch,
        searchQueries.reviewRequestedSearch,
        searchQueries.reviewedBySearch,
      );

      const allPrs = [
        ...(data.authoredAll.nodes ?? []),
        ...(data.reviewRequested.nodes ?? []),
        ...(data.reviewedBy.nodes ?? []),
      ].filter((pr): pr is PullRequest => pr?.__typename === 'PullRequest');

      setPullRequests(allPrs);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setPullRequests([]);
      setIsLoading(false);
    }
  }, [repoOwnerFilter]);

  useEffect(() => {
    let timeoutId: number;

    const fetchDataLoop = async () => {
      await fetchData();
      timeoutId = setTimeout(fetchDataLoop, POLLING_INTERVAL_MS);
    };

    fetchDataLoop();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchData]);

  return {
    pullRequests,
    username,
    error,
    isLoading,
    refetch: fetchData,
  };
}
