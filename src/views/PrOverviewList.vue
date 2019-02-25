<template>
    <div>
        <template v-for="overviewCategory in overviewCategories">
            <h1>{{ overviewCategory.title }}</h1>
            <pr-overview v-for="overview in overviewCategory.overviews" :prOverview="overview"></pr-overview>
        </template>
    </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import {graphqlQuery, viewerUsername} from '@/graphql_helpers';
import PrOverview from '@/views/PrOverview.vue';
import {PrOverviewData, PrOverviewCategory} from '@/pr_overview';

function overviewFromResponse(response: any): PrOverviewData {
    return new PrOverviewData(
        response.title,
        response.number,
        response.repository.owner.login,
        response.repository.name,
    );
}

@Component({
    components: {PrOverview},
})
export default class PrOverviewList extends Vue {
    overviewCategories: PrOverviewCategory[] = [];

    async mounted(): void {
        // TODO - Don't hard code username
        const data = await graphqlQuery(`
            query {
                authored: search(query: "is:open is:pr author:FuegoFro archived:false" type:ISSUE first:100) {
                    ... prDetails
                }
                reviewing: search(query: "is:open is:pr review-requested:FuegoFro archived:false" type:ISSUE first:100) {
                    ... prDetails
                }
                reviewed: search(query: "is:open is:pr reviewed-by:FuegoFro archived:false" type:ISSUE first:100) {
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
        `);
        const reviewRequested = new PrOverviewCategory('Review request', data.reviewing.nodes.map(overviewFromResponse));
        const waitingOnAuthor = new PrOverviewCategory('Waiting on author', data.reviewed.nodes.map(overviewFromResponse));
        const created = new PrOverviewCategory('Created', data.authored.nodes.map(overviewFromResponse));
        this.overviewCategories = [reviewRequested, waitingOnAuthor, created];
    }
}
</script>

<style scoped>

</style>