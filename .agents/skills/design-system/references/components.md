# Component Reference

Detailed HTML/CSS patterns for every component in the Architectural Minimalist design system.

**Color usage rule:** Primary (sage) and accent (terracotta) are strictly for interactive elements — buttons, links, active states, slider thumbs. They must never be used as background fills for headers, banners, cards, or page sections. All structural backgrounds use `bg-background` or `bg-surface`.

## Headers and Navigation

Headers and navbars always use a neutral background with a bottom border — never a colored fill.

```html
<!-- Top navigation bar -->
<header class="bg-background border-b border-border px-8 py-4">
  <div class="flex items-center justify-between">
    <h1 class="text-[26px] font-header font-medium text-text-main leading-tight">
      App Title
    </h1>
    <nav class="flex items-center gap-2">
      <!-- Use ghost buttons for nav links -->
      <button class="inline-flex items-center justify-center font-medium transition-all duration-200
        bg-transparent text-text-muted hover:text-primary hover:bg-primary/5 px-4 py-2 text-sm rounded-none">
        Nav Item
      </button>
      <!-- Icon buttons for actions -->
      <button class="p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover
        bg-transparent transition-all duration-200">
        <svg class="w-5 h-5">...</svg>
      </button>
    </nav>
  </div>
</header>
```

**Anti-pattern — never do this:**
```html
<!-- WRONG: colored header background -->
<header class="bg-primary text-white ...">
<header class="bg-accent text-white ...">
<header class="bg-green-600 text-white ...">
```

## Sidebar Header

The sidebar header contains the app name and a row of icon buttons (action buttons + collapse toggle). It uses generous padding and no bottom border — the first accordion section provides visual separation.

```html
<div class="flex-col items-stretch gap-4 p-8 border-none pb-0">
  <div class="flex justify-between items-start">
    <div>
      <h1 class="text-[26px] font-header font-medium text-text-main leading-tight mb-2">
        App Name
      </h1>
    </div>
    <div class="flex gap-1">
      <!-- Action icon buttons (optional: magic wand, reset, etc.) -->
      <button class="p-2.5 rounded-full text-primary bg-primary/10 hover:bg-primary/20 hover:text-primaryHover
        transition-all duration-200 focus:outline-none">
        <svg class="w-5 h-5"><!-- action icon --></svg>
      </button>
      <!-- Reset/clear button (disabled state when nothing to reset) -->
      <button class="p-2.5 rounded-full text-accent hover:bg-accent/5 hover:text-accentHover
        transition-all duration-200 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed">
        <svg class="w-5 h-5"><!-- reset icon --></svg>
      </button>
      <!-- Collapse sidebar button -->
      <button class="p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover
        bg-transparent transition-all duration-200 focus:outline-none">
        <svg class="w-5 h-5"><!-- minimize/collapse icon --></svg>
      </button>
    </div>
  </div>
</div>
```

The app name uses `font-header` (Tenor Sans) at 26px — this is the largest text in the UI. Icon buttons in the header row use `rounded-full` with subtle tinted backgrounds for primary actions (`bg-primary/10`) and accent actions (`hover:bg-accent/5`).

## Buttons

All buttons share a common base:

```
inline-flex items-center justify-center font-medium transition-all duration-200
focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
disabled:opacity-50 disabled:cursor-not-allowed
```

**Primary Button:**
```html
<button class="inline-flex items-center justify-center font-medium transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
  disabled:opacity-50 disabled:cursor-not-allowed
  bg-primary text-white hover:bg-primaryHover shadow-sm px-6 py-2.5 text-base rounded-none">
  Save Changes
</button>
```

**Secondary Button:**
```html
<button class="... bg-surface border border-border text-text-main hover:bg-secondaryHover shadow-sm px-6 py-2.5 text-base rounded-none">
  Cancel
</button>
```

**Accent Button (Call-to-Action):**
```html
<button class="... bg-accent text-white hover:bg-accentHover shadow-sm px-6 py-2.5 text-base rounded-none">
  Get Started
</button>
```

**Ghost Button:**
```html
<button class="... bg-transparent text-text-muted hover:text-primary hover:bg-primary/5 px-4 py-2 text-base rounded-none">
  More Options
</button>
```

**Icon Button (Exception — uses rounded-full):**
```html
<button class="p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover bg-transparent
  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
  disabled:opacity-50 disabled:cursor-not-allowed">
  <svg class="w-5 h-5">...</svg>
</button>
```

## Dark Mode Toggle

A circular floating action button that switches between light and dark mode. Positioned in the main content area's top-right corner alongside other floating action buttons.

```html
<!-- Day mode: sun icon -->
<button class="inline-flex items-center justify-center font-medium transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
  bg-surface border border-border text-text-main hover:bg-secondaryHover
  shadow-lg w-12 h-12 !p-0 rounded-full hover:scale-105 transition-transform"
  title="Switch to Dark Mode">
  <svg class="w-5 h-5 text-amber-500 fill-current"><!-- Sun icon --></svg>
</button>

<!-- Night mode: moon icon -->
<button class="... shadow-lg w-12 h-12 !p-0 rounded-full hover:scale-105 transition-transform"
  title="Switch to Light Mode">
  <svg class="w-5 h-5 text-indigo-400 fill-current"><!-- Moon icon --></svg>
</button>
```

The sun icon uses `text-amber-500 fill-current` and the moon icon uses `text-indigo-400 fill-current`. These are the only non-design-system colors allowed — they serve as universal signifiers for day/night.

## Floating Action Buttons

Circular buttons positioned absolutely in the main content area for global toggles (day/night mode, feature switches). Always grouped in the top-right corner.

```html
<!-- Container: top-right of main content -->
<div class="absolute top-4 right-4 z-10 flex gap-2">
  <!-- Feature toggle (e.g., lights on/off) -->
  <button class="inline-flex items-center justify-center font-medium transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
    bg-surface border border-border text-text-main hover:bg-secondaryHover
    shadow-lg w-12 h-12 !p-0 rounded-full hover:scale-105 transition-transform"
    title="Toggle feature">
    <svg class="w-5 h-5 text-text-muted"><!-- feature icon --></svg>
  </button>
  <!-- Active state: tinted background to indicate "on" -->
  <button class="... shadow-lg w-12 h-12 !p-0 rounded-full
    bg-amber-100 dark:bg-amber-900/30 border-amber-500/50"
    title="Feature is on">
    <svg class="w-5 h-5 text-amber-500 fill-amber-500"><!-- feature icon --></svg>
  </button>
  <!-- Day/Night toggle -->
  <button class="... shadow-lg w-12 h-12 !p-0 rounded-full hover:scale-105 transition-transform">
    <svg class="w-5 h-5"><!-- sun or moon --></svg>
  </button>
</div>
```

Active floating action buttons use a tinted background matching the icon color (e.g., `bg-amber-100 dark:bg-amber-900/30 border-amber-500/50` for a warm toggle). Inactive buttons use the default `bg-surface border border-border`.

## Sidebar Expand Button

When the sidebar is collapsed, a circular floating button appears in the main content area (top-left) to restore it:

```html
<!-- Only visible when sidebar is collapsed -->
<button class="absolute top-4 left-4 z-10
  inline-flex items-center justify-center font-medium transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
  bg-surface border border-border text-text-main hover:bg-secondaryHover
  shadow-lg !p-3 rounded-full">
  <svg class="w-5 h-5"><!-- expand/maximize icon --></svg>
</button>
```

## Inputs

All text inputs, number inputs, selects, and textareas use sharp corners, a subtle border, and a primary-colored focus ring:

```html
<input class="w-full px-3 py-2 bg-surface border border-border rounded-none text-base text-text-main shadow-sm
  placeholder-text-light
  focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:border-primary
  transition-all duration-200" />
```

**Number input with unit suffix:**

Wrap the input in a relative container and position the suffix absolutely:

```html
<div class="relative">
  <input type="number" class="w-full font-mono text-base py-2 pr-8 px-3 bg-surface border border-border rounded-none text-text-main shadow-sm
    focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:border-primary transition-all duration-200" />
  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm pointer-events-none select-none">
    in
  </span>
</div>
```

Number inputs use `font-mono` for tabular alignment of digits.

## Toggle Groups (Segmented Controls)

A segmented control where the active item is elevated on a surface background:

```html
<div class="flex bg-secondary/50 rounded-none p-1 gap-1 border border-border">
  <!-- Active option -->
  <button class="flex-1 py-2 px-3 text-[14px] font-medium transition-all duration-200
    focus:outline-none focus:ring-1 focus:ring-primary/20
    bg-surface text-text-main shadow-sm border border-black/5">
    Active
  </button>
  <!-- Inactive option -->
  <button class="flex-1 py-2 px-3 text-[14px] font-medium transition-all duration-200
    focus:outline-none focus:ring-1 focus:ring-primary/20
    text-text-muted hover:text-text-main hover:bg-surface/50 border border-transparent">
    Inactive
  </button>
</div>
```

## Sliders (Range Inputs)

Style range inputs with the terracotta accent thumb. Must include both WebKit and Mozilla vendor styles.

Key detail: the thumb border uses `var(--c-surface)` (not hardcoded white) so it adapts to dark mode.

```css
input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
}

/* --- Track --- */
input[type=range]::-webkit-slider-runnable-track {
  height: 2px;
  background: var(--c-border);
  border-radius: 1px;
}

input[type=range]::-moz-range-track {
  height: 2px;
  background: var(--c-border);
  border-radius: 1px;
}

/* --- Thumb --- */
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 16px;
  width: 16px;
  background-color: var(--c-accent);
  border-radius: 50%;
  margin-top: -7px;
  border: 2px solid var(--c-surface);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.1s ease, background-color 0.2s, border-color 0.3s;
}

input[type=range]::-moz-range-thumb {
  border: 2px solid var(--c-surface);
  height: 16px;
  width: 16px;
  background-color: var(--c-accent);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.1s ease, background-color 0.2s, border-color 0.3s;
}

/* --- Hover --- */
input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  background-color: var(--c-accent-hover);
}

input[type=range]::-moz-range-thumb:hover {
  transform: scale(1.1);
  background-color: var(--c-accent-hover);
}

/* --- Focus --- */
input[type=range]:focus {
  outline: none;
}

input[type=range]:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px rgba(198, 125, 99, 0.3);
}

input[type=range]:focus::-moz-range-thumb {
  box-shadow: 0 0 0 2px rgba(198, 125, 99, 0.3);
}
```

## Cards and Containers

Cards use sharp corners, a surface background, and thin borders — never shadows for structure:

```html
<div class="bg-surface border border-border rounded-none p-4">
  <!-- Card content -->
</div>
```

**Anti-pattern — never do this:**
```html
<!-- WRONG: rounded corners and shadow-based structure -->
<div class="bg-white rounded-lg shadow-md p-4">
<!-- WRONG: colored card background -->
<div class="bg-primary/10 rounded-xl shadow-sm p-4">
```

## Computed Value Display

For read-only calculated values or summary stats:

```html
<div class="p-3 bg-secondary/30 rounded border border-border">
  <div class="flex justify-between items-center">
    <span class="text-xs font-bold text-text-muted uppercase tracking-wider">Label</span>
    <span class="font-mono font-medium text-text-main">42.5"</span>
  </div>
</div>
```

## Control Input (Combined Input + Slider)

The signature compound control of this design system. A labeled number input paired with a synchronized range slider, optional unit suffix, tip text, and an optional action button.

Interaction: the label changes from `text-text-muted` to `text-primary` on group hover, providing a subtle focus cue.

```html
<div class="mb-5 group">
  <!-- Label row with optional action -->
  <div class="flex justify-between items-baseline mb-1">
    <label class="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] group-hover:text-primary transition-colors cursor-help">
      Field Label
    </label>
    <!-- Optional action button -->
    <button class="text-accent hover:text-accentHover text-[10px] font-bold uppercase tracking-widest px-1.5 py-1 rounded-sm hover:bg-accent/5 transition-colors">
      Action
    </button>
  </div>

  <!-- Number input with suffix -->
  <div class="mb-3 relative">
    <input type="number" class="w-full font-mono text-base py-2 pr-8 px-3 bg-surface border border-border rounded-none text-text-main shadow-sm
      focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:border-primary transition-all duration-200" />
    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm pointer-events-none select-none">in</span>
  </div>

  <!-- Synchronized slider -->
  <div class="mb-2">
    <input type="range" class="w-full cursor-pointer accent-accent h-6" />
  </div>

  <!-- Optional tip text -->
  <p class="text-sm text-text-light leading-snug mt-2 min-h-[48px]">
    Helpful tip or guidance text here.
  </p>
</div>
```

**Key details:**
- The number input uses `font-mono` for tabular digit alignment and `pr-8` to leave space for the right-justified unit suffix.
- The unit suffix (`in`, `px`, `%`, etc.) is absolutely positioned inside the input: `absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm pointer-events-none select-none`.
- The slider sits directly below the input with `mb-2` spacing, creating a compact compound control.
- Tip text uses `text-sm text-text-light` (lighter than helper text) with `min-h-[48px]` to prevent layout shift.
- For grid layouts (e.g., two inputs side by side), wrap in `grid grid-cols-2 gap-4`.

## Tip and Helper Text

Two levels of informational text used below controls:

**Tip text** (below Control Input sliders) — lighter, more guidance-oriented:
```html
<p class="text-sm text-text-light leading-snug mt-2 min-h-[48px]">
  Standard residential ceilings are 96 inches (8 ft).
</p>
```

**Helper text** (below toggle groups, computed values) — slightly darker, more compact:
```html
<p class="text-[12px] text-text-muted mt-2 leading-relaxed">
  Sheer / Light Filtering
</p>
```

**Inline value display** (next to a label, showing current value):
```html
<div class="flex justify-between items-baseline mb-1">
  <label class="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">Light Blocking</label>
  <span class="text-xs text-text-muted font-medium">40%</span>
</div>
```
