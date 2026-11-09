import type { ComponentType } from 'react';
import { FIRST_GALLERY_FOLIO } from '../content/world/first-gallery-folio-v001';

interface Props {
  requested: ReadonlySet<string>;
  PaperImage: ComponentType<{ id: string; src: string; label: string; requested: ReadonlySet<string> }>;
}

export function FirstGalleryFolioContent({ requested, PaperImage }: Props) {
  return <>
    <div className="mogao-scroll-introduction">
      <h3>从一朵花看懂敦煌图案</h3>
      <p>补一块壁画、仰看一方藻井、给一幅线稿设色。把第一馆的三次发现放在一起，就能沿着部位、题材、排列和颜色四条线，看懂一组纹样。</p>
    </div>
    {FIRST_GALLERY_FOLIO.map(chapter => <section className="mogao-scroll-chapter" key={chapter.title} aria-label={chapter.title}>
      <header><h3>{chapter.title}</h3><p>{chapter.introduction}</p></header>
      <ol>
        {chapter.entries.map(entry => <li key={entry.id}>
          <PaperImage id={entry.id} src={`first-gallery-folio/v001/${entry.image}.webp`} label={entry.caption} requested={requested} />
          <div className="mogao-scroll-exhibit-copy">
            <h4>{entry.title}</h4>
            <p className="mogao-exhibit-meta">{entry.context}</p>
            <p>{entry.text}</p>
            <p className="mogao-scroll-note">{entry.caption}</p>
            {entry.source && <a href={entry.source} target="_blank" rel="noreferrer" aria-label={`${entry.title}的参考资料`}>查看资料</a>}
          </div>
        </li>)}
      </ol>
    </section>)}
  </>;
}
