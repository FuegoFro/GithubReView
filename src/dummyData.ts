import { InlineCommentI, PrDetailData } from '@/views/PrDetails.vue';

export const DUMMY_BEFORE_CONTENT = `# abcd
# hello
# this is a test
# Here's a dummy file

# Something something lorem ipsum?

# Simple loop
for i in range(10):
    print(i % 3)
`;
export const DUMMY_AFTER_CONTENT = `# abcd
# hallo
# this is a test
# extra line here
# and here
# Here's a dummy file

# Simple loop
for j in range(10):
    print(j % 3)
`;
export const DUMMY_UNIFIED_DIFF = ` # abcd
-# hello
+# hallo
 # this is a test
+# extra line here
+# and here
 # Here's a dummy file
 
-# Something something lorem ipsum?
-
 # Simple loop
-for i in range(10):
-    print(i % 3)
+for j in range(10):
+    print(j % 3)`;

export function makeDummyPrDetailData(): PrDetailData {
  const dummyFileName = 'test/dummy_file.py';
  const inlineComments: InlineCommentI[] = [
    {
      authorName: 'Someone',
      body: 'Inline comment alpha here',
      createdAt: new Date(Date.now() - 500),
      path: dummyFileName,
      line: 5,
    },
    {
      authorName: 'Someone else',
      body: 'Bravo comment checking in',
      createdAt: new Date(Date.now() - 400),
      path: dummyFileName,
      line: 5,
    },
    {
      authorName: 'Someone',
      body: 'Charlie comment ready for duty',
      createdAt: new Date(Date.now() - 400),
      path: dummyFileName,
      line: 5,
    },
    {
      authorName: 'Someone',
      body: 'first!',
      createdAt: new Date(Date.now() - 400),
      path: dummyFileName,
      line: 1,
    },
    {
      authorName: 'Someone',
      body: 'second?',
      createdAt: new Date(Date.now() - 400),
      path: dummyFileName,
      line: 2,
    },
    {
      authorName: 'Someone',
      body: 'third.',
      createdAt: new Date(Date.now() - 400),
      path: dummyFileName,
      line: 3,
    },
    {
      authorName: 'Someone',
      body: 'Way after file',
      createdAt: new Date(Date.now() - 300),
      path: dummyFileName,
      line: 40,
    },
    {
      authorName: 'Someone',
      body: 'After file',
      createdAt: new Date(Date.now() - 300),
      path: dummyFileName,
      line: 20,
    },
  ];
  return {
    title: 'Test',
    activityItems: [
      {
        authorName: 'Someone',
        body: "Here's a comment",
        createdAt: new Date(Date.now()),
        inlineComments,
      },
    ],
    diffs: [
      {
        path: dummyFileName,
        beforeContent: DUMMY_BEFORE_CONTENT,
        afterContent: DUMMY_AFTER_CONTENT,
        unifiedDiffContent: DUMMY_UNIFIED_DIFF,
        inlineComments,
      },
    ],
  };
}
