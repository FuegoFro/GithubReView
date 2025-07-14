import { useState, useEffect } from 'react';
import { graphqlQuery, viewerUsername } from '../graphql_helpers';
import type { PrOverviewCategoryI, ExtendedPrOverviewI, PrReviewStateChangeI } from '../types';
import { PrReviewState } from '../types';
import PrOverview from './PrOverview';
import TokenSetup from './TokenSetup';

function parsePrOverviewNodes(response: any): ExtendedPrOverviewI[] {
  return response.nodes.map(parsePrOverview);
}

function parsePrOverview(response: any): ExtendedPrOverviewI {
  const num = response.number;
  const repoOwner = response.repository.owner.login;
  const repoName = response.repository.name;
  const authorName = response.author ? response.author.login : '<unknown>';
  const reviewStateEvents = parseReviewStateEvents(response.timelineItems.nodes);

  return {
    id: response.id,
    title: response.title,
    prNumber: num,
    repoOwner,
    repoName,
    authorName,
    reviewStateEvents,
  };
}

function parseReviewStateEvents(timelineNodes: any[]): PrReviewStateChangeI[] {
  const events = [];
  for (const node of timelineNodes) {
    if (node.__typename === 'PullRequestReview') {
      events.push({
        reviewerName: node.author.login,
        state: node.state,
        createdAt: new Date(node.createdAt),
      });
    } else if (node.__typename === 'ReviewRequestedEvent') {
      events.push({
        reviewerName: node.requestedReviewer.login,
        state: PrReviewState.REVIEW_REQUESTED,
        createdAt: new Date(node.createdAt),
      });
    } else if (node.__typename === 'ReviewRequestRemovedEvent') {
      events.push({
        reviewerName: node.requestedReviewer.login,
        state: PrReviewState.REVIEW_REMOVED,
        createdAt: new Date(node.createdAt),
      });
    }
  }
  return events;
}

function getReviewStates(prOverview: ExtendedPrOverviewI): { [key: string]: PrReviewState } {
  const states: { [key: string]: PrReviewState } = {};
  for (const reviewEvent of prOverview.reviewStateEvents) {
    if (reviewEvent.state !== PrReviewState.COMMENTED) {
      states[reviewEvent.reviewerName] = reviewEvent.state;
    }
  }
  return states;
}

function getHasCommented(prOverview: ExtendedPrOverviewI): { [key: string]: boolean } {
  const hasCommented: { [key: string]: boolean } = {};
  for (const reviewEvent of prOverview.reviewStateEvents) {
    if (reviewEvent.state === PrReviewState.COMMENTED) {
      hasCommented[reviewEvent.reviewerName] = true;
    }
  }
  return hasCommented;
}

export default function PrOverviewList() {
  const [overviewCategories, setOverviewCategories] = useState<PrOverviewCategoryI[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repoOwnerFilter, setRepoOwnerFilter] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('repoOwnerFilter') || '';
  });

  useEffect(() => {
    let intervalId: number;

    const fetchDataLoop = async () => {
      await fetchData();
      intervalId = setTimeout(fetchDataLoop, 60000);
    };

    fetchDataLoop();

    return () => {
      if (intervalId) {
        clearTimeout(intervalId);
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const username = await viewerUsername();
      
      // Use current repoOwnerFilter state
      const repoOwnerExtraSearchTerm = repoOwnerFilter ? ` user:${repoOwnerFilter}` : '';
    const searchPrefix = 'is:open is:pr archived:false' + repoOwnerExtraSearchTerm;
    const vars = {
      authoredAllSearch: `${searchPrefix} author:${username}`,
      reviewRequestedSearch: `${searchPrefix} draft:false review-requested:${username}`,
      reviewedBySearch: `${searchPrefix} draft:false reviewed-by:${username}`,
    };

    const data = await graphqlQuery(
      `
        query(
          $authoredAllSearch: String!,
          $reviewRequestedSearch: String!,
          $reviewedBySearch: String!,
        ) {
          authoredAll: search(query: $authoredAllSearch type:ISSUE first:100) { ... prDetails }
          reviewRequested: search(query: $reviewRequestedSearch type:ISSUE first:100) { ... prDetails }
          reviewedBy: search(query: $reviewedBySearch type:ISSUE first:100) { ... prDetails }
        }
        fragment prDetails on SearchResultItemConnection {
          nodes {
            ... on PullRequest {
              id
              number
              title
              author {
                login
              }
              repository {
               owner {
                  login
                }
                name
              }
              timelineItems(first: 100) {
                nodes {
                  __typename
                  ... on PullRequestReview {
                    author {
                      login
                    }
                    state
                    createdAt
                  }
                  ... on ReviewRequestedEvent {
                    createdAt
                    requestedReviewer {
                      ... on User {
                        login
                      }
                    }
                  }
                  ... on ReviewRequestRemovedEvent {
                    createdAt
                    requestedReviewer {
                      ... on User {
                        login
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      vars,
    );

    const prOverviewsWithDups = parsePrOverviewNodes(data.authoredAll)
      .concat(parsePrOverviewNodes(data.reviewRequested))
      .concat(parsePrOverviewNodes(data.reviewedBy));

    const collectById = (prOverviews: ExtendedPrOverviewI[]): { [key: string]: ExtendedPrOverviewI } => {
      const collected: { [key: string]: ExtendedPrOverviewI } = {};
      for (const prOverview of prOverviews) {
        if (collected[prOverview.id] === undefined) {
          collected[prOverview.id] = prOverview;
        }
      }
      return collected;
    };

    const authoredActionable = [];
    const authoredWaiting = [];
    const reviewedBy = [];
    const reviewRequestedDirect = [];
    const reviewRequestedTeam = [];

    for (const prOverview of Object.values(collectById(prOverviewsWithDups))) {
      const reviewStates = getReviewStates(prOverview);
      const hasCommented = getHasCommented(prOverview);
      if (prOverview.authorName === username) {
        delete reviewStates[username];
        if (
          Object.getOwnPropertyNames(reviewStates).length > 0 &&
          Object.values(reviewStates).some(
            (state) => state === PrReviewState.CHANGES_REQUESTED || state === PrReviewState.APPROVED,
          )
        ) {
          authoredActionable.push(prOverview);
        } else {
          authoredWaiting.push(prOverview);
        }
      } else {
        if (reviewStates[username] === PrReviewState.REVIEW_REQUESTED) {
          reviewRequestedDirect.push(prOverview);
        } else if (reviewStates[username] === undefined && !hasCommented[username]) {
          reviewRequestedTeam.push(prOverview);
        } else {
          reviewedBy.push(prOverview);
        }
      }
    }

    setOverviewCategories([
      { title: 'Blocking others (direct)', overviews: reviewRequestedDirect },
      { title: 'Blocking others (team)', overviews: reviewRequestedTeam },
      { title: 'Actionable', overviews: authoredActionable },
      { title: 'Waiting on reviewers', overviews: authoredWaiting },
      { title: 'Waiting on author', overviews: reviewedBy },
    ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setOverviewCategories([]);
    }
  };

  const handleTokenSubmit = async (token: string) => {
    localStorage.setItem('token', token);
    localStorage.removeItem('viewerUsername'); // Clear cached username
    
    try {
      await fetchData();
    } catch (err) {
      // Token was invalid, remove it
      localStorage.removeItem('token');
      throw new Error('Invalid token. Please check your token and try again.');
    }
  };

  if (error) {
    return <TokenSetup onTokenSubmit={handleTokenSubmit} error={error} />;
  }

  if (overviewCategories === null) {
    return (
      <div>
        <p><i>Loading...</i></p>
      </div>
    );
  }

  const updateRepoOwnerFilter = (newFilter: string) => {
    setRepoOwnerFilter(newFilter);
    
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (newFilter) {
      url.searchParams.set('repoOwnerFilter', newFilter);
    } else {
      url.searchParams.delete('repoOwnerFilter');
    }
    window.history.replaceState({}, '', url.toString());
    
    // Refetch data with new filter
    setOverviewCategories(null); // Show loading state
    fetchData();
  };

  return (
    <div>
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <label htmlFor="repoOwnerFilter" style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
          Filter by Repository Owner:
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            id="repoOwnerFilter"
            type="text"
            value={repoOwnerFilter}
            onChange={(e) => setRepoOwnerFilter(e.target.value)}
            placeholder="e.g., microsoft, google, facebook (leave empty for all)"
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '13px',
              border: '1px solid #ccc',
              borderRadius: '3px'
            }}
          />
          <button
            onClick={() => updateRepoOwnerFilter(repoOwnerFilter)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Apply Filter
          </button>
          {repoOwnerFilter && (
            <button
              onClick={() => updateRepoOwnerFilter('')}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>
        {repoOwnerFilter && (
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666' }}>
            Showing PRs from repositories owned by: <strong>{repoOwnerFilter}</strong>
          </p>
        )}
      </div>
      
      {overviewCategories.map((overviewCategory) => (
        <div key={overviewCategory.title}>
          <h2 style={{ fontSize: '18px', margin: '15px 0 8px 0', fontWeight: '600' }}>{overviewCategory.title}</h2>
          {overviewCategory.overviews.map((overview) => (
            <PrOverview key={overview.id} prOverview={overview} />
          ))}
        </div>
      ))}
    </div>
  );
}