import { worldAssetUrl, type WorldStoryImage } from './assets';

export interface WorldStorySegment {
  id: string;
  title: string;
  image: WorldStoryImage;
  text: string;
  audioUrl?: string;
}

export interface WorldStory {
  id: string;
  title: string;
  subtitle: string;
  fullImage: WorldStoryImage;
  segments: WorldStorySegment[];
}

/** Two selected episodes for player validation, not the full six-part release. */
export const worldStoryPreview: WorldStory = {
  id: 'nine-colored-deer-preview',
  title: '九色鹿王本生',
  subtitle: '故事播放器试演 · 选取两段 · 旁白待配',
  fullImage: {
    url: worldAssetUrl('story/v001/full-scroll.webp'),
    width: 4096,
    height: 682,
    alt: '开发者提供的九色鹿故事横卷完整图像',
  },
  segments: [
    {
      id: 'rescue-and-promise',
      title: '救人之后的约定',
      image: {
        url: worldAssetUrl('story/v001/rescue-and-promise.webp'),
        width: 1400,
        height: 1005,
        alt: '九色鹿驮出落水者，获救者跪下许诺的故事局部',
      },
      text: '九色鹿把落水的人救上岸。获救者答应保守秘密，不向别人透露鹿王的住处。这幅局部把救人和立誓接连画出，同一个人物因此出现了不止一次。',
    },
    {
      id: 'appeal-to-the-king',
      title: '鹿王向国王陈情',
      image: {
        url: worldAssetUrl('story/v001/appeal-to-the-king.webp'),
        width: 1400,
        height: 1201,
        alt: '九色鹿与骑马国王相对，诉说事情经过的故事局部',
      },
      text: '后来，获救者为了赏金告密，带人追捕鹿王。九色鹿向国王讲明救人与背约的经过。国王受到触动，放过鹿王，并下令保护它。这里选取故事后段，与上一幅并非相邻情节。',
    },
  ],
};

export const worldStoryReference = {
  title: '敦煌研究院：莫高窟第257窟',
  url: 'https://www.dha.ac.cn/info/1425/3548.htm',
  note: '故事依据九色鹿王本生；灰模洞窟并非第257窟的实景复原。',
};
