# Persistent Engineering & Design Directives

## 1. Token Conservation & Conciseness (`honey`)
- Write minimal, YAGNI-compliant code with no unnecessary boilerplate or redundant wrappers.
- Keep response prose direct and concise: omit pleasantries, hedging, and re-summarizing unchanged code.
- Retain exact identifier names, file paths, and technical terminology.

## 2. UI/UX Quality & Aesthetics (`impeccable`)
- Prevent generic "AI slop" or default browser styling. Use curated HSL/OKLCH color tokens, dark/light modes, modern typography, and dynamic micro-interactions.
- Build responsive layout boundaries (touch/stylus, mobile drawer, desktop grid) with native gesture support (pan/zoom, pointer capture).
- Never use placeholder imagery or stubbed visual components.

## 3. Code Quality & Codebase Architecture (`graphify`)
- Inspect complete definitions and contracts using tools before modifying schemas or signatures.
- Avoid code smells, silent try/catch blocks, dummy fallbacks, or masking errors.
- Run tests (`npm run test:unit`, `npm run test:frontend`, `npm run test:backend`, `npm run test:browser`) before declaring completion.

## 4. Skill Activation
- Proactively leverage specialized skills (`honey`, `impeccable`, `graphify`, `web-design-guidelines`) during planning and implementation turns.
