<template>
  <p>
    <a :href="url">{{ prOverview.title }}</a>
  </p>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

export interface PrOverviewI {
  title: string;
  num: number;
  repoOwner: string;
  repoName: string;
  uniqueKey: string;
}

@Component({})
export default class PrOverview extends Vue {
  @Prop(Object) prOverview!: PrOverviewI;

  get url() {
    return `/pr/${this.prOverview.repoOwner}/${this.prOverview.repoName}/${this.prOverview.num}`;
  }
}
</script>

<style scoped></style>
