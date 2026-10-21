export interface VocabCard {
  id: string;
  original: string;
  refactored: string;
  type: '动宾搭配' | '过渡连词' | '排比框架' | '规范表述';
  note: string;
  createdAt: string;
}

export const vocabCards: VocabCard[] = [
  {
    id: 'v1',
    original: '搞好部门之间的沟通',
    refactored: '健全跨部门统筹协调机制',
    type: '动宾搭配',
    note: '把“搞好”升级为可落地的制度动作，补足机制载体。',
    createdAt: '2026-09-28',
  },
  {
    id: 'v2',
    original: '多商量着办',
    refactored: '建立常态化会商研判机制',
    type: '动宾搭配',
    note: '口语化动作转为机制性表述，适合作答中的对策句。',
    createdAt: '2026-09-30',
  },
  {
    id: 'v3',
    original: '让大家一起参与',
    refactored: '凝聚多方合力，构建共建共治共享格局',
    type: '规范表述',
    note: '“大家”指向模糊，改为治理主体与治理格局。',
    createdAt: '2026-10-02',
  },
  {
    id: 'v4',
    original: '抓紧把问题解决掉',
    refactored: '建立问题闭环处置机制，加快办理进度',
    type: '动宾搭配',
    note: '从“抓紧”这种态度词，转为流程和时限约束。',
    createdAt: '2026-10-03',
  },
  {
    id: 'v5',
    original: '一方面……另一方面……',
    refactored: '既要在……上发力，更要在……上突破',
    type: '过渡连词',
    note: '递进关系更清晰，适合综合分析题的层次展开。',
    createdAt: '2026-10-05',
  },
  {
    id: 'v6',
    original: '这样做有很多好处',
    refactored: '此举有利于……，为……提供有力支撑',
    type: '规范表述',
    note: '避免空泛评价，补足受益对象和作用路径。',
    createdAt: '2026-10-06',
  },
  {
    id: 'v7',
    original: '要加强管理',
    refactored: '压实属地责任，健全全链条监管体系',
    type: '动宾搭配',
    note: '“加强”过于抽象，拆解为责任主体、监管环节和手段。',
    createdAt: '2026-10-08',
  },
  {
    id: 'v8',
    original: '提高群众的满意度',
    refactored: '以群众满意度检验治理成效',
    type: '规范表述',
    note: '从“提高指标”转为“以结果检验”，更符合机关表达。',
    createdAt: '2026-10-09',
  },
  {
    id: 'v9',
    original: '先……再……最后……',
    refactored: '坚持源头治理、过程管控、末端问效一体推进',
    type: '排比框架',
    note: '用治理环节替代时间顺序，层次更有公文感。',
    createdAt: '2026-10-11',
  },
  {
    id: 'v10',
    original: '不能只做表面功夫',
    refactored: '坚决防止重痕迹轻实效，推动工作从“做了”向“做好”转变',
    type: '规范表述',
    note: '把批评性口语转为可写入对策的规范判断。',
    createdAt: '2026-10-12',
  },
];

export const vocabTypes = ['全部', '动宾搭配', '过渡连词', '排比框架', '规范表述'] as const;
