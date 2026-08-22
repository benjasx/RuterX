---
name: Corporate Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0d1c2f'
  on-tertiary-container: '#76859b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 16px
---

## Brand & Style
The design system is engineered for high-density information environments where clarity, reliability, and speed are paramount. The brand personality is "Modern Corporate"—it is authoritative without being stiff, and efficient without being cold. 

The aesthetic leverages a **Modern** approach, utilizing subtle tonal layering and refined typography to create a sense of professional calm. It prioritizes data legibility and functional hierarchy, ensuring that admin users can process complex statuses and metrics quickly on mobile devices. The visual language conveys trust through stability, using a structured grid and a disciplined color application.

## Colors
This design system utilizes a "Deep Sea" palette. The **Primary** color is a deep navy (Slate 900) used for high-level navigation, primary actions, and critical headings to establish authority. The **Secondary** color is a professional Teal, used for growth-oriented accents, active states, and focus indicators.

Neutral grays are pulled from the Slate and Blue-Gray scales to maintain a "cool" professional temperature. Backgrounds use a subtle off-white canvas to reduce glare, while cards and containers use pure white to pop forward. Status colors are saturated enough to be accessible but tuned to harmonize with the professional palette.

## Typography
The design system relies exclusively on **Inter** for its exceptional legibility and systematic weight distribution. 

- **Headlines:** Use tighter letter-spacing and heavier weights (600-700) to create a strong visual anchor.
- **Body Text:** Standardized at 14px (body-md) for mobile to ensure high information density without sacrificing readability.
- **Labels:** Used for metadata, timestamps, and overlines. `label-sm` should be used in uppercase for section headers or small badge text to provide a distinct stylistic break from body copy.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for narrow viewports. On mobile, the standard margin is 16px (md) to ensure content doesn't feel cramped against the screen edges.

The vertical rhythm is built on a 4px baseline, with most components utilizing 16px (md) padding for internal breathing room. Vertical spacing between logical sections (e.g., a chart and a list) should default to 24px (lg) to provide clear visual separation. Containers should utilize the full width of the screen minus margins, stacking vertically to accommodate the mobile scroll behavior.

## Elevation & Depth
Depth is communicated through **Tonal Layers** combined with **Ambient Shadows**. 

1. **Level 0 (Canvas):** The lowest layer (`#F8FAFC`).
2. **Level 1 (Card/Surface):** Pure white surfaces with a very soft, diffused shadow (Blur: 8px, Y: 2px, Opacity: 4% Black). This is the default state for most content modules.
3. **Level 2 (Interactive/Floating):** Used for modals or active dropdowns. These feature a more pronounced shadow (Blur: 16px, Y: 4px, Opacity: 8% Black) to indicate they are higher in the Z-index.

Avoid heavy borders; use subtle 1px outlines (`#E2E8F0`) to define boundaries when shadows are not sufficient.

## Shapes
The shape language is "Rounded," striking a balance between the precision of sharp corners and the approachability of circles. 

- **Small Components (Buttons, Inputs):** 8px (0.5rem) corner radius.
- **Large Components (Cards, Modals):** 12px-16px (0.75rem-1rem) corner radius.
- **Indicators (Status Badges, Chips):** Often utilize a fully "pill" shape (999px) to contrast against the more structural rectangular elements of the UI.

## Components
- **Buttons:** Primary buttons use the Primary (Navy) background with white text. Secondary buttons use a subtle gray fill or a teal outline. Ensure a minimum touch target of 44px.
- **Input Fields:** Use 8px rounded corners with a 1px border. On focus, the border shifts to Secondary (Teal) with a subtle 2px outer glow in the same color at 10% opacity.
- **Cards:** The primary container for mobile. Cards should feature 16px internal padding. Titles inside cards should use `headline-sm`.
- **Chips/Badges:** For status (e.g., "Active", "Pending"), use a "Soft Fill" style—a very light tint of the status color for the background (10% opacity) and the full-strength color for the text.
- **Lists:** Mobile lists should use subtle dividers (`border-muted`). Each item should have a 16px vertical padding to prevent accidental taps.
- **Data Tables (Mobile):** Transition to "Data Cards" where each row becomes a small card with labeled values to avoid horizontal scrolling.