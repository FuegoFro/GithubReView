<template>
  <p v-if="comments === null"><i>Loading...</i></p>
  <div v-else>
    <h1>{{ title }}</h1>
    <h1>Comments</h1>
    <template v-for="top_level_comment in comments">
      <h2>
        <b>{{ top_level_comment.authorName }}</b> at <i>{{ top_level_comment.createdAt }}</i>
      </h2>
      <p v-if="top_level_comment.body" class="comment_body">{{ top_level_comment.body }}</p>
      <template v-for="inline_comment in top_level_comment.inlineComments">
        <h3>
          <i>{{ inline_comment.path }}:{{ inline_comment.line }}</i>
        </h3>
        <p class="comment_body">{{ inline_comment.body }}</p>
      </template>
      <hr />
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { graphqlQuery } from '@/graphql_helpers';

function compareValues<T extends string | number>(a: T, b: T): number {
  if (a === b) {
    return 0;
  } else if (a < b) {
    return -1;
  } else {
    return 1;
  }
}

interface BaseCommentI {
  authorName: string;
  body: string;
  createdAt: Date;
}

interface InlineCommentI extends BaseCommentI {
  path: string;
  line: number;
}

interface TopLevelCommentI extends BaseCommentI {
  inlineComments: InlineCommentI[];
}

function parseTopLevelComment(rawComment: any): TopLevelCommentI {
  const rawInlineComments = rawComment.comments;
  const inlineComments =
    rawInlineComments === null || rawInlineComments === undefined
      ? []
      : rawInlineComments.nodes.map(parseInlineComment);
  inlineComments.sort(
    (a: InlineCommentI, b: InlineCommentI): number => {
      if (a.path !== b.path) {
        return compareValues(a.path, b.path);
      }
      return compareValues(a.line, b.line);
    },
  );

  return {
    authorName: rawComment.author.login,
    body: rawComment.body,
    createdAt: new Date(rawComment.createdAt),
    inlineComments,
  };
}

function parseInlineComment(rawComment: any): InlineCommentI {
  return {
    authorName: rawComment.author.login,
    body: rawComment.body,
    createdAt: new Date(rawComment.createdAt),
    path: rawComment.path,
    line: rawComment.originalPosition,
  };
}

@Component({})
export default class PrDetails extends Vue {
  title: string | null = null;
  comments: TopLevelCommentI[] | null = null;
  @Prop(String) repoOwner!: string;
  @Prop(String) repoName!: string;
  @Prop(Number) prNumber!: number;

  // noinspection JSUnusedGlobalSymbols
  async mounted() {
    const rawPr = await this.fetchData();
    this.populateData(rawPr);
  }

  private async fetchData() {
    return graphqlQuery(
      `
            query($repoOwner: String!, $repoName: String!, $prNumber: Int!) {
                repository(owner: $repoOwner, name: $repoName) {
                    pullRequest(number: $prNumber) {
                        title
                        comments(first: 100) {
                            nodes {
                                ...commentInfo
                            }
                        }
                        reviews(first: 100) {
                            nodes {
                                ...commentInfo
                                state
                                comments(first: 100) {
                                    nodes {
                                        originalPosition
                                        path
                                        ...commentInfo
                                    }
                                }
                            }
                        }
                    }
                }
            }
            fragment commentInfo on Comment {
                author {
                    login
                }
                body
                createdAt
            }
        `,
      { repoOwner: this.repoOwner, repoName: this.repoName, prNumber: this.prNumber },
    );
  }

  private populateData(data: any) {
    const rawPr = data.repository.pullRequest;

    this.title = rawPr.title;

    const rawComments = rawPr.comments.nodes.concat(rawPr.reviews.nodes);
    const comments: TopLevelCommentI[] = rawComments.map(parseTopLevelComment);
    comments.sort((a: TopLevelCommentI, b: TopLevelCommentI) =>
      compareValues(a.createdAt.getTime(), b.createdAt.getTime()),
    );
    this.comments = comments;
  }
}
</script>

<style scoped lang="scss">
.comment_body {
  white-space: pre-wrap;
}
</style>
