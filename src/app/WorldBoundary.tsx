import { Component, type ReactNode } from 'react';

/** Covers the outer lazy chunk, before WorldScreen's own runtime fallback can mount. */
export class WorldBoundary extends Component<{ children: ReactNode; gameWorldAvailable: boolean; onFallback?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="page empty-state" role="alert"><h1>探索世界暂未加载</h1>
      {this.props.gameWorldAvailable && <a className="button button-primary" href="#/themes">直接进入游戏世界</a>}
      {!this.props.gameWorldAvailable && this.props.onFallback && <button type="button" className="button button-primary" onClick={this.props.onFallback}>兼容游玩 · 纹样小游戏</button>}
      <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>重新加载</button>
    </div>;
  }
}
