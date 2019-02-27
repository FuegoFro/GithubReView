<template>
  <div>
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

function compareValues(a, b): number {
  if (a === b) {
    return 0;
  } else if (a < b) {
    return -1;
  } else {
    return 1;
  }
}

class BaseComment {
  constructor(public authorName: string, public body: string, public createdAt: Date) {}
}

class InlineComment extends BaseComment {
  static fromResponse(response: any): InlineComment {
    return new InlineComment(
      response.author.login,
      response.body,
      new Date(response.createdAt),
      response.path,
      response.originalPosition,
    );
  }
  constructor(authorName: string, body: string, createdAt: Date, public path: string, public line: number) {
    super(authorName, body, createdAt);
  }
}

class TopLevelComment extends BaseComment {
  static fromResponse(response: any): TopLevelComment {
    const rawInlineComments = response.comments;
    const inlineComments =
      rawInlineComments === null || rawInlineComments === undefined
        ? []
        : rawInlineComments.nodes.map(InlineComment.fromResponse);
    inlineComments.sort(
      (a: InlineComment, b: InlineComment): number => {
        if (a.path !== b.path) {
          return compareValues(a.path, b.path);
        }
        return compareValues(a.line, b.line);
      },
    );

    return new TopLevelComment(response.author.login, response.body, new Date(response.createdAt), inlineComments);
  }

  constructor(authorName: string, body: string, createdAt: Date, public inlineComments: InlineComment[]) {
    super(authorName, body, createdAt);
  }
}

@Component({})
export default class PrDetails extends Vue {
  title?: string = null;
  comments?: TopLevelComment[] = null;
  @Prop(String) repoOwner: string;
  @Prop(String) repoName: string;
  @Prop(Number) prNumber: number;

  async mounted(): void {
    const vars = { repoOwner: this.repoOwner, repoName: this.repoName, prNumber: this.prNumber };
    const data = await graphqlQuery(
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
      vars,
    );

    const rawPr = data.repository.pullRequest;
    this.title = rawPr.title;

    const rawComments = rawPr.comments.nodes.concat(rawPr.reviews.nodes);
    const comments: TopLevelComment[] = rawComments.map(TopLevelComment.fromResponse);
    comments.sort((a: TopLevelComment, b: TopLevelComment) => compareValues(a.createdAt, b.createdAt));
    this.comments = comments;
  }
}
</script>

<style scoped lang="scss">
.comment_body {
  white-space: pre-wrap;
}
</style>
