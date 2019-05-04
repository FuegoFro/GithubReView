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

interface PrOverviewCategoryI {
  title: string;
  overviews: PrOverviewI[];
}

function parsePrOverviewNodes(response: any): PrOverviewI[] {
  return response.nodes.map(parsePrOverview);
}

function parsePrOverview(response: any): PrOverviewI {
  const num = response.number;
  const repoOwner = response.repository.owner.login;
  const repoName = response.repository.name;

  return {
    id: response.id,
    title: response.title,
    prNumber: num,
    repoOwner,
    repoName,
  };
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
    //
    // # Actual categorization (semi-implementation of above)
    //
    // authored and review:changes_requested  -- Actionable!
    // authored and review:approved  -- Actionable!
    // authored (manually filter out above)
    //
    // review-requested  -- Important!
    // reviewed-by (manually filter out above)
    const username = await viewerUsername();
    const searchPrefix = 'is:open is:pr archived:false';
    const vars = {
      authoredAllSearch: `${searchPrefix} author:${username}`,
      authoredAcceptedSearch: `${searchPrefix} author:${username} review:approved`,
      authoredChangesRequestedSearch: `${searchPrefix} author:${username} review:changes_requested`,
      reviewRequestedSearch: `${searchPrefix} review-requested:${username}`,
      reviewedBySearch: `${searchPrefix}  reviewed-by:${username}`,
    };

    const data = await graphqlQuery(
      `
        query(
          $authoredAllSearch: String!,
          $authoredAcceptedSearch: String!,
          $authoredChangesRequestedSearch: String!,
          $reviewRequestedSearch: String!,
          $reviewedBySearch: String!,
        ) {
          authoredAll: search(query: $authoredAllSearch type:ISSUE first:100) { ... prDetails }
          authoredAccepted: search(query: $authoredAcceptedSearch type:ISSUE first:100) { ... prDetails }
          authoredChangesRequested: search(query: $authoredChangesRequestedSearch type:ISSUE first:100) { ... prDetails }
          reviewRequested: search(query: $reviewRequestedSearch type:ISSUE first:100) { ... prDetails }
          reviewedBy: search(query: $reviewedBySearch type:ISSUE first:100) { ... prDetails }
        }
        fragment prDetails on SearchResultItemConnection {
          nodes {
            ... on PullRequest {
              id
              number
              title
              repository {
               owner {
                  login
                }
                name
              }
            }
          }
        }
      `,
      vars,
    );

    const authoredAll = parsePrOverviewNodes(data.authoredAll);
    const authoredAccepted = parsePrOverviewNodes(data.authoredAccepted);
    const authoredChangesRequested = parsePrOverviewNodes(data.authoredChangesRequested);
    const reviewRequested = parsePrOverviewNodes(data.reviewRequested);
    const reviewedBy = parsePrOverviewNodes(data.reviewedBy);

    const authoredIds = new Set(authoredAll.map((pr) => pr.id));

    const collectById = (prOverviews: PrOverviewI[]): { [key: string]: PrOverviewI } => {
      const collected: { [key: string]: PrOverviewI } = {};
      for (const prOverview of prOverviews) {
        if (collected[prOverview.id] === undefined) {
          collected[prOverview.id] = prOverview;
        }
      }
      return collected;
    };

    const authoredActionable = collectById(authoredAccepted.concat(authoredChangesRequested));
    const authoredWaiting = authoredAll.filter((authored) => authoredActionable[authored.id] === undefined);

    const reviewRequestedIds = new Set(reviewRequested.map((pr) => pr.id));
    const reviewedByFiltered = reviewedBy.filter((pr) => !reviewRequestedIds.has(pr.id) && !authoredIds.has(pr.id));

    this.overviewCategories = [
      { title: 'Blocking others', overviews: reviewRequested },
      { title: 'Actionable', overviews: Object.values(authoredActionable) },
      { title: 'Waiting on reviewers', overviews: authoredWaiting },
      { title: 'Waiting on author', overviews: reviewedByFiltered },
    ];
  }
}
</script>

<style scoped></style>
