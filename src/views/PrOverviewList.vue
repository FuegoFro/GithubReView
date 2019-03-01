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
        :key="overview.uniqueKey"
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

function parsePrOverview(response: any): PrOverviewI {
  const num = response.number;
  const repoOwner = response.repository.owner.login;
  const repoName = response.repository.name;

  return {
    title: response.title,
    prNumber: num,
    repoOwner,
    repoName,
    uniqueKey: `${repoOwner}/${repoName}/${num}`,
  };
}

@Component({
  components: { PrOverview },
})
export default class PrOverviewList extends Vue {
  overviewCategories: PrOverviewCategoryI[] | null = null;

  async mounted() {
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
    const reviewRequested: PrOverviewCategoryI = {
      title: 'Review request',
      overviews: data.reviewing.nodes.map(parsePrOverview),
    };
    const waitingOnAuthor: PrOverviewCategoryI = {
      title: 'Waiting on author',
      overviews: data.reviewed.nodes.map(parsePrOverview),
    };
    const created: PrOverviewCategoryI = { title: 'Created', overviews: data.authored.nodes.map(parsePrOverview) };
    this.overviewCategories = [reviewRequested, waitingOnAuthor, created];
  }
}
</script>

<style scoped></style>
