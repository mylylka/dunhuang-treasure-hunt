import type { ComponentType } from 'react';
import flyingArt from '../content/world/flying-history-art-v001.json';
import flyingText from '../content/world/flying-history-text-v001.json';
import { MUSIC_GUIDE_OUTFITS } from '../content/world/music-guide-v001';
import { MUSIC_INSTRUMENT_GROUPS, MUSIC_INSTRUMENTS } from '../content/world/music-instruments-v001';

interface Props {
  requested: ReadonlySet<string>;
  PaperImage: ComponentType<{
    id: string;
    src: string;
    label: string;
    requested: ReadonlySet<string>;
    ratio?: number;
  }>;
}

const thumbnail = (name: string) => `music-gallery-paper/v001/${name}.webp`;

export function MusicGalleryPaperContent({ requested, PaperImage }: Props) {
  return <>
    <div className="mogao-scroll-introduction">
      <h3>从壁画看敦煌乐舞</h3>
      <p>飞天的飘带、乐师手里的器物、舞者与供养人的衣饰，都留下了观察敦煌乐舞的线索。这里收录了乐舞坊展出的图像和讲解，可以对照着细看。</p>
    </div>
    <section className="mogao-scroll-chapter" aria-label="飞天">
      <header>
        <p className="mogao-scroll-era">九个时期</p>
        <h3>飞天</h3>
        <p>沿着飞天的身姿、衣裙和飘带看，画师怎样让没有翅膀的人物显得正在飞翔？</p>
      </header>
      <ol>
        {flyingArt.map((chapter, index) => {
          const name = `chapter-${String(index + 1).padStart(2, '0')}`;
          const caves = [...new Set(chapter.labels.map(label => label.cave))];
          return <li key={name}>
            <PaperImage id={name} src={thumbnail(name)} label={chapter.title} requested={requested} />
            <div className="mogao-scroll-exhibit-copy">
              <h4>{chapter.title}</h4>
              <p className="mogao-exhibit-meta">莫高窟 {caves.map(cave => `第${cave}窟`).join(' · ')}</p>
              <p>{flyingText[index]}</p>
            </div>
          </li>;
        })}
      </ol>
    </section>
    <section className="mogao-scroll-chapter" aria-label="乐舞">
      <header>
        <p className="mogao-scroll-era">一楼 · 三面舞乐墙</p>
        <h3>乐舞</h3>
        <p>从画面两端的乐师群看到楼阁旁的舞者，可以比较乐师的持器方式，以及舞者的手势、转身和衣裙走向。三面展墙的画幅在这里并排展开。</p>
      </header>
      <PaperImage id="dance-panorama" src={thumbnail('dance-panorama')} label="楼阁、舞者与乐师组成的舞乐坊三墙全景"
        requested={requested} ratio={10900 / 3072} />
      <p className="mogao-scroll-era">舞乐坊展墙图 · 展陈改编</p>
    </section>
    <section className="mogao-scroll-chapter" aria-label="乐器">
      <header>
        <p className="mogao-scroll-era">二楼 · 十二件展品</p>
        <h3>乐器</h3>
        <p>敦煌壁画里既有中原流传的筝、笙，也有沿丝绸之路传来的箜篌、筚篥。对照壁画细节和各件乐器的音色，可以看出不同地域的音乐怎样在敦煌相遇。</p>
      </header>
      <ol>
        {MUSIC_INSTRUMENTS.map(instrument => {
          const name = `instrument-${instrument.id}`;
          return <li key={name}>
            <PaperImage id={name} src={thumbnail(name)} label={`${instrument.name}壁画细节`} requested={requested} />
            <div className="mogao-scroll-exhibit-copy">
              <h4>{instrument.name}</h4>
              <p className="mogao-exhibit-meta">{MUSIC_INSTRUMENT_GROUPS[instrument.group]}</p>
              <p>{instrument.tone}</p>
              {instrument.note && <p className="mogao-scroll-note">{instrument.note}</p>}
            </div>
          </li>;
        })}
      </ol>
    </section>
    <section className="mogao-scroll-chapter" aria-label="服饰">
      <header>
        <p className="mogao-scroll-era">五套壁画装束</p>
        <h3>服饰</h3>
        <p>对照画中人物的发冠、袖形和裙摆，留意服饰随着年代和地域怎样变化。</p>
      </header>
      <ol>
        {MUSIC_GUIDE_OUTFITS.map(outfit => {
          const name = `outfit-${outfit.id}`;
          return <li key={name}>
            <PaperImage id={name} src={thumbnail(name)} label={outfit.title} requested={requested} />
            <div className="mogao-scroll-exhibit-copy">
              <h4>{outfit.title}</h4>
              <p className="mogao-exhibit-meta">{outfit.period} · {outfit.cave}</p>
              <p>{outfit.description}</p>
              <a href={outfit.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${outfit.period}${outfit.cave}${outfit.title}的出处`}>查看出处</a>
            </div>
          </li>;
        })}
      </ol>
    </section>
  </>;
}
