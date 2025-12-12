# Cosmic Voyager - Cosmic Deals

A curated e-commerce platform for art, vintage relics, and unique finds with a cosmic aesthetic. Features an immersive animated starfield background, horizontal product carousels, and smooth scroll-based interactions.

## Features

- **Animated Cosmic Background**
  - Dynamic starfield with falling stars
  - Shooting stars with trails and glow effects
  - Alternating Libra and Capricorn constellation animations
  - Pulsing vintage neon-style hero title
  
- **Product Display**
  - Horizontal scrolling product carousels (4 items per row on desktop)
  - Product categories: My Art, Consignment, Deals
  - Touch/swipe support for mobile devices
  - Mouse drag and wheel scroll support for desktop
  - Smooth scroll-snap behavior
  - Zodiac carousel section (modular upright rectangle cards)
  
- **User Interface**
  - Glassmorphism design effects
  - Hero section that fades on scroll
  - Products section that appears on scroll
  - Search and filter functionality by zodiac signs
  - Product detail modal with smooth transitions
  - About and Live streaming slide-over panels
  - Responsive design (mobile, tablet, desktop)
  
- **Owner Dashboard**
  - Swipeable navigation between sections (Semi's Cloud, Orders, Messages, Settings)
  - Product management with image/video upload
  - CapCut integration for media editing
  - Order processing and management
  - Sales metrics and analytics
  - Live status toggle for Whatnot streaming
  - Customer message management
  - Comprehensive settings panel
  
- **Animations & Interactions**
  - Smooth scroll-triggered animations
  - Fade-in effects for content sections
  - Interactive product cards
  - Search prompt bar with filter buttons

## Tech Stack

- HTML5
- Tailwind CSS (via CDN)
- Vanilla JavaScript (ES6 modules)
- Vite (development server)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

### Build

Create a production build:
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
Cosmic/
├── index.html              # Main HTML file
├── Cosmic.html             # Original HTML file (legacy)
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── server.js               # Alternative Node.js server
├── .gitignore              # Git ignore rules
├── src/
│   ├── styles/
│   │   └── main.css        # Custom CSS styles
│   └── js/
│       └── main.js         # JavaScript functionality (animations, interactions)
├── start.sh                # Development server startup script
├── start-server.sh         # Alternative server startup script
└── README.md
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)


