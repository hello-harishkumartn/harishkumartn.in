# Utility Library Component Package

## Overview
Utility library providing DOM helpers, icon mappings, Framer Motion dynamic feature sets, media path resolution, device and performance profiling and section scrolling for the portfolio web application.

## Interface
- `[icons.ts:hotspotIcons]`: `Record<string, LucideIcon>` mapping scene hotspot IDs (court and study desk) to SVG icon components
- `[media.ts:media]`: `(path: string) => string` resolving relative /public asset paths with Vite BASE_URL or preserving external URLs
- `[motionFeatures.ts:default]`: `domMax` Framer Motion feature bundle exported dynamically for LazyMotion strict mode
- `[scroll.ts:scrollToSection]`: `(id: SectionId, smooth?: boolean) => void` scrolling to DOM element by ID and updating window.history state
- `[useDevice.ts:hasWebGL]`: `() => boolean` detecting WebGL/WebGL2 context availability on canvas
- `[useDevice.ts:saveData]`: `boolean` flag indicating whether Client Data Saver / navigator.connection.saveData is enabled
- `[useDevice.ts:useDeviceProfile]`: `() => DeviceProfile` React hook evaluating reducedMotion and tier ('high' | 'low') based on media queries, hardware concurrency, device memory or ?tier query parameter
- `[useDevice.ts:Tier]`: `'high' | 'low'` union type for device performance classification
- `[useDevice.ts:DeviceProfile]`: `{ reducedMotion: boolean, tier: Tier }` device capability interface
- `[utils.ts:cn]`: `(...inputs: ClassValue[]) => string` Tailwind CSS class merge helper composing clsx with twMerge

## Invariants
- `[media.ts:media]`: External URLs matching ^(https?:)?// are returned unchanged; root-relative paths have leading slashes stripped and prefixed with BASE_URL
- `[scroll.ts:scrollToSection]`: Does nothing if element with id does not exist; updates location hash to #id unless id is 'home', which sets pathname
- `[useDevice.ts:useDeviceProfile]`: ?tier URL parameter ('low' or 'high') overrides media query and hardware detection
- `[useDevice.ts:useDeviceProfile]`: Tier evaluates to 'low' if screen width <= 720px, pointer is coarse, hardwareConcurrency <= 4 or deviceMemory <= 4
- `[useDevice.ts:hasWebGL]`: Returns false if canvas creation or context retrieval throws an exception or fails

## Side Effects
- `[scroll.ts:scrollToSection]`: Invokes Element.scrollIntoView and updates browser history via history.replaceState
- `[useDevice.ts:useDeviceProfile]`: Subscribes to matchMedia change event listeners on window; cleans up on unmount
- `[useDevice.ts:hasWebGL]`: Temporarily creates an HTML5 canvas element in DOM memory to probe WebGL/WebGL2 support

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
