# Landing Page Implementation Plan

## Overview

Create a compelling landing page for **Nexus** - an organizational hierarchy visualization tool. The landing page will serve as the entry point, communicating value before users enter the application.

## Key Messages

1. **Hero Statement:** "No more wasting time on useless meetings"
2. **Value Proposition:** Streamlined decisions - focus only on what concerns you
3. **Call-to-Action:** Create your company structure from scratch

---

## Implementation Approach

### 1. Routing Changes

**File:** `src/App.tsx`

- Change `/` route to render `LandingPage`
- Add new route `/app` for the main `NexusApp`
- Keep `/404` for NotFound page

### 2. New Landing Page Component

**File:** `src/pages/LandingPage.tsx`

**Structure:**
```
<LandingPage>
  <Hero>
    - Striking headline
    - Supporting subtext
    - Primary CTA button
  </Hero>

  <ValueProposition>
    - 3 key benefits (icons + text)
    - Focus on meetings, decisions, clarity
  </ValueProposition>

  <VisualPreview>
    - Screenshot or illustration of the orbital view
    - Animated or static mockup
  </VisualPreview>

  <Footer>
    - Simple footer with link to app
  </Footer>
</LandingPage>
```

### 3. Design Specifications

**Color Scheme:** Use existing dark theme
- Background: Very dark navy (`hsl(240 6% 4%)`)
- Primary accent: Gold (`hsl(43 55% 54%)`)
- Text: Off-white (`hsl(40 33% 97%)`)

**Typography:**
- Hero headline: Large, bold (text-5xl to text-7xl)
- Subtext: Medium, muted (text-xl to text-2xl)
- Use existing Tailwind utilities

**Layout:**
- Full-screen hero section
- Centered content
- Responsive (mobile-first)

### 4. Content Copy

**Hero Section:**
- Headline: "No more wasting time on useless meetings"
- Subtext: "Nexus streamlines decisions so you can focus only on what truly concerns you. Clear hierarchies. Direct communication. Zero noise."

**Value Props (3 columns):**
1. **Visual Clarity** - See your entire organization at a glance with orbital and grid views
2. **Smart Connections** - Define who needs to talk to whom. No more "reply-all" culture
3. **Start Fresh** - Build your company structure from zero or iterate on existing teams

**CTA Buttons:**
- Primary: "Create Your Structure" → `/app` (starts fresh)
- Secondary: "Explore Demo" → `/app` (loads with seed data)

### 5. Components to Create

| Component | Purpose |
|-----------|---------|
| `LandingPage.tsx` | Main landing page |
| `Hero.tsx` | Hero section with headline and CTA |
| `ValueProps.tsx` | Three-column value proposition |
| `LandingFooter.tsx` | Simple footer |

### 6. Reusable UI Components

Use existing shadcn-ui components:
- `Button` - CTA buttons
- `Card` - Value proposition cards (optional)
- Icons from `lucide-react`:
  - `Orbit` - Visual clarity
  - `Link2` - Smart connections
  - `Plus` - Start fresh
  - `ArrowRight` - CTA indicator

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/App.tsx` | Modify routing |
| `src/pages/LandingPage.tsx` | Create new file |
| `src/components/landing/Hero.tsx` | Create new file |
| `src/components/landing/ValueProps.tsx` | Create new file |
| `src/components/landing/index.ts` | Create barrel export |

---

## Implementation Steps

1. **Create landing components folder:** `src/components/landing/`
2. **Create Hero component** with headline, subtext, and CTA buttons
3. **Create ValueProps component** with 3-column benefits grid
4. **Create LandingPage** combining all sections
5. **Update App.tsx** with new routing structure
6. **Test responsive design** on mobile and desktop
7. **Verify navigation** between landing and app works

---

## Visual Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              NO MORE WASTING TIME ON                    │
│              USELESS MEETINGS                           │
│                                                         │
│     Nexus streamlines decisions so you can focus        │
│           only on what truly concerns you.              │
│                                                         │
│      [Create Your Structure]  [Explore Demo]            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐          │
│   │  Icon   │     │  Icon   │     │  Icon   │          │
│   │ Visual  │     │ Smart   │     │ Start   │          │
│   │ Clarity │     │Connect. │     │ Fresh   │          │
│   └─────────┘     └─────────┘     └─────────┘          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│               [Optional: Preview Image]                 │
└─────────────────────────────────────────────────────────┘
```

---

## Questions for User

1. **Branding:** Should I use "Nexus" as the product name or something else?
2. **Demo vs Fresh:** Should "Explore Demo" show seed data, or should both CTAs start fresh?
3. **Animation:** Add entrance animations (fade-in, slide-up) to the landing page?
4. **Preview Image:** Include a preview/screenshot of the orbital view, or keep it minimal?