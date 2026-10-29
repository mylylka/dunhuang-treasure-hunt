import type { useSound } from './useSound';
import '../styles/sound.css';

export function SoundSettings({ sound }: { sound: ReturnType<typeof useSound> }) {
  const percent = Math.round(sound.preferences.volume * 100);
  return <>
    <div className="setting-row" data-sound="none">
      <div><h2>游戏音效</h2><p>温润木石</p></div>
      <label className="toggle"><input type="checkbox" aria-label="游戏音效" data-testid="sound-enabled"
        checked={sound.preferences.enabled} onChange={event => sound.update({ enabled: event.target.checked })} />
        <span className="toggle-track" aria-hidden="true" /></label>
    </div>
    <div className="setting-row sound-volume-row" data-sound="none">
      <label htmlFor="sound-volume">音效音量</label>
      <div className="sound-volume-controls">
        <input id="sound-volume" data-testid="sound-volume" type="range" min="0" max="100" step="1"
          aria-label="音效音量" aria-valuetext={`${percent}%`} value={percent} disabled={!sound.preferences.enabled}
          onChange={event => sound.update({ volume: Number(event.target.value) / 100 })} />
        <output htmlFor="sound-volume">{percent}%</output>
        <button type="button" className="text-link" data-testid="sound-test"
          disabled={!sound.preferences.enabled || sound.preferences.volume === 0} onClick={sound.preview}>试听</button>
      </div>
    </div>
    {sound.warning && <p className="sound-settings-warning" role="status">{sound.warning}</p>}
    {sound.saveError && <div className="notice notice-error sound-save-notice" role="alert" data-testid="sound-save-error">
      <p>{sound.saveError}</p><button type="button" className="button button-secondary button-small" data-testid="retry-sound-save" onClick={sound.retry}><span className="button-label">重试保存音效设置</span></button>
    </div>}
  </>;
}
