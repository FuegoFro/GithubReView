import { createClient } from './generated';
import { GITHUB_API_URL, LOCAL_STORAGE_KEYS, SEARCH_RESULTS_LIMIT, TIMELINE_FETCH_LIMIT } from './constants';

function getClient() {
  const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
  if (!token) {
    throw new Error('GitHub token is missing. Please authenticate to continue.');
  }

  return createClient({
    url: GITHUB_API_URL,
    headers: {
      Authorization: `bearer ${token}`,
    },
  });
}

/**
 * Gets the authenticated user's GitHub username.
 * Caches the result in localStorage to avoid redundant API calls.
 */
export async function viewerUsername(): Promise<string> {
  const cachedUsername = localStorage.getItem(LOCAL_STORAGE_KEYS.VIEWER_USERNAME);
  if (cachedUsername) {
    return cachedUsername;
  }

  const client = getClient();
  const queryResult = await client.query({
    viewer: {
      login: true,
    },
  });

  localStorage.setItem(LOCAL_STORAGE_KEYS.VIEWER_USERNAME, queryResult.viewer.login);
  return queryResult.viewer.login;
}

/**
 * GraphQL query fragment for fetching detailed PR information.
 * Includes timeline events for tracking review states.
 */
const prDetailsFragment = {
  nodes: {
    __typename: true,
    on_PullRequest: {
      id: true,
      number: true,
      title: true,
      author: {
        login: true,
      },
      repository: {
        owner: {
          login: true,
        },
        name: true,
      },
      timelineItems: {
        __args: {
          first: TIMELINE_FETCH_LIMIT,
        },
        nodes: {
          __typename: true,
          on_PullRequestReview: {
            author: {
              login: true,
            },
            state: true,
            createdAt: true,
          },
          on_ReviewRequestedEvent: {
            createdAt: true,
            requestedReviewer: {
              on_User: {
                login: true,
              },
            },
          },
          on_ReviewRequestRemovedEvent: {
            createdAt: true,
            requestedReviewer: {
              on_User: {
                login: true,
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Fetches pull request data from GitHub based on multiple search queries.
 * Executes all queries in parallel for optimal performance.
 *
 * @param authoredAllSearch - Search query for PRs authored by the user
 * @param reviewRequestedSearch - Search query for PRs where user's review is requested
 * @param reviewedBySearch - Search query for PRs reviewed by the user
 * @returns Object containing search results for each category
 */
export async function getPullRequestData(
  authoredAllSearch: string,
  reviewRequestedSearch: string,
  reviewedBySearch: string,
) {
  const client = getClient();

  const [authoredAll, reviewRequested, reviewedBy] = await Promise.all([
    client.query({
      search: {
        __args: {
          query: authoredAllSearch,
          type: 'ISSUE',
          first: SEARCH_RESULTS_LIMIT,
        },
        ...prDetailsFragment,
      },
    }),
    client.query({
      search: {
        __args: {
          query: reviewRequestedSearch,
          type: 'ISSUE',
          first: SEARCH_RESULTS_LIMIT,
        },
        ...prDetailsFragment,
      },
    }),
    client.query({
      search: {
        __args: {
          query: reviewedBySearch,
          type: 'ISSUE',
          first: SEARCH_RESULTS_LIMIT,
        },
        ...prDetailsFragment,
      },
    }),
  ]);

  return {
    authoredAll: authoredAll.search,
    reviewRequested: reviewRequested.search,
    reviewedBy: reviewedBy.search,
  };
}