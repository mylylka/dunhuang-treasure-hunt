import { daily as dailyAudio } from './flying-history-audio-v001.json';

export const MUSIC_GUIDE_DIRECTORY = 'music-guide/v001';
export const MUSIC_GUIDE_STATION = { x: 36.7, y: 0, z: .6 } as const;
export const MUSIC_GUIDE_PLAYER_START = { x: 40.2, y: 0, z: 6.2 } as const;

const outfits = [
  {
    id: 'northern-wei', period: '北魏', cave: '莫高窟第257窟', title: '《沙弥守戒》中的少女',
    description: '窄袖短衫和披巾体现龟兹服饰风格。同一幅故事画里还有其他地区的服饰，展现了敦煌画师对多种装束的观察。',
    sourceUrl: 'https://www.neac.gov.cn/seac/c103391/202307/1166106.shtml',
  },
  {
    id: 'western-wei', period: '西魏', cave: '莫高窟第285窟', title: '女供养人',
    description: '宽袖、间色裙与高挽的发髻，勾勒出修长飘逸的轮廓，可以从中看到南朝服饰风格在敦煌的回响。',
    sourceUrl: 'https://www.dha.ac.cn/info/1425/3698.htm',
  },
  {
    id: 'late-tang', period: '晚唐', cave: '莫高窟第9窟', title: '女供养人',
    description: '花钗、大袖衫、高腰长裙与披帛相互搭配。细看衣裙上的花纹，就能体会晚唐贵族礼服的讲究。',
    sourceUrl: 'https://www.chinasilkmuseum.com/yz/info_18.aspx?itemid=31351',
  },
  {
    id: 'five-dynasties', period: '五代', cave: '莫高窟第61窟', title: '于阗皇后曹氏',
    description: '高冠与层叠饰物衬出皇后的身份。她出现在曹氏家族的供养人行列中，这幅画像也记录了敦煌与于阗之间的往来。',
    sourceUrl: 'https://www.dha.ac.cn/info/1425/3588.htm',
  },
  {
    id: 'yuan', period: '元代', cave: '莫高窟第332窟', title: '蒙古女供养人',
    description: '高耸的罟罟冠和宽袖长袍，是认识元代蒙古贵族女性装束的重要线索。',
    sourceUrl: 'https://img.dpm.org.cn/Uploads/file/2025/02/10/1739169205tySQOdilD260.pdf',
  },
] as const;

export type MusicGuideOutfitId = 'plain' | (typeof outfits)[number]['id'];
export const MUSIC_GUIDE_OUTFITS = outfits.map(outfit => ({
  ...outfit, imagePath: `${MUSIC_GUIDE_DIRECTORY}/${outfit.id}.webp`,
}));

const lines = {
  welcome: '您好，欢迎来到乐舞馆。',
  intro: '这里有飞天、乐舞、乐器和服饰，藏着敦煌的千年生活与丝路故事。让我陪你逛逛吧！你也可以选一套敦煌记载的衣裳，帮我装扮。',
  ready: '我换好了，咱们去逛逛吧',
  upstairs: '这边是音乐坊，在敦煌壁画中，藏着数千件古代乐器的身影。这里既有中原流传的筝、笙，也有沿丝绸之路传来的箜篌、筚篥，不同地域的音乐在敦煌相遇、交融。点点这些乐器，听听它们的声音吧！',
} as const;

export type MusicGuideLineId = keyof typeof lines;
const readingSeconds = { welcome: 4, intro: 16, ready: 4, upstairs: 23 } as const;
export const MUSIC_GUIDE_LINES = Object.fromEntries((Object.keys(lines) as MusicGuideLineId[]).map(id => {
  const clip = dailyAudio[id];
  return [id, { text: lines[id], seconds: Math.max(readingSeconds[id], clip.duration + 1.5), audioPath: clip.path }];
})) as Record<MusicGuideLineId, { text: string; seconds: number; audioPath: string }>;
