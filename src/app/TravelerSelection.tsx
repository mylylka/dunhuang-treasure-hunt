import { useState, type MouseEvent } from 'react';
import { worldAssetUrl, type TravelerId } from '../content/world/assets';
import { isMobilePhone } from '../services/mobile-landscape';
import { travelerProfiles } from '../services/traveler-selection';
import '../styles/traveler-selection.css';

const travelers = Object.keys(travelerProfiles) as TravelerId[];

interface Props {
  current: TravelerId | null;
  onConfirm(id: TravelerId): void;
  onDirectGameWorld?: (event: MouseEvent<HTMLAnchorElement>) => boolean;
}

export function TravelerSelection({ current, onConfirm, onDirectGameWorld }: Props) {
  const [selected, setSelected] = useState<TravelerId>(current ?? 'classic');
  const phone = isMobilePhone();

  return <section className="traveler-selection" data-phone={phone || undefined}
    aria-labelledby="traveler-selection-title">
    <img className="traveler-landscape" src={worldAssetUrl('traveler-selection/v004/background.webp')}
      alt="敦煌寻宝记。选择旅人。选一位旅人，踏上敦煌的漫游之路。" draggable={false} fetchPriority="high" />
    <h1 className="visually-hidden" id="traveler-selection-title">选择旅人</h1>
    <form className="traveler-selection-layout" onSubmit={event => {
      event.preventDefault();
      onConfirm(selected);
    }}>
      <div className="traveler-stage" role="radiogroup" aria-labelledby="traveler-selection-title">
        {travelers.map(id => {
          const { name, portrait, compact, avatar } = travelerProfiles[id];
          return <label className="traveler-option" key={id} data-traveler={id}>
            <input className="visually-hidden" type="radio" name="traveler" value={id}
              aria-label={name} checked={selected === id} onChange={() => setSelected(id)} />
            <span className="traveler-figure" aria-hidden="true">
              <img src={worldAssetUrl(phone ? compact : portrait)} alt="" draggable={false} />
            </span>
            <span className="traveler-selection-name" aria-hidden="true">{name}</span>
            {phone && <span className="traveler-avatar" aria-hidden="true">
              <img src={worldAssetUrl(avatar)} alt="" draggable={false} />
              <span>{name}</span>
            </span>}
          </label>;
        })}
      </div>
      <div className="traveler-selection-actions">
        <button className="button button-secondary traveler-selection-enter" type="submit">
          开启敦煌之旅 <span aria-hidden="true">›</span>
        </button>
        {onDirectGameWorld && <a href="#/themes" onClick={onDirectGameWorld}>直接体验小游戏</a>}
      </div>
    </form>
  </section>;
}
