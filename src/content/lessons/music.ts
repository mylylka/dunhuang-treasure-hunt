import type { LessonBook } from './types';

export const musicLesson: LessonBook = {
  id: 'music-shape-guide', themeId: 'music', version: 1,
  title: '器形与飞天图像',
  sources: [{ id: 'dha', title: '敦煌研究院 · 文化资料入口', url: 'https://www.dha.ac.cn/' }],
  units: [{
    id: 'shape-observation', kind: 'motifs', tabLabel: '器形观察', title: '从器物外形开始观察',
    panels: [{
      id: 'music-shapes', label: '琴身、鼓面与悬铃', title: '观察琴身、鼓面与悬铃',
      body: '看乐舞图像时，可以先观察器物的大轮廓：梨形琴身与长颈、展开的管列、圆形鼓面、带悬环的铃身。再比较颜色、纹样与细节。找物时须与任务卡的图片完全一致，外形相似但颜色或图案不同的物件不计数。\n\n观察飞天时，可以沿着人物姿态、飘带末端和云朵外缘比较轮廓。影子配对只选择轮廓完全对应的一张，不限时，可放大对照。\n\n本次游戏使用开发者提供的AI教学示意。它们不对应某一洞窟的完整原画，也不能据此判断真实器物的年代或演奏声音。本页是一段简短观察导览，完整飞天、乐舞、服饰教学仍在筹备。',
      imageAssetId: 'cover-music', imageCaption: 'AI教学示意：乐舞主题封面；游戏物件的外形观察不等于文物鉴定。', sourceIds: ['dha'],
    }],
  }],
};
