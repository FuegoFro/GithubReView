<template>
  <div v-if="overviewCategories === null">
    <p><i>Loading...</i></p>
  </div>
  <div v-else>
    <template v-for="overviewCategory in overviewCategories">
      <h1>{{ overviewCategory.title }}</h1>
      <pr-overview v-for="overview in overviewCategory.overviews" :prOverview="overview"></pr-overview>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { graphqlQuery, viewerUsername } from '@/graphql_helpers';
import PrOverview from '@/views/PrOverview.vue';
import { PrOverviewData, PrOverviewCategory } from '@/pr_overview';

function overviewFromResponse(response: any): PrOverviewData {
  return new PrOverviewData(response.title, response.number, response.repository.owner.login, response.repository.name);
}

@Component({
  components: { PrOverview },
})
export default class PrOverviewList extends Vue {
  overviewCategories?: PrOverviewCategory[] = null;

  async mounted(): void {
    const username = await viewerUsername();
    const vars = {
      authored_search: `is:open is:pr archived:false author:${username}`,
      reviewing_search: `is:open is:pr archived:false review-requested:${username}`,
      reviewed_search: `is:open is:pr archived:false reviewed-by:${username}`,
    };

    const data = await graphqlQuery(
      `
            query($authored_search: String!, $reviewing_search: String!, $reviewed_search: String!) {
                authored: search(query: $authored_search type:ISSUE first:100) {
                    ... prDetails
                }
                reviewing: search(query: $reviewing_search type:ISSUE first:100) {
                    ... prDetails
                }
                reviewed: search(query: $reviewed_search type:ISSUE first:100) {
                    ... prDetails
                }

            }
            fragment prDetails on SearchResultItemConnection {
                nodes {
                    ... on PullRequest {
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
    const reviewRequested = new PrOverviewCategory('Review request', data.reviewing.nodes.map(overviewFromResponse));
    const waitingOnAuthor = new PrOverviewCategory('Waiting on author', data.reviewed.nodes.map(overviewFromResponse));
    const created = new PrOverviewCategory('Created', data.authored.nodes.map(overviewFromResponse));
    this.overviewCategories = [reviewRequested, waitingOnAuthor, created];
  }
}
</script>

<style scoped></style>
