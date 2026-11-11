import type { ButtonHTMLAttributes, Ref } from 'react';
import '../styles/dialog-chrome.css';

export interface DialogCloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  ref?: Ref<HTMLButtonElement>;
}

/** Plain vector cross avoids platform emoji styling; keyboard focus stays visible. */
export function DialogCloseButton({ label, className = '', ref, ...props }: DialogCloseButtonProps) {
  return <button {...props} ref={ref} type="button" className={`dialog-close ${className}`} aria-label={label}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  </button>;
}
