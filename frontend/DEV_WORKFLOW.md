# Frontend Development Workflow

## Quick Start for Development

### Using HMR (Hot Module Replacement) - RECOMMENDED ✨

From the **main project directory** (not inside frontend/):

```bash
npm run dev:hmr
```

This will:
- ✅ Start the HTTP server with auto-restart on backend changes
- ✅ Watch frontend files and auto-rebuild on changes  
- ✅ Show colored output with SERVER (cyan) and FRONTEND (magenta) logs
- ✅ Serve the app at http://localhost:8080

### Manual Development

If you prefer manual control:

```bash
# Terminal 1: Start HTTP server with watch mode
npm run dev:http

# Terminal 2: Watch frontend files (in a separate terminal)
npm run watch:frontend
```

### One-time Build and Run

```bash
# Build frontend once and start server
npm run dev:full
```

## File Watching

The HMR setup watches these files for changes:
- `frontend/src/**/*` - All React components, styles, and assets
- Backend TypeScript files are watched by `tsx watch`

When you edit files in `frontend/src/`, the frontend will automatically rebuild and the changes will be available immediately at http://localhost:8080.

## Design System

The frontend uses our custom Aman-inspired design system with:
- **Tailwind CSS** with custom color palette
- **Heroicons** for consistent iconography  
- **Inter & Playfair Display** fonts
- **Sophisticated stone colors** instead of bright accent colors
- **Elegant animations** and smooth transitions

See `DESIGN_SYSTEM.md` for complete guidelines.

## Troubleshooting

### Changes not appearing?
1. Check that `npm run dev:hmr` is running
2. Look for build errors in the FRONTEND log output
3. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+F5)

### Port conflicts?
The HTTP server runs on port 8080. If you get port conflicts, stop any existing servers first.

### Build errors?
- Check the FRONTEND log output for TypeScript/ESLint errors
- Ensure all imports are correctly typed
- Verify Tailwind classes are spelled correctly