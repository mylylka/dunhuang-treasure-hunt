import content from './mogao-exhibit-v001.json';

export type MogaoExhibitWallId = 'A' | 'B' | 'C' | 'D';
export type MogaoExhibitId = `${MogaoExhibitWallId}0${1 | 2 | 3}`;
export type MogaoExhibitPanelId = MogaoExhibitId | 'C03-detail';
export type MogaoExhibitTarget = MogaoExhibitPanelId | `wall-${MogaoExhibitWallId}`;

type MogaoExhibitImage = { path: string; width: number; height: number };

export interface MogaoExhibit {
  id: MogaoExhibitId;
  wall: MogaoExhibitWallId;
  period: string;
  cave: string;
  location: string;
  type: string;
  title: string;
  note: string;
  look: string;
  voice: string;
  page: string;
  img: string;
  image: MogaoExhibitImage | null;
  detailImage?: MogaoExhibitImage;
  thumb: string | null;
  referenceOnly: boolean;
}

interface MogaoExhibitContent {
  title: string;
  entrance: string;
  walls: ReadonlyArray<{ id: MogaoExhibitWallId; title: string; subtitle: string; years: string; intro: string }>;
  items: ReadonlyArray<MogaoExhibit>;
}

export const MOGAO_EXHIBIT_ENTRANCE_LINES = content.entrance.split('\n');
export const MOGAO_EXHIBIT = { ...content, entrance: MOGAO_EXHIBIT_ENTRANCE_LINES.join('') } as MogaoExhibitContent;
export const MOGAO_EXHIBIT_SCROLL = 'mogao-exhibit/v001/reward-scroll.webp';
export const MOGAO_EXHIBIT_INSTRUCTIONS = [
  ['寻找莲花纹样。'],
  ['点击观看墙上展品。'],
  ['看完全部展品后，', '即可进入观佛洞。'],
] as const;
export const MOGAO_HALL_A_ENTRANCE_LINES = [
  '敦煌壁画历经千余年的绘制，记录了古人的信',
  '仰、生活与艺术。画中既有神佛传说、佛教故',
  '事，也有丝绸之路上的人物、服饰、音乐与舞',
  '蹈。许多故事像连环画一样在洞窟墙壁上徐徐展',
  '开，让千年前的悲欢、善恶与智慧，至今仍能被',
  '我们看见。',
] as const;
export const MOGAO_HALL_A_ENTRANCE = MOGAO_HALL_A_ENTRANCE_LINES.join('');
export const MOGAO_HALL_A_INSTRUCTIONS = [
  ['请点击壁画欣赏故事。'],
  ['看完四幅壁画故事后，', '即可进入观佛洞。'],
] as const;
const exhibitsById = new Map<string, MogaoExhibit>(MOGAO_EXHIBIT.items.map(item => [item.id, item]));
export const getMogaoExhibit = (id: string) => exhibitsById.get(id);
export const exhibitIdForPanel = (panelId: MogaoExhibitPanelId): MogaoExhibitId => panelId === 'C03-detail' ? 'C03' : panelId;
