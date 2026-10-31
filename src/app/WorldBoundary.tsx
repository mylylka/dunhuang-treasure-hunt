import { Component, type ReactNode } from 'react';

/** Covers the outer lazy chunk, before WorldScreen's own runtime fallback can mount. */
export class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="page empty-state" role="alert"><h1>探索世界暂未加载</h1>
      <p>可以重新加载，或直接进入文化导览和小游戏。</p>
      <a className="button button-primary" href="#/themes">直接选择文化主题</a>
      <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>重新加载</button>
    </div>;
  }
}
