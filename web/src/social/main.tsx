import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SocialPage } from './SocialPage';
import '../styles.css';

// Entry for /social/. Must not import the Hero or the scene registry, so three.js stays out of this page.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocialPage />
  </StrictMode>,
);
