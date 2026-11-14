import { Suspense } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';
import { nav } from './content';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { sectionComponents } from './sections';

const loadFeatures = () => import('./lib/motionFeatures').then((m) => m.default);

export default function App() {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <a className="skip-link" href="#about">
          Skip to content
        </a>
        <Nav />
        <main>
          <Hero />
          <Suspense fallback={null}>
            {nav.map(({ id }) => {
              if (id === 'home') return null;
              const Comp = sectionComponents[id];
              return <Comp key={id} />;
            })}
          </Suspense>
        </main>
      </MotionConfig>
    </LazyMotion>
  );
}
