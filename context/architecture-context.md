# Architecture Context

## Technical Stack
| Layer | Technology | Purpose |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript | Full-stack application structure |
| Styling | Tailwind CSS + shadcn/ui | Clean, dark-mode technical UI |
| Math Engine | TypeScript / Pure Functions (`lib/`) | Slice equilibrium calculations and geometry formulas |
| Visualization | HTML5 Canvas / SVG | Rendering slope cross-sections and slip circles |

## System Boundaries
- `app/` — Page views and interactive calculator dashboard.
- `lib/` — Pure calculation functions for slice geometry, normal/shear forces, and FoS formulas.
- `components/` — UI controls (sliders, inputs) and visual renderers (canvas/SVG cross-section).