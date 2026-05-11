# Design System

## Overview
Token Quips adds immersion to online TTRPGs by letting tokens automatically speak, play audio, or roll on tables in response to in-game actions. Its UI is a set of **ApplicationV2** windows that open inside FoundryVTT — not a standalone app. The design language is therefore grounded in Foundry's native conventions, with module-specific additions layered on top.

## UI Architecture

Two primary windows, both extending `HandlebarsApplicationMixin(ApplicationV2)`:

**TokenSaysSettingsConfig** (`say-list-form.js` / `templates/says-form.hbs`)
The main management panel. Lists all sayings for the current user (GMs see everyone's; players see only their own). Contains search/filter, active toggles, CRUD controls, drag-and-drop reordering, and GM-only JSON export/import.

**TokenSaysSayForm** (`say-form.js` / `templates/say-form.hbs`)
The detail editor for a single saying. Uses a 5-tab layout: Basics, Reacts, Chat, Audio, Trigger. The Reacts tab is hidden unless the saying's `documentType` is set to `reacts`.

**Integration points** outside these windows:
- Token Config header button — V12 via `token-form.js` (extends `TokenConfig`); V13+ via `header-controls.js` (`getHeaderControls` hook)
- Chat output — `.token-quips.chat-window` renders token image + spoken text inline in the Foundry chat log

## Fonts

Foundry's built-in typefaces are used throughout; do not introduce external fonts.

- **Section headers / column headers**: `"Modesto Condensed", "Palatino Linotype", serif` — bold, 16px, `#7a7971`
- **List rows / body text**: `"Signika", sans-serif` — 14px
- **Tooltip hints** (`.toolt`): 10px, `#9e9e9e`, inline next to label

## Colors

Token Quips inherits Foundry's earthy, parchment-adjacent palette. These are the specific values in use:

- **Muted UI chrome** (`#7a7971`): column header text, row control icons
- **Row divider** (`#c9c7b8`): 1px border-bottom on each list row
- **Groove border** (`#eeede0`): 2px groove border on the list header bar
- **Alternate row tint** (`rgba(255,255,255,0.3)`): every even row in the rules list
- **Header background** (`rgba(0,0,0,0.05)`): the column header bar above the list
- **Reacts section background** (`rgba(0,0,0,0.1)`): inset background on the Reacts tab block
- **Alert background** (`rgba(245,209,7,0.411)`): yellow tint for inline validation warnings
- **Warning text** (`#FF0000`): `.warning` class, used inside alert boxes
- **Tooltip text** (`#9e9e9e`): `.toolt` helper text

## Components

### Rules List
Flexrow rows inside an `<ol class="rules-list">`. Each row (`li.rule`) contains:
- **Label** (65% of name column) + **Token name** (35%) — both truncated with `text-overflow: ellipsis`
- **Type icons**: `fa-music` if the saying has audio, `fa-th-list` if it has a chat/table component
- **Active checkbox**: 15×15px, inline, updates saying status on change without reopening the form
- **Controls**: edit (`fa-edit`), copy (`fa-copy`), delete (`fa-trash`) — `#7a7971`, centered
- GMs also see an owner badge next to the label for player-owned sayings

### Primary Controls Bar
Above the list, `#token-quips-primary-controls` at 36px height contains:

- **Search bar** (`.token-quips-search`, 84% width): 1px border, `border-radius: 2px`, absolute-positioned `fa-search` icon at left (8px), absolute-positioned clear button at right (circular, hidden until input has text)
- **Export button** (`.token-quips-json-export`, 7%): GM-only, `fa-file-export`
- **Import button** (`.token-quips-json-import`, 7%): GM-only, `fa-file-import`

### Tab Navigation
`.sheet-tabs.tabs` with one `<a class="item">` per tab, each prefixed with a FontAwesome icon:
- `fa-comment` Basics
- `fa-reply` Reacts *(hidden unless `isReact` is true)*
- `fa-th-list` Chat
- `fa-music` Audio
- `fa-play` Trigger

Tabs are 16px, with 12px bottom margin. Active tab is indicated by Foundry's default `.active` styling.

### Form Groups
Standard Foundry pattern: `.form-group` wrapping a `<label>` and `.form-fields`. Selects are capped at `max-width: 231px`. Padding is 1px 6px per group. Section breaks use `<h4>` with a bottom border and a FontAwesome icon.

### Range Sliders
Used for **likelihood** (1–100) and **volume** (0.05–1.00). Each slider sits next to a `.range-value` `<span>` that displays the current value and updates live via JS.

### Alert Boxes
`.alert` class: `padding: 5px 8px`, `background: rgba(245,209,7,0.411)`, `border-radius: 5px`. Used for inline validation (e.g., actor/token name not found in world). Shown/hidden with `.hidden` toggled by JS — not removed from the DOM.

### Tooltip Hints
`.toolt` `<span>` placed inside `<label>`, containing `<i class="fas fa-info-circle">`. The explanatory text lives in the `title` attribute, surfaced as a native browser tooltip. Font is 10px, color `#9e9e9e`.

### Suppress Grid
`.suppress` flex container on the Chat tab. Four checkbox + label pairs (`suppressChatbubble`, `suppressChatMessage`, `suppressQuotes`, `suppressPan`), each in a `flex: 0 0 25%` div — forming a 2×2 grid of toggles.

### Reacts Block
The Reacts tab body uses `.reacts` with `background: rgba(0,0,0,0.1)` and `padding: 5px`. Logical sections (what to react to / who reacts / spatial constraints) are separated by `<hr>` elements.

### Chat Window Output
`.token-quips.chat-window`: a flex row, `min-height: 50px`. The token image is `50×50px` with `border-width: 0`. The spoken text sits in `.what-is-said` with `margin-left: 8px`.

### Save Footer
`.sheet-footer` at the bottom of the detail form. One submit button with `fa-save` icon and the localized "Save Changes" label.

## Do's and Don'ts

- **Do** use Foundry's `.form-group` / `.flexrow` / `.sheet-tabs` patterns — don't introduce custom layout primitives
- **Do** use FontAwesome icons consistently as content-type signals: `fa-music` = audio, `fa-th-list` = chat/rollable table
- **Do** use the `.hidden` CSS class + Handlebars conditionals to toggle field visibility — avoid direct JS `display` manipulation where possible
- **Do** show inline `.alert` boxes for validation feedback rather than blocking dialogs or console warnings
- **Don't** show the Reacts tab or any `to.*` fields unless `documentType === 'reacts'`
- **Don't** add box-shadow or card elevation — rely on border and background contrast per Foundry conventions
- **Don't** hard-code font families other than Foundry's serif/sans-serif stack
