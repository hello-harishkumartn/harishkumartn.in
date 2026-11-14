# UI Primitive Components Package

## Overview
Reusable primitive UI components styling buttons and animated text shimmers using Radix Slot and Framer Motion.

## Interface
- `[button.tsx:Button]`: React forward-ref button component supporting variants, sizes and Radix asChild slot delegation
- `[button.tsx:buttonVariants]`: Class Variance Authority (CVA) helper generating button classes based on variant and size options
- `[button.tsx:ButtonProps]`: Component props interface extending HTML button attributes and variant props
- `[text-shimmer.tsx:TextShimmer]`: Animated text shimmer component using Framer Motion
- `[text-shimmer.tsx:TextShimmerProps]`: Props interface for TextShimmer component specifying children, element type, duration and spread

## Invariants
- `[button.tsx:Button]`: When asChild is true, delegates rendering to Radix Slot; otherwise renders standard button
- `[text-shimmer.tsx:useReducedMotion]`: Disables shimmer keyframe animation when useReducedMotion is active
- `[text-shimmer.tsx:dynamicSpread]`: Calculates background spread size dynamically as children.length * spread

## Side Effects
- `[text-shimmer.tsx:TextShimmer]`: Executes continuous Framer Motion background-position CSS translation loop

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
