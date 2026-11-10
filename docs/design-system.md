# Timesheet gradient design system

This file is the source of truth for all Timesheet frontend screens. Apply these rules to login, workspace pages, admin pages, and future UI before adding page-specific styles.

## Direction

A calm productivity interface with an indigo-to-cyan gradient. Gradients identify brand, primary actions, and large background regions. Data tables, forms, and long text stay on solid surfaces for readability. The same hierarchy works in light and dark themes.

## Tokens

All visual values live in `timesheet-fe/src/app/globals.css` under semantic CSS variables. Use `--gradient-brand`, `--gradient-page`, `--surface`, `--surface-soft`, `--text`, `--text-muted`, `--border`, `--focus`, and state tokens. Never hardcode a new gradient or status color inside a page component.

- Brand: indigo `#5B4FE9` to deep cyan `#087A9B`; white text on primary actions.
- Light: pale lavender-blue page, white cards, navy text.
- Dark: deep navy page, slate cards, near-white text; gradients stay saturated but readable.
- Spacing: 4/8/12/16/24/32/48 px. Card radius 18 px; control radius 11 px.
- Type: Plus Jakarta Sans, 16 px body, 1.5 line height; headings use 700–800 weight.

## Components

- Sidebar: deep gradient surface; grouped links; active link uses a solid white pill with navy text and a gradient edge marker. On narrow screens, navigation scrolls horizontally.
- Card: solid surface with subtle border and shadow. Do not put gradient behind table rows or form labels.
- Primary button: brand gradient; secondary button: quiet solid surface; destructive action: red-tinted surface. All controls have a minimum 44 px target.
- Inputs: solid surface, visible border, consistent height and label spacing; select arrows have at least 14 px edge inset.
- Single-choice dropdowns use `SelectField` with a solid option menu and visible selected state. Dates use `DateField` with a compact calendar panel. Multi-select controls retain native selection behavior.
- Tables: quiet header, row separators and hover state. Preserve horizontal scrolling on small screens.
- Feedback: semantic error and success colors, text labels, and visible keyboard focus.
- Collection pages: show the compact list first, with Add new in the list header. Creation and record details use the shared modal; keep edits and destructive actions in details. Use `?item=<id>` for shareable detail state.

## Accessibility and responsiveness

Keep normal text contrast at least 4.5:1 and control boundaries at least 3:1. Provide `:focus-visible` rings and respect reduced motion. Check 375, 768, 1024, and 1440 px widths and both themes. Gradients must never carry meaning alone.
