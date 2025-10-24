# VORTEX Lite TRAE

VORTEX Lite TRAE is a Next.js 16 application that showcases immersive 3D virtual tour functionality with a modern React 19 front-end. The project uses Tailwind CSS 4 for styling, Radix UI for accessible primitives, and a collection of custom components for building rich media experiences.

## Getting Started

### Prerequisites
- Node.js 20 or later (PNPM compatible)
- pnpm (preferred) or npm/yarn

### Installation
```bash
pnpm install
```

### Development Server
```bash
pnpm dev
```
Open <http://localhost:3000> to view the app. Edits trigger hot reloads.

### Production Build
```bash
pnpm build
pnpm start
```
`pnpm build` generates the optimized Next.js output and `pnpm start` serves it.

## Project Structure
```
app/            # Next.js app router pages and layouts
components/     # Reusable UI building blocks
hooks/          # Custom React hooks
lib/            # Utilities and configuration helpers
public/         # Static assets served directly
styles/         # Global styles and Tailwind configuration
```

## Key Features
The application highlights capabilities such as:
- Immersive 3D virtual tours with multiple navigation modes
- AI-powered property intelligence and interactive hotspots
- Measurement, analytics, and multimedia enhancements for listings

See `FEATURES.txt` for a complete feature breakdown.

## Scripts
- `pnpm dev` – start the development server
- `pnpm build` – build for production
- `pnpm start` – run the production server
- `pnpm lint` – run ESLint against the codebase

## Contributing
1. Fork and clone the repository.
2. Create a feature branch from `main`.
3. Commit changes with clear messages.
4. Push and open a pull request describing your updates.

## License
This project is provided as-is. See repository terms if a LICENSE file is added in the future.
