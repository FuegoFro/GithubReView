<template>
  <div v-if="overviewCategories === null">
    <p><i>Loading...</i></p>
  </div>
  <div v-else>
    <template v-for="overviewCategory in overviewCategories">
      <h1>{{ overviewCategory.title }}</h1>
      <pr-overview
        v-for="overview in overviewCategory.overviews"
        :prOverview="overview"
        :key="overview.id"
      ></pr-overview>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { graphqlQuery, viewerUsername } from '@/graphql_helpers';
import PrOverview, { PrOverviewI } from '@/components/PrOverview.vue';

enum PrReviewState {
  REVIEW_REQUESTED = 'REVIEW_REQUESTED',
  PENDING = 'PENDING',
  COMMENTED = 'COMMENTED',
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  DISMISSED = 'DISMISSED',
  REVIEW_REMOVED = 'REVIEW_REMOVED',
}

interface PrOverviewCategoryI {
  title: string;
  overviews: PrOverviewI[];
}

interface PrReviewStateChangeI {
  reviewerName: string;
  state: PrReviewState;
  createdAt: Date;
}

interface ExtendedPrOverviewI extends PrOverviewI {
  authorName: string;
  reviewStateEvents: PrReviewStateChangeI[];
}

function parsePrOverviewNodes(response: any): ExtendedPrOverviewI[] {
  return response.nodes.map(parsePrOverview);
}

function parsePrOverview(response: any): ExtendedPrOverviewI {
  const num = response.number;
  const repoOwner = response.repository.owner.login;
  const repoName = response.repository.name;
  const authorName = response.author.login;
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

@Component({
  components: { PrOverview },
})
export default class PrOverviewList extends Vue {
  overviewCategories: PrOverviewCategoryI[] | null = null;

  async mounted() {
    // # Ideal categorization
    //
    // Authored:
    //  - Awaiting review (Waiting on others)
    //  - Changes requested (Can action)
    //  - Accepted (Can action)
    // Not authored:
    //  - Review requested (Blocking others)
    //  - Changes requested (Waiting on others)
    //  - Review requested after changes requested (Blocking others)
    //  - Accepted by you (Waiting on others)

    const username = await viewerUsername();
    const searchPrefix = 'is:open is:pr archived:false';
    const vars = {
      authoredAllSearch: `${searchPrefix} author:${username}`,
      reviewRequestedSearch: `${searchPrefix} review-requested:${username}`,
      reviewedBySearch: `${searchPrefix}  reviewed-by:${username}`,
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

    const repoOwnerFilter = this.$route.query.repoOwnerFilter;
    const prOverviewsWithDups = parsePrOverviewNodes(data.authoredAll)
      .concat(parsePrOverviewNodes(data.reviewRequested))
      .concat(parsePrOverviewNodes(data.reviewedBy))
      .filter((prOverview) => {
        return repoOwnerFilter == null || prOverview.repoOwner === repoOwnerFilter;
      });

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
    const reviewRequested = [];

    for (const prOverview of Object.values(collectById(prOverviewsWithDups))) {
      const reviewStates = getReviewStates(prOverview);
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
          reviewRequested.push(prOverview);
        } else {
          reviewedBy.push(prOverview);
        }
      }
    }

    this.overviewCategories = [
      { title: 'Blocking others', overviews: reviewRequested },
      { title: 'Actionable', overviews: Object.values(authoredActionable) },
      { title: 'Waiting on reviewers', overviews: authoredWaiting },
      { title: 'Waiting on author', overviews: reviewedBy },
    ];
  }
}
</script>

<style scoped></style>
