<template>
  <p v-if="activityItems === null"><i>Loading...</i></p>
  <div v-else>
    <h1>{{ title }}</h1>
    <h2>Activity</h2>
    <template v-for="activityItem in activityItems">
      <template v-if="isCommit(activityItem)">
        <h3>
          <b>{{ activityItem.authorName }}</b> pushed a commit at <i>{{ activityItem.sortDate }}</i>
        </h3>
        <p>
          Authored date - <i>{{ activityItem.authoredDate }}</i>
          <br />
          Committed date - <i>{{ activityItem.committedDate }}</i>
          <br />
          Pushed date - <i>{{ activityItem.pushedDate }}</i>
        </p>
        <p>{{ activityItem.messageHeadline }}</p>
        <p>{{ activityItem.messageBody }}</p>
        <hr />
      </template>
      <template v-else>
        <h3>
          <b>{{ activityItem.authorName }}</b> commented at <i>{{ activityItem.createdAt }}</i>
        </h3>
        <div v-if="activityItem.body" class="comment_body" v-html="activityItem.body"></div>
        <template v-for="inlineComment in activityItem.inlineComments">
          <h4>
            <i>{{ inlineComment.path }}:{{ inlineComment.line }}</i>
          </h4>
          <div v-html="inlineComment.body"></div>
        </template>
        <hr />
      </template>
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

interface CommitInfoI {
  authorName: string;
  messageHeadline: string;
  messageBody: string;
  authoredDate: Date;
  committedDate: Date;
  pushedDate: Date | null;
  sortDate: Date;
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
    body: rawComment.bodyHTML,
    createdAt: new Date(rawComment.createdAt),
    inlineComments,
  };
}

function parseInlineComment(rawComment: any): InlineCommentI {
  return {
    authorName: rawComment.author.login,
    body: rawComment.bodyHTML,
    createdAt: new Date(rawComment.createdAt),
    path: rawComment.path,
    line: rawComment.originalPosition,
  };
}

function parseCommitInfo(rawCommitNode: any): CommitInfoI {
  const rawCommit = rawCommitNode.commit;
  const pushedDate = rawCommit.pushedDate === null ? null : new Date(rawCommit.pushedDate);
  const authoredDate = new Date(rawCommit.authoredDate);
  return {
    authorName: rawCommit.author.user.login,
    messageHeadline: rawCommit.messageHeadline,
    messageBody: rawCommit.messageBody,
    authoredDate,
    committedDate: new Date(rawCommit.committedDate),
    pushedDate,
    sortDate: pushedDate !== null ? pushedDate : authoredDate,
  };
}

@Component({})
export default class PrDetails extends Vue {
  title: string | null = null;
  activityItems: Array<TopLevelCommentI | CommitInfoI> | null = null;
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
              commits(first: 100) {
                nodes {
                  commit {
                    author {
                      user {
                        login
                      }
                    }
                    messageHeadline
                    messageBody
                    authoredDate
                    committedDate
                    pushedDate
                  }
                }
              }
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
          bodyHTML
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

    const commits: CommitInfoI[] = rawPr.commits.nodes.map(parseCommitInfo);

    const items = ([] as Array<TopLevelCommentI | CommitInfoI>).concat(comments).concat(commits);
    items.sort((a: TopLevelCommentI | CommitInfoI, b: TopLevelCommentI | CommitInfoI) => {
      const aTime = this.isCommit(a) ? a.sortDate : a.createdAt;
      const bTime = this.isCommit(b) ? b.sortDate : b.createdAt;
      return compareValues(aTime.getTime(), bTime.getTime());
    });
    this.activityItems = items;
  }

  private isCommit(item: TopLevelCommentI | CommitInfoI): item is CommitInfoI {
    return (item as CommitInfoI).messageHeadline !== undefined;
  }
}
</script>

<style scoped lang="scss">
.comment_body {
  white-space: pre-wrap;
}
</style>
