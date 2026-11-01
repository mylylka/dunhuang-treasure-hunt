interface Props { text: string; onSkip(): void; testId?: string }
/** Spoken words only. The ordinary parenthetical text is also a touch target. */
export function WorldSubtitle({text,onSkip,testId='world-subtitle'}:Props) {
  return <aside className="world-subtitle" data-testid={testId} aria-live="polite"><p>{text}<button type="button" className="world-subtitle-skip" onClick={onSkip}>（摁空格跳过）</button></p></aside>;
}
