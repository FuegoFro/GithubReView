<template>
  <div>
    <h3>
      <code>{{ diff.path }}</code>
    </h3>
    <div class="unified_diff">
      <template v-for="line in getUnifiedDiffLines()">
        <div class="unified_diff_line">
          {{ line.beforeLine || '-' }} {{ line.afterLine || '-' }}
          <code class="unified_diff_line_text" :class="{ add: line.isAdd, remove: line.isRemove }">{{
            line.content
          }}</code>
        </div>
        <p v-for="comment in line.commentsOnLine" class="comment">{{ comment.body }}</p>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { InlineCommentI } from '@/views/PrDetails.vue';

export interface FileDiffI {
  path: string;
  beforeContent: string;
  afterContent: string;
  unifiedDiffContent: string;
  inlineComments: InlineCommentI[];
}

interface LineI {
  content: string;
  isAdd: boolean;
  isRemove: boolean;
  commentsOnLine: InlineCommentI[];
  beforeLine: number | null;
  afterLine: number | null;
}

@Component({})
export default class FileDiff extends Vue {
  @Prop(Object) diff!: FileDiffI;

  private getUnifiedDiffLines(): LineI[] {
    /*
    How to handle comments over various revisions. Pretty unclear where/when this would happen. Presumably client-side,
    but it might be slow. Maybe could use local storage to only do the work once per PR and/or incrementally do the
    work when there are updates.
    1. Each comment has a (path, line, commit) tuple, each diff has the before/after commit.
    2. Starting with the oldest commit present in the comments, "translate" it to the before commit (if it itself is
       before or at that commit) or the after commit (if it itself is after the before commit).
        a. If GitHub can't do this for us, we could get the unified diff for each commit and walk through the commits
           from the starting comment commit to the target commit (determined above), adjust line numbers based on
           number of lines added/removed before it in the file.
        b. Ideally we could get fine-grained detection of modification for more accurate comment tracking across
           modifications.
        c. If a given comment's lines are fully removed, have its line be just before the removed section.
     3. If we match to the before commit and the lines are fully present/unchanged in the after commit as well, render
        the comment in the after commit. Otherwise (includes a removed line), render it in the before commit.

     FOR NOW THOUGH just render them on their naive lines on the after file
     */
    const commentsByLine: { [key: number]: InlineCommentI[] } = {};
    let maxCommentLine = 0;
    for (const inlineComment of this.diff.inlineComments) {
      commentsByLine[inlineComment.line] = commentsByLine[inlineComment.line] || [];
      commentsByLine[inlineComment.line].push(inlineComment);
      if (inlineComment.line > maxCommentLine) {
        maxCommentLine = inlineComment.line;
      }
    }

    let effectiveBeforeLine = 0;
    let effectiveAfterLine = 0;
    const lineContents = this.diff.unifiedDiffContent.split('\n');
    return lineContents.map(
      (line, i): LineI => {
        // Lines are 1 indexed
        const isAdd = line.charAt(0) === '+';
        const isRemove = line.charAt(0) === '-';
        if (isAdd) {
          effectiveAfterLine += 1;
        } else if (isRemove) {
          effectiveBeforeLine += 1;
        } else {
          effectiveAfterLine += 1;
          effectiveBeforeLine += 1;
        }
        let commentsOnLine: InlineCommentI[] = [];
        if (!isRemove) {
          commentsOnLine = commentsByLine[effectiveAfterLine] || [];
          if (i === lineContents.length - 1) {
            // Add all the comments past the end of the file to the bottom
            for (let j = effectiveAfterLine + 1; j <= maxCommentLine; j++) {
              commentsOnLine = commentsOnLine.concat(commentsByLine[j] || []);
            }
          }
        }
        return {
          content: line.substring(1) + '\n',
          isAdd,
          isRemove,
          commentsOnLine,
          beforeLine: isAdd ? null : effectiveBeforeLine,
          afterLine: isRemove ? null : effectiveAfterLine,
        };
      },
    );
  }
}
</script>

<style scoped lang="css">
.unified_diff_line {
   width: 100%;
  position: relative;
  display: inline-block;
}
.unified_diff_line_text {
  white-space: pre-wrap;
  /*width: 100%;*/
}
  .unified_diff_line_text.add {
    background-color: palegreen;
  }
  .unified_diff_line_text.remove {
    background-color: pink;
  }

  .comment {
    position: relative;
    /*display: inline;*/
    border: solid gray;
    border-radius: 2px;
  }
</style>
