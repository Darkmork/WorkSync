---
name: Ventana Común
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#424754'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#0060ac'
  on-secondary: '#ffffff'
  secondary-container: '#64a8fe'
  on-secondary-container: '#003c70'
  tertiary: '#006b2c'
  on-tertiary: '#ffffff'
  tertiary-container: '#00873a'
  on-tertiary-container: '#f7fff2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  status-free: '#4ade80'
  status-occupied: '#9ca3af'
  status-preferred: '#60a5fa'
  status-avoid: '#fde047'
  error-red: '#dc2626'
  border-subtle: '#e5e7eb'
  text-secondary: '#6b7280'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  grid-time:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1'
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  grid-gap: 1px
  element-gap: 12px
  section-padding: 32px
  mobile-margin: 16px
---

## Brand & Style

The design system is built on a **Modern Corporate** foundation that balances high-productivity utility with an approachable, student-friendly personality. It moves away from rigid enterprise aesthetics in favor of a "Productive but Human" atmosphere. 

The brand evokes **Coordination and Trust** through a vibrant blue primary palette, while maintaining a clean, high-air layout that reduces the cognitive load of dense scheduling data.

**Key Visual Principles:**
- **Clarity over Decoration:** Every element serves a functional purpose in the decision-making process.
- **Dynamic Friendliness:** Softened by generous rounded corners and subtle depth, avoiding the coldness of sharp-edged professional tools.
- **Data Accessibility:** Using color as a primary language for availability states, ensuring users can "read" a group grid at a glance.
- **Agile Movement:** Micro-interactions should feel snappy and responsive, reinforcing the idea of finding the "perfect window" in just one click.

## Colors

The palette is anchored by **Vibrant Blue**, symbolizing coordination and professional reliability. The system uses a functional color-coding strategy to communicate time-block status without text.

- **Primary & Secondary:** Used for high-emphasis actions, navigation, and brand-related UI components.
- **Status Colors:** These are semantically reserved for the schedule grid. **Green** indicates freedom, **Gray** represents occupation, **Light Blue** denotes preferred slots, and **Soft Yellow/Orange** warns against specific times.
- **Backgrounds:** Use near-white neutrals (`#f9fafb`) to provide "breathing room" between dense data points. 
- **Borders:** Subtle grays create structure without adding visual noise, essential for the high-density 7-day grid view.

## Typography

This design system utilizes **Hanken Grotesk** for its clean, contemporary, and professional appearance. It offers excellent legibility at various weights, which is crucial for distinguishing between primary headings and supporting metadata.

For technical data—specifically time labels and grid coordinates—**JetBrains Mono** is introduced. This monospaced font ensures that numerical data aligns perfectly and provides a slight "technical/tool" feel that fits the productive nature of the app.

**Scale Strategy:**
- Use **Bold** weights for page titles to establish clear hierarchy.
- **Regular** weights for body copy to maintain an approachable feel.
- **Monospaced Labels** are used for Y-axis (hours) and X-axis (days) labels in the grid to provide a distinct visual "category" for data-heavy elements.

## Layout & Spacing

The layout is based on a **Fluid Grid** model with a consistent 4px rhythm. 

- **The Main Schedule Grid:** This is the core component. It uses a fixed-header, fluid-body 8-column layout (1 for time labels, 7 for days). A `1px` gap is used for grid lines to create a crisp, high-density look that maximizes screen real estate.
- **Desktop:** A maximum container width of 1200px is recommended for readability, with 24px margins.
- **Mobile:** The layout reflows to prioritize the current day or a condensed 3-day view. Margins tighten to 16px.
- **Spacing Units:** Spacing between cards and form elements follows a 12px or 16px pattern to maintain a sense of "air" and prevent the UI from feeling cramped.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Ambient Shadows** to create a sense of hierarchy. 

- **Surface 0 (Background):** Solid neutral white/gray.
- **Surface 1 (Cards/Containers):** Raised slightly with a very soft, diffused shadow (Blur: 10px, Opacity: 4%, Tinted with the primary blue) to distinguish content from the background.
- **Surface 2 (Popovers/Modals):** High-diffusion shadows with a subtle border (`1px solid #e5e7eb`) to indicate the highest level of priority.
- **Interactive States:** On hover, buttons and grid cells should shift color saturation or use a subtle `0.5rem` lift rather than heavy outlines.

## Shapes

The shape language is **Rounded**, using a 0.5rem (8px) base radius. This softens the technical nature of the grid and makes the app feel more inviting for students.

- **Buttons & Inputs:** Follow the base 8px roundedness.
- **Status Blocks:** In the schedule grid, blocks use a slightly smaller radius (4px) to ensure they fit tightly within the grid layout while remaining soft.
- **Avatars:** Fully circular (pill-shaped) to distinguish human elements from functional UI blocks.

## Components

**Buttons:**
- **Primary:** Solid Vibrant Blue with white text. 8px roundedness. Subtle scaling effect on click (98%).
- **Status Toggles:** Ghost-style buttons that fill with the corresponding status color (Green/Yellow/Blue) when active.

**Schedule Grid Cells:**
- Interactive blocks that respond to click/drag. 
- Use semi-transparent variants of the status colors for "unconfirmed" states.
- Hover states should show a 1px primary blue border to indicate focus.

**Cards:**
- White background, 16px padding, 8px roundedness.
- Use for Group summaries and "Best Window" recommendations.

**Recommendations (The "Hero" Component):**
- A special high-emphasis card with a subtle blue gradient border.
- Includes a "Justification" badge (e.g., "90% Available") using the **label-sm** typography.

**Inputs:**
- Minimalist 1px gray border that transitions to blue on focus. 
- Use the **body-md** size for all form text.

**Chips:**
- Small pill-shaped indicators for group members. Each member can be assigned a subtle color tint for easy identification in the group grid.