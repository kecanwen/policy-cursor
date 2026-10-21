export default [
  { path: '/', redirect: '/workspace' },
  { path: '/workspace', component: 'Workspace/index' },
  { path: '/xingce', component: 'XingceDebug/index' },
  { path: '/bank', component: 'ExamBank/index' },
  { path: '/mistakes', component: 'MistakeBook/index' },
  { path: '/dictionary', component: 'Dictionary/index' },
  { path: '*', component: 'Workspace/index' },
];
