# Web Application Blueprint

## System Overview
Frontend source for the personal website of Harish Kumar T N ("The Court", badminton themed), built with Vite, React 19, TypeScript, Tailwind CSS and React Three Fiber (R3F).

## Local Interface & Invariants
- `[App.tsx:App]`: Root application component orchestrating LazyMotion, MotionConfig, skip-link, floating Nav, Hero stage and page sections
- `[main.tsx]`: Application bootstrap creating React root on `#root` element in StrictMode
- `[content.ts:site]`: Site configuration metadata including name, monogram, title and active 3D scene
- `[content.ts:nav]`: Array of navigation items establishing section rendering order
- `[content.ts:hero]`: Hero copy, rotating keywords, place name and hotspot definitions
- `[content.ts:SectionId]`: Union type of all valid section identifiers ('home' | 'about' | 'work' | 'education' | 'ideas' | 'markets' | 'badminton' | 'travel' | 'social' | 'contact')
- Invariants: `content.ts` serves as the sole source of truth for all textual content, navigation lists and hotspot bindings
- Invariants: Page order strictly follows the ordering of entries in `nav` within `content.ts`

## Subdirectories & System Boundaries
- Components: [./components/EGM.md](./components/EGM.md) - Navigation header, 3D hero stage, scroll chapters, focus dialogs and UI primitives
- Sections: [./sections/EGM.md](./sections/EGM.md) - Individual portfolio content sections (About, Work, Education, Ideas, Markets, Badminton, Travel, Social and Contact)
- Library: [./lib/EGM.md](./lib/EGM.md) - DOM utilities, media path resolution, scroll helpers, icon maps and device capability profiling
- Scenes: [./scenes/EGM.md](./scenes/EGM.md) - 3D Three.js/R3F scenes including The Court, Study Desk and shared camera/hotspot controllers

## Global Invariants
- Visual layout, color palette, typography and existing section IDs/hashes must be preserved
- `content.ts` remains the authoritative data source for text, media references and hotspot declarations
- Device profiling ('high' vs 'low' tier) governs DPR clamping, shadow quality, particle density and postprocessing passes

## Global Side Effects
- Reads and updates window scroll position, history state and URL hash fragments
- Persists user preferences in browser localStorage ('hk:3d-off' and 'hk:rally-best')
- Instantiates WebGL / Three.js rendering contexts and loads binary 3D assets

## System Verification
- Run: `npm run build` in `/workspace/site-egm/web`
