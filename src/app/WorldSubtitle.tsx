interface Props { text: string; onSkip(): void; testId?: string }
/** The spoken subtitle also provides a touch target for skipping. */
export function WorldSubtitle({text,onSkip,testId='world-subtitle'}:Props) {
  return <aside className={`world-subtitle${text.length > 96 ? ' world-subtitle-long' : ''}`} data-testid={testId} aria-live="polite"><p><button type="button" className="world-subtitle-skip" onClick={onSkip} aria-label={`${text}。点击跳过当前讲解`}>{text}</button></p></aside>;
}
