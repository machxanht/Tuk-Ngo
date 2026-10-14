import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const demo = new URLSearchParams(window.location.search).get('demo');
if (!demo || demo === '2d') {
  window.location.replace(new URL('assets/illustrated-v22/', window.location.href));
} else createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
