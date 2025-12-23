# Changelog

All notable changes to the Cosmic Voyager project will be documented in this file.

## [1.2.0] - 2024-12-15

### Added
- Product image gallery navigation with multiple image support
- Product name updated to "Siriusly Gold" for enhanced branding
- Zodiac carousel section with modular upright rectangle cards
- CapCut integration button in owner dashboard for media editing
- About and Live streaming slide-over panels on main site
- Live status indicator with pulsing red notification when owner is live on Whatnot
- Owner dashboard with swipeable navigation (Semi's Cloud, Orders, Messages, Settings)
- Order management system with filtering and status updates
- Sales metrics (Today, Week, Month, All Time)
- Customer message management with filtering
- Comprehensive settings panel (Star Dust, Whatnot/Live, Order Processing, Customer Communication, Payment Processing)
- User metrics display (Users Today, Users This Year, Avg Time Spent)

### Changed
- UI updates: improved navbar, search bar, product cards, and zodiac colors
- Removed light mode option for consistent dark theme experience
- Revamped main page: removed curated paragraph, added zodiac carousel, updated categories to My Art/Consignment/Deals, updated footer
- Footer updated to "2025 cosmic-deals"
- Removed auto-camera activation in owner dashboard
- Simplified upload UI to just upload icon
- About and Live buttons now visible on all screen sizes
- Hero subtitle improved with Space Grotesk font, removed repetitive text, added subtle lightning animation
- Redesigned owner dashboard: modern editor, mobile optimization, bulk upload, and UI improvements

### Technical
- Implemented swipeable section navigation for owner dashboard
- Added live status polling and custom event system
- Integrated CapCut web editor link for media editing workflow
- Enhanced order filtering and status management
- Improved responsive design for owner dashboard

## [1.1.0] - 2024-12-11

### Added
- Zodiac carousel section with modular upright rectangle cards (hidden for future use)
- CapCut integration button in owner dashboard for media editing
- About and Live streaming slide-over panels on main site
- Live status indicator with pulsing red notification when owner is live on Whatnot
- Owner dashboard with swipeable navigation (Semi's Cloud, Orders, Messages, Settings)
- Order management system with filtering and status updates
- Sales metrics (Today, Week, Month, All Time)
- Customer message management with filtering
- Comprehensive settings panel (Star Dust, Whatnot/Live, Order Processing, Customer Communication, Payment Processing)
- User metrics display (Users Today, Users This Year, Avg Time Spent)

### Changed
- Removed "curated by someone who cares" paragraph from main page
- Changed product categories from zodiac-based to: My Art, Consignment, Deals
- Footer updated to "2025 cosmic-deals"
- Removed auto-camera activation in owner dashboard
- Simplified upload UI to just upload icon
- About and Live buttons now visible on all screen sizes (removed mobile hiding)

### Technical
- Implemented swipeable section navigation for owner dashboard
- Added live status polling and custom event system
- Integrated CapCut web editor link for media editing workflow
- Enhanced order filtering and status management
- Improved responsive design for owner dashboard

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

