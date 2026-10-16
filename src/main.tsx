import {lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

const demo = new URLSearchParams(window.location.search).get('demo');
const isAssetView = !demo || ['2d', 'art', 'race'].includes(demo);
const View = isAssetView
  ? lazy(() => import('./components/ArtPreview').then(m => ({default: m.ArtPreview})))
  : lazy(() => import('./App'));
createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<p role="status">Đang mở ghe 3D…</p>}><View /></Suspense>,
);
