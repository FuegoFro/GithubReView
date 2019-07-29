<template>
  <p>
    <a :href="`https://www.github.com/${prOverview.repoOwner}/${prOverview.repoName}/pull/${prOverview.prNumber}`"
      >[GH]</a
    >
    •
    <router-link :to="{ name: 'prDetails', params: prOverview }">
      {{ prOverview.title }}
    </router-link>
  </p>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

export interface PrOverviewI {
  id: string;
  title: string;
  prNumber: number;
  repoOwner: string;
  repoName: string;
}

@Component({})
export default class PrOverview extends Vue {
  @Prop(Object) prOverview!: PrOverviewI;
}
</script>

<style scoped></style>
