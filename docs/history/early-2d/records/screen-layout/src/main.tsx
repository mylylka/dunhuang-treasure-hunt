import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { loadCatalog } from './content';
import './styles/theme.css';

const root = createRoot(document.getElementById('root')!);

try {
  const catalog = loadCatalog();
  root.render(<StrictMode><App catalog={catalog} /></StrictMode>);
} catch (error) {
  root.render(
    <main className="configuration-error">
      <p className="eyebrow">敦煌寻宝记 · 内容检查</p>
      <h1>关卡内容暂时无法打开</h1>
      <p>配置或素材索引存在问题，请修正后重新打开。</p>
      <pre>{error instanceof Error ? error.message : String(error)}</pre>
      <button className="button button-primary" onClick={() => window.location.reload()}>重新检查</button>
    </main>,
  );
}
