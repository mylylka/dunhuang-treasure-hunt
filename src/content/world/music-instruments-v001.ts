const ASSET_ROOT = 'music-instrument-display/v001';

export const MUSIC_INSTRUMENT_GROUPS = {
  strings: '弦乐',
  winds: '吹奏',
  percussion: '鼓乐',
} as const;

type MusicInstrumentGroup = keyof typeof MUSIC_INSTRUMENT_GROUPS;

type InstrumentSource = {
  id: string;
  group: MusicInstrumentGroup;
  name: string;
  tone: string;
  sourceImage: string;
  sourceAudio: string;
  note?: string;
};

const instruments = [
  { id: 'pipa', group: 'strings', name: '琵琶', tone: '清亮、密集的拨弦', sourceImage: '琵琶壁画.jpeg', sourceAudio: '01_琵琶.wav' },
  { id: 'ruan', group: 'strings', name: '阮', tone: '圆润、沉稳的拨弦', sourceImage: '阮壁画.jpeg', sourceAudio: '02_阮.wav' },
  { id: 'zheng', group: 'strings', name: '筝', tone: '流动的弹奏与滑音', sourceImage: '古筝壁画.jpeg', sourceAudio: '03_筝.wav' },
  { id: 'konghou', group: 'strings', name: '竖箜篌', tone: '现代复原的柔和弦音', sourceImage: '箜篌壁画.jpeg', sourceAudio: '04_竖箜篌（现代复原）.wav', note: '试听录音采用现代复原的竖箜篌。' },
  { id: 'xun', group: 'winds', name: '埙', tone: '低沉、空旷的陶土吹奏声', sourceImage: '埙壁画.png', sourceAudio: '08_埙.wav' },
  { id: 'sheng', group: 'winds', name: '笙', tone: '簧片共鸣与和声', sourceImage: '笙壁画.png', sourceAudio: '06_笙.wav' },
  { id: 'dizi', group: 'winds', name: '横笛', tone: '明亮、轻快的笛声', sourceImage: '横笛壁画.jpeg', sourceAudio: '05_横笛.wav' },
  { id: 'bili', group: 'winds', name: '筚篥', tone: '响亮、有鼻音的双簧声', sourceImage: '筚篥壁画.png', sourceAudio: '07_筚篥.wav', note: '试听录音由同为双簧乐器的高音管代听。' },
  { id: 'conch', group: 'winds', name: '海螺（法螺）', tone: '吹起来像一声洪亮的号角，能听到明显的嗡鸣和共鸣。', sourceImage: '海螺壁画.jpeg', sourceAudio: '海螺.mp3' },
  { id: 'paiban', group: 'percussion', name: '拍板', tone: '木板相击，声音短促清脆。', sourceImage: '拍板壁画.jpeg', sourceAudio: '拍板.mp3' },
  { id: 'jiegu', group: 'percussion', name: '羯鼓', tone: '鼓点响亮紧实，连击时急促有力。', sourceImage: '羯鼓壁画.jpeg', sourceAudio: '羯鼓.mp3' },
  { id: 'cymbals', group: 'percussion', name: '钹', tone: '明亮的金属撞击声', sourceImage: '钹壁画.jpeg', sourceAudio: '钹.mp3' },
] as const satisfies readonly InstrumentSource[];

export type MusicInstrumentId = (typeof instruments)[number]['id'];

export interface MusicInstrument extends InstrumentSource {
  id: MusicInstrumentId;
  imagePath: string;
  audioPath: string;
  audioSource: string;
}

export const MUSIC_INSTRUMENTS: readonly MusicInstrument[] = instruments.map(instrument => {
  const mp3 = instrument.sourceAudio.endsWith('.mp3');
  return {
    ...instrument,
    imagePath: `${ASSET_ROOT}/images/${instrument.id}.webp`,
    audioPath: `${ASSET_ROOT}/audio/${instrument.id}.${mp3 ? 'mp3' : 'wav'}`,
    audioSource: mp3 ? '供稿音频' : 'CCMusic 中国音乐数据库',
  };
});

const instrumentsById = new Map(MUSIC_INSTRUMENTS.map(instrument => [instrument.id, instrument]));
export const getMusicInstrument = (id: MusicInstrumentId) => instrumentsById.get(id);
