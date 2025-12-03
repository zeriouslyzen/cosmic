# Changelog

All notable changes to the Cosmic Voyager project will be documented in this file.

## [1.0.0] - 2024-12-02

### Added
- Initial project setup with Vite build tool
- Animated cosmic starfield background with falling stars
- Shooting stars with trails and glow effects
- Libra and Capricorn constellation animations (alternating)
- Hero section with "Cosmic Deals" title and pulsing neon-style animation
- Horizontal scrolling product carousel system
- Multiple product rows organized by category (rando, aries, taurus, gemini)
- 20 product placeholders with responsive layout
- Touch/swipe support for mobile product carousels
- Mouse drag and wheel scroll support for desktop carousels
- Scroll-based visibility: hero fades out, products fade in
- Search and filter functionality by zodiac signs
- Product detail modal with smooth slide-in animation
- Glassmorphism UI design effects
- Responsive design for mobile, tablet, and desktop
- Navigation bar with "cosmic deals" branding
- Search prompt bar with filter buttons

### Changed
- Product grid from masonry layout to horizontal scrolling carousels
- Hero title from "Objects of the Cosmos." to "Cosmic Deals"
- Navigation logo from "CV" to "cosmic deals" (lowercase)
- Removed "Collections" and "About" links from navigation
- Product display: 4 items per row on desktop, 2 on mobile, 3 on tablet

### Technical
- Implemented canvas-based animations for starfield and constellations
- Added scroll-snap CSS for smooth carousel scrolling
- Implemented touch event handling for mobile swipe gestures
- Added mouse drag and wheel scroll handlers for desktop
- Optimized animation performance with requestAnimationFrame
- Added Intersection Observer for scroll-based visibility

### Development
- Configured Vite development server with network access (--host)
- Added alternative Node.js HTTP server (server.js)
- Created startup scripts for development
- Configured .gitignore for Node.js projects

