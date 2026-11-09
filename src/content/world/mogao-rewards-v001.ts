export type MogaoRewardId = 'hall-a' | 'hall-b';
export type WorldRewardId = MogaoRewardId | 'music-gallery' | 'first-gallery';

export const WORLD_REWARDS = {
  'first-gallery': {
    title: '敦煌纹样观艺卷',
    place: '第一馆 · 纹样馆',
    summary: '回看壁画纹样、经典藻井、敦煌色彩与填色创作。',
    opened: '纹样馆探索完成。',
  },
  'hall-a': {
    title: '绘世观壁笺',
    place: '第三馆 · 绘世厅',
    summary: '回看一楼主室与二楼绘世厅的四幅壁画故事。',
    opened: '二楼绘世厅的观佛洞已打开。',
  },
  'hall-b': {
    title: '敦煌观展手卷',
    place: '第三馆 · 佛像里的千年敦煌',
    summary: '回看四墙主题与十二件展品。',
    opened: '十二件展品观赏完成，观佛口已开启。',
  },
  'music-gallery': {
    title: '敦煌乐舞见闻卷',
    place: '第二馆 · 乐舞馆',
    summary: '回看飞天、乐舞、乐器与敦煌服饰。',
    opened: '乐舞馆探索完成。',
  },
} as const satisfies Record<WorldRewardId, { title: string; place: string; summary: string; opened: string }>;
