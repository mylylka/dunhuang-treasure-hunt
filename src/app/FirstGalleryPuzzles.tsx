import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import { soundPlayer } from '../services/sound';
import {
  FIRST_GALLERY_MURAL_ROUNDS, FIRST_GALLERY_MURAL_TEXTURES, MURAL_ROUNDS, muralRoundArt,
  nextMuralRound, type MuralRoundId,
} from '../world/first-gallery-puzzles';
import { DialogCloseButton } from './DialogCloseButton';
import '../styles/first-gallery-puzzles.css';

type PuzzleProps = {
  onClose(): void;
  reducedMotion?: boolean;
  blocked?: boolean;
};
type PuzzleFrameProps = PuzzleProps & {
  kind: 'mural';
  title: string;
  kicker: string;
  children: ReactNode;
};

function PuzzleFrame({ onClose, reducedMotion, blocked, kind, title, kicker, children }: PuzzleFrameProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node || blocked) return;
    const previous = document.activeElement;
    if (!node.open) node.showModal();
    close.current?.focus({ preventScroll: true });
    return () => {
      if (node.open) node.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [blocked]);

  return <dialog ref={dialog} className={`first-gallery-puzzle first-gallery-puzzle--${kind}`}
    data-testid={`first-gallery-${kind}-puzzle`} data-reduced-motion={reducedMotion || undefined}
    aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="first-gallery-puzzle-content">
      <header className="first-gallery-puzzle-heading">
        <div><p>{kicker}</p><h2 id={id}>{title}</h2></div>
        <DialogCloseButton ref={close} label="退出并回到场景" onClick={onClose} />
      </header>
      {children}
    </div>
  </dialog>;
}

function retryAsset(path: string, attempt: number) {
  const url = worldAssetUrl(path);
  return attempt ? `${url}?attempt=${attempt}` : url;
}

export type FirstGalleryMuralPuzzleProps = PuzzleProps & {
  completed: readonly string[];
  requestedRound?: MuralRoundId;
  onRepair(round: MuralRoundId): boolean | Promise<boolean>;
  replay?: boolean;
};

export function FirstGalleryMuralPuzzle({
  completed, requestedRound, onRepair, replay = false, ...frame
}: FirstGalleryMuralPuzzleProps) {
  const [round] = useState(() => {
    if (replay) return requestedRound ?? MURAL_ROUNDS[0];
    const next = nextMuralRound(completed);
    return requestedRound === undefined || requestedRound === next ? next : null;
  });
  const [selected, setSelected] = useState<number>();
  const [status, setStatus] = useState('');
  const [hinted, setHinted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const allRestored = nextMuralRound(completed) === null;
  const roundInfo = round ? FIRST_GALLERY_MURAL_ROUNDS[round] : undefined;
  const art = round ? muralRoundArt(round) : undefined;

  async function place() {
    if (!roundInfo || !round || selected === undefined || pending.current || solved || frame.blocked || failed) return;
    if (selected !== roundInfo.correctPiece) {
      setStatus('这片纹样还接不上，再看看缺口两边。');
      soundPlayer.play('error');
      return;
    }
    pending.current = true;
    setSaving(true);
    let saved = false;
    try {
      saved = await onRepair(round);
    } catch {
      // Remain in the puzzle with the selected piece so the player can retry.
    } finally {
      setSaving(false);
      pending.current = false;
    }
    if (!saved) {
      setStatus('暂时无法保存修补。可以再试一次。');
      return;
    }
    soundPlayer.play(round === 'grapes' ? 'complete' : 'success');
    setStatus('');
    setSolved(true);
  }

  return <PuzzleFrame {...frame} kind="mural" kicker={round
    ? `借物补画 · ${MURAL_ROUNDS.indexOf(round) + 1} / 3` : '借物补画'}
    title={roundInfo?.title ?? (allRestored ? '壁画已经复原' : '继续观察壁画')}>
    {failed ? <div className="first-gallery-puzzle-error" role="alert">
      <p>壁画图片暂时未能载入。</p>
      <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>重新载入</button>
    </div> : roundInfo && art && round && !solved ? (
      <div className={`first-gallery-mural-layout first-gallery-mural-layout--${round}`}>
        <figure className="first-gallery-mural-board">
          <img key={attempt} src={retryAsset(art.board, attempt)} width={roundInfo.width} height={roundInfo.height}
            alt={round === 'lotus' ? '中心莲花，最上方缺一片花瓣' : round === 'bird'
              ? '左侧鸟纹脱落，右侧保留一只朝左的鸟' : '右下方葡萄与卷叶，果实上方的藤蔓中间缺一段'}
            draggable={false} onError={() => setFailed(true)} />
        </figure>
        <div className="first-gallery-puzzle-controls">
          <p>{roundInfo.prompt}</p>
          <div className="first-gallery-mural-pieces" role="group" aria-label="选择纹样片段">
            {art.pieces.map(piece => <button key={`${piece.id}-${attempt}`} type="button" aria-pressed={selected === piece.id}
              aria-label={`片段 ${piece.id}，${piece.label}`} data-piece-id={piece.id} disabled={saving}
              onClick={() => { setSelected(piece.id); setStatus(''); }}>
              <img src={retryAsset(piece.path, attempt)} alt="" draggable={false} onError={() => setFailed(true)} />
              <span aria-hidden="true">{piece.id}</span>
            </button>)}
          </div>
          <div className="first-gallery-puzzle-actions">
            <button type="button" onClick={() => setHinted(true)}>看一点提示</button>
            <button type="button" className="first-gallery-puzzle-primary" disabled={selected === undefined || saving}
              onClick={() => void place()}>{saving ? '正在保存…' : '放到缺口'}</button>
          </div>
          <p className="first-gallery-puzzle-status" role="status">{status || (hinted ? roundInfo.hint : '')}</p>
        </div>
      </div>
    ) : <div className="first-gallery-puzzle-outcome">
      {(allRestored || (solved && round === 'grapes')) && <img src={retryAsset(FIRST_GALLERY_MURAL_TEXTURES.full, attempt)}
        alt="复原后的完整壁画" draggable={false} onError={() => setFailed(true)} />}
      {solved && <strong role="status">{round === 'grapes' ? '壁画修复完成' : '这处纹样复原了'}</strong>}
      <p>{solved ? roundInfo?.note : allRestored
        ? '这幅壁画已收录在观察手记中。' : '先在桌上寻找与这处残纹相似的实物。'}</p>
      {solved && round === 'grapes' && <p>花、鸟和果实经过提炼，再以重复、连续或对称的方式组成整幅装饰。</p>}
      <button type="button" className="first-gallery-puzzle-primary" onClick={frame.onClose}>回到大厅</button>
    </div>}
  </PuzzleFrame>;
}
