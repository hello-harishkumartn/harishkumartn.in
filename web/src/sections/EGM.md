# Page Sections Component Package

## Overview
React page section components corresponding to the site navigation sections (About, Badminton, Contact, Education, Ideas, Markets, Social, Travel and Work), along with a shared EntryList component and section registry mapping.

## Interface
- `[sections/index.ts:sectionComponents]`: `Record<Exclude<SectionId, 'home'>, ComponentType>` - Map of section IDs to their corresponding React components
- `[sections/About.tsx:About]`: `() => JSX.Element` - Renders personal bio, profile image or placeholder and quick facts
- `[sections/Badminton.tsx:Badminton]`: `() => JSX.Element` - Renders badminton video cards supporting YouTube embed, MP4 video or placeholder
- `[sections/Contact.tsx:Contact]`: `() => JSX.Element` - Renders contact links and the site footer with copyright notice
- `[sections/Education.tsx:Education]`: `() => JSX.Element` - Renders education timeline cards and research aspiration highlight
- `[sections/EntryList.tsx:EntryList]`: `({ entries: Entry[] }) => JSX.Element` - Shared grid component rendering numbered cards for Ideas and Markets entries
- `[sections/Ideas.tsx:Ideas]`: `() => JSX.Element` - Renders thoughts, notes and essays via EntryList
- `[sections/Markets.tsx:Markets]`: `() => JSX.Element` - Renders market learning notes via EntryList alongside a disclaimer banner
- `[sections/Social.tsx:Social]`: `() => JSX.Element` - Renders social highlights with third-party iframe embeds or placeholder slots
- `[sections/Travel.tsx:Travel]`: `() => JSX.Element` - Renders travel photo stories with location tags or generated placeholder art
- `[sections/Work.tsx:Work]`: `() => JSX.Element` - Renders professional experience timeline with role descriptions and bulleted highlights

## Invariants
- `[sections/index.ts:sectionComponents]`: Must contain a ComponentType entry for every SectionId except 'home'
- `[sections/Badminton.tsx:VideoSlot]`: Prioritizes YouTube embed over MP4 video, and MP4 over placeholder slot when resolving video sources
- `[sections/Contact.tsx:Contact]`: External links starting with http are rendered with target='_blank' and rel='noreferrer'
- `[sections/EntryList.tsx:EntryList]`: Entry indices are 1-based and formatted as two-digit zero-padded strings ('01', '02', etc.)
- `[sections/EntryList.tsx:EntryList]`: Card title is wrapped in an anchor link only if entry.link is defined
- `[sections/Markets.tsx:Markets]`: Renders a non-financial advice disclaimer alert box (role='note') preceding entry learnings
- `[sections/Social.tsx:Social]`: External post links are rendered with target='_blank' and rel='noreferrer'
- `[sections/Travel.tsx:Travel]`: Renders PlaceholderArt with story palette and 1-based index seed when story.image is unset
- `[sections/Work.tsx:Work]`: Work item highlights list is rendered only when highlights array is non-empty

## Side Effects
- `[sections/Badminton.tsx:VideoSlot]`: Embeds external iframe from youtube-nocookie.com when youtubeId is provided
- `[sections/Contact.tsx:Contact]`: Evaluates client system clock via new Date().getFullYear() to render footer copyright year
- `[sections/Social.tsx:Social]`: Embeds external iframes from social platforms (Instagram, LinkedIn and X) when embedUrl is provided
- `[sections/About.tsx:About]`: Triggers browser media requests for profile image via media() utility
- `[sections/Travel.tsx:Travel]`: Triggers browser media requests for story images via media() utility

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
