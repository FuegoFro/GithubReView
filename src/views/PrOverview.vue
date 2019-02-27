<template>
  <p>
    <a :href="url">{{ prOverview.title }}</a>
  </p>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { PrOverviewData } from '@/pr_overview';

@Component({})
export default class PrOverview extends Vue {
  @Prop(PrOverviewData) prOverview: PrOverviewData;

  get url() {
    return `/pr/${this.prOverview.repoOwner}/${this.prOverview.repoName}/${this.prOverview.num}`;
  }
}
</script>

<style scoped></style>
