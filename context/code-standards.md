# Code Standards

## TypeScript & Calculations
- Strict mode required. No `any` types.
- Geotechnical parameters (angles in degrees/radians, unit weights in $\text{kN/m}^3$) must be strictly typed using interfaces.
- Keep calculation math pure and isolated inside `lib/` so it can be easily unit-tested.

## Next.js Practices
- Use React Server Components for layout scaffolding, and Client Components (`"use client"`) for interactive parameter sliders and canvas drawing.