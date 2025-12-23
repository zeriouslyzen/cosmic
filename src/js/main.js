import './owner-panel-edit.js';
import { toast } from './utils/toast.js';

// Check live status from settings
async function checkLiveStatus() {
    try {
        const { getSetting } = await import('./owner.js');
        const isLive = await getSetting('live_status');
        const liveIndicator = document.getElementById('live-indicator');
        if (liveIndicator) {
            if (isLive) {
                liveIndicator.classList.remove('hidden');
            } else {
                liveIndicator.classList.add('hidden');
            }
        }
    } catch (error) {
        // If owner.js not available, check localStorage directly
        const liveStatus = localStorage.getItem('setting_live_status');
        const liveIndicator = document.getElementById('live-indicator');
        if (liveIndicator) {
            if (liveStatus === 'true') {
                liveIndicator.classList.remove('hidden');
            } else {
                liveIndicator.classList.add('hidden');
            }
        }
    }
}

// Listen for live status updates
window.addEventListener('live-status-updated', (e) => {
    const liveIndicator = document.getElementById('live-indicator');
    if (liveIndicator) {
        if (e.detail.isLive) {
            liveIndicator.classList.remove('hidden');
        } else {
            liveIndicator.classList.add('hidden');
        }
    }
});

// Poll for live status changes (check every 5 seconds)
setInterval(checkLiveStatus, 5000);

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // --- Check for live status update ---

    // Check live status on load
    checkLiveStatus();
    // --- Starfield Background Animation ---
    const canvas = document.getElementById('cosmic-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const ctx = canvas.getContext('2d');
    // Enable advanced rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let width, height;
    let stars = [];
    let shootingStars = [];
    const starCount = 150;
    const maxShootingStars = 3;

    // Get star colors (dark mode only)
    function getStarColors() {
        return [
            'rgba(255, 255, 255, 0.8)',   // White
            'rgba(210, 180, 140, 0.7)',   // Tan
            'rgba(173, 216, 230, 0.7)',   // Light blue
            'rgba(255, 218, 185, 0.7)'    // Peach
        ];
    }

    let starColors = getStarColors();

    let lastShootingStarTime = 0;
    let shootingStarInterval = 3000 + Math.random() * 5000; // 3-8 seconds between shooting stars

    // Constellation animation - alternating between Libra and Capricorn
    let constellationPhase = 0;
    const constellationPulseSpeed = 0.003; // Slow pulsing like old neon sign
    let constellationSwitchPhase = 0;
    const constellationSwitchSpeed = 0.0008; // Slow fade between constellations

    let offscreenCanvas, offscreenCtx;

    function init() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        stars = [];
        shootingStars = [];
        for (let i = 0; i < starCount; i++) stars.push(new Star());

        // Create offscreen canvas for static stars
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        offscreenCtx = offscreenCanvas.getContext('2d');
        renderStaticStars();
    }

    function renderStaticStars() {
        offscreenCtx.clearRect(0, 0, width, height);
        stars.forEach(star => {
            offscreenCtx.beginPath();
            offscreenCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            offscreenCtx.fillStyle = star.color;
            offscreenCtx.fill();
        });
    }

    class Star {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vy = Math.random() * 0.4 + 0.1;
            this.radius = Math.random() * 1.2 + 0.2;
            this.color = starColors[Math.floor(Math.random() * starColors.length)];
        }
        update() {
            // Stars are now static for performance (offscreen rendering)
            return;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    class ShootingStar {
        constructor() {
            // Start from random point on top or left edge
            const startEdge = Math.random();
            if (startEdge < 0.5) {
                // Start from top, moving down-right
                this.x = Math.random() * width;
                this.y = -50;
                this.vx = (Math.random() * 3 + 2) * (Math.random() < 0.5 ? 1 : -1);
                this.vy = Math.random() * 4 + 3;
            } else {
                // Start from left, moving down-right
                this.x = -50;
                this.y = Math.random() * height * 0.5;
                this.vx = Math.random() * 4 + 3;
                this.vy = Math.random() * 3 + 2;
            }

            this.trail = [];
            this.maxTrailLength = 25;
            this.life = 1.0;
            this.decay = 0.015;
            this.color = starColors[Math.floor(Math.random() * starColors.length)];
            this.length = Math.random() * 80 + 40;
            this.angle = Math.atan2(this.vy, this.vx);
        }

        update() {
            // Add current position to trail
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }

            // Update position
            this.x += this.vx;
            this.y += this.vy;

            // Decay
            this.life -= this.decay;

            // Check if off screen or dead
            return this.life > 0 && this.x < width + 100 && this.y < height + 100;
        }

        draw() {
            if (this.trail.length < 2) return;

            // Draw trail with gradient
            for (let i = 0; i < this.trail.length - 1; i++) {
                const point = this.trail[i];
                const nextPoint = this.trail[i + 1];
                const progress = i / this.trail.length;
                const alpha = this.life * (1 - progress * 0.7);

                // Create gradient for trail segment
                const gradient = ctx.createLinearGradient(
                    point.x, point.y,
                    nextPoint.x, nextPoint.y
                );

                const [r, g, b] = this.extractRGB(this.color);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
                gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha})`);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2 + progress * 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                ctx.stroke();
            }

            // Draw glowing head
            const head = this.trail[this.trail.length - 1];
            if (head) {
                // Outer glow
                const glowGradient = ctx.createRadialGradient(
                    head.x, head.y, 0,
                    head.x, head.y, 15
                );
                const [r, g, b] = this.extractRGB(this.color);
                glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.life})`);
                glowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${this.life * 0.5})`);
                glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(head.x, head.y, 15, 0, Math.PI * 2);
                ctx.fill();

                // Bright core
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.life})`;
                ctx.beginPath();
                ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        extractRGB(color) {
            const match = color.match(/\d+/g);
            return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
        }
    }

    function drawConstellation(stars, connections, color, fadeValue) {
        // Calculate pulse intensity (like old neon sign flickering)
        constellationPhase += constellationPulseSpeed;
        const pulse = (Math.sin(constellationPhase) + 1) / 2; // 0 to 1
        // Add some flicker variation for old sign effect
        const flicker = 0.7 + (Math.random() * 0.3);

        // Use provided fade value
        const intensity = pulse * flicker * 0.35 * fadeValue; // Brighter! (max 35% opacity, was 15%)

        // Scale constellation to be big (about 60% of screen width)
        const scale = Math.min(width, height) * 0.6;
        const centerX = width * 0.5;
        const centerY = height * 0.4;

        // Draw connections with glow effect
        ctx.save();
        ctx.globalAlpha = intensity;
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 3})`; // Brighter lines
        ctx.lineWidth = 2; // Slightly thicker
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15; // More glow
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;

        connections.forEach(([start, end]) => {
            const startStar = stars[start];
            const endStar = stars[end];

            ctx.beginPath();
            ctx.moveTo(
                centerX + startStar.x * scale,
                centerY + startStar.y * scale
            );
            ctx.lineTo(
                centerX + endStar.x * scale,
                centerY + endStar.y * scale
            );
            ctx.stroke();
        });

        // Draw constellation stars with brighter glow
        stars.forEach(star => {
            const x = centerX + star.x * scale;
            const y = centerY + star.y * scale;

            // Outer glow - brighter and larger
            const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
            glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 1.2})`);
            glowGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.6})`);
            glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();

            // Bright center - much brighter
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 2.5})`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    // Libra constellation pattern (simplified - scales and balance)
    const libraStars = [
        { x: -0.4, y: -0.3 },  // Alpha Librae
        { x: 0.4, y: -0.3 },   // Beta Librae
        { x: -0.3, y: 0.1 },   // Gamma Librae
        { x: 0.3, y: 0.1 },    // Delta Librae
        { x: -0.2, y: 0.3 },   // Epsilon Librae
        { x: 0.2, y: 0.3 },    // Zeta Librae
        { x: 0, y: 0.4 }       // Center point
    ];

    const libraConnections = [
        [0, 1],  // Top bar (scales)
        [2, 3],  // Middle connection
        [4, 5],  // Bottom connection
        [0, 2],  // Left side
        [1, 3],  // Right side
        [2, 4],  // Left chain
        [3, 5],  // Right chain
        [4, 6],  // Left to center
        [5, 6]   // Right to center
    ];

    // Get constellation colors (dark mode only)
    function getConstellationColors() {
        return {
            libra: { r: 210, g: 180, b: 140 },    // Tan/amber
            capricorn: { r: 173, g: 216, b: 230 } // Light blue
        };
    }

    // Capricorn constellation pattern (sea-goat)
    const capricornStars = [
        { x: -0.35, y: -0.4 },  // Alpha Capricorni
        { x: -0.2, y: -0.35 },  // Beta Capricorni
        { x: 0, y: -0.3 },       // Gamma Capricorni
        { x: 0.2, y: -0.25 },    // Delta Capricorni
        { x: 0.35, y: -0.2 },    // Epsilon Capricorni
        { x: 0.3, y: 0.1 },      // Zeta Capricorni
        { x: 0.15, y: 0.25 },    // Eta Capricorni
        { x: -0.15, y: 0.25 },   // Theta Capricorni
        { x: -0.3, y: 0.1 },     // Iota Capricorni
        { x: -0.25, y: -0.1 }    // Kappa Capricorni
    ];

    const capricornConnections = [
        [0, 1],  // Head to neck
        [1, 2],  // Neck to body
        [2, 3],  // Body continuation
        [3, 4],  // Front body
        [4, 5],  // Front leg
        [5, 6],  // Front leg to foot
        [2, 7],  // Back leg
        [7, 8],  // Back leg continuation
        [8, 9],  // Back leg to foot
        [9, 1]   // Back to neck
    ];

    function animate() {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Calculate fade between constellations (slow transition)
        constellationSwitchPhase += constellationSwitchSpeed;
        const switchCycle = (Math.sin(constellationSwitchPhase) + 1) / 2; // 0 to 1

        // Libra fades out as Capricorn fades in, then vice versa
        const libraFade = switchCycle < 0.5 ? (1 - switchCycle * 2) : ((switchCycle - 0.5) * 2);
        const capricornFade = switchCycle < 0.5 ? (switchCycle * 2) : (1 - (switchCycle - 0.5) * 2);

        // Draw background stars from offscreen canvas for high performance
        if (offscreenCanvas) {
            ctx.drawImage(offscreenCanvas, 0, 0);
        }

        // Draw constellations - alternating fade between Libra and Capricorn
        const colors = getConstellationColors();
        drawConstellation(libraStars, libraConnections, colors.libra, libraFade);
        drawConstellation(capricornStars, capricornConnections, colors.capricorn, capricornFade);

        // Regular stars are now handled by offscreen canvas, so no need to loop here
        // stars.forEach(s => { s.update(); s.draw(); });

        // Spawn new shooting stars slowly (epic timing)
        const now = Date.now();
        if (shootingStars.length < maxShootingStars &&
            now - lastShootingStarTime > shootingStarInterval) {
            shootingStars.push(new ShootingStar());
            lastShootingStarTime = now;
            // Reset interval for next spawn (3-8 seconds)
            shootingStarInterval = 3000 + Math.random() * 5000;
        }

        // Update and draw shooting stars with advanced rendering
        shootingStars = shootingStars.filter(star => {
            const alive = star.update();
            if (alive) star.draw();
            return alive;
        });

        requestAnimationFrame(animate);
    }

    // --- Neon Sign Dimming Effect for Hero Heading (Slow pulse, never disappears) ---
    const heroHeading = document.querySelector('.hero-heading');
    let dimPulsePhase = 0;
    const dimPulseSpeed = 0.003; // Same speed as constellation pulse

    function updateNeonDim() {
        if (!heroHeading) return;

        dimPulsePhase += dimPulseSpeed;
        const pulse = (Math.sin(dimPulsePhase) + 1) / 2; // 0 to 1
        const flicker = 0.85 + (Math.random() * 0.15); // Subtle flicker like old sign

        // Dimming effect - only dims and brightens, never disappears
        // Opacity ranges from 0.4 (dim) to 1.0 (bright)
        const minOpacity = 0.4;
        const maxOpacity = 1.0;
        const opacity = minOpacity + (pulse * (maxOpacity - minOpacity)) * flicker;

        // Glow intensity matches opacity
        const glowIntensity = opacity;

        heroHeading.style.opacity = opacity;
        heroHeading.style.textShadow = `
            0 0 ${5 + pulse * 5}px rgba(255, 255, 255, ${glowIntensity * 0.2}),
            0 0 ${10 + pulse * 10}px rgba(210, 180, 140, ${glowIntensity * 0.1})
        `;
        heroHeading.style.color = 'white';
        heroHeading.style.visibility = 'visible';

        requestAnimationFrame(updateNeonDim);
    }

    if (heroHeading) {
        updateNeonDim();
    }

    // --- Cycling Subtitle Messages ---
    const heroSubtitle = document.getElementById('hero-subtitle');
    const subtitleMessages = [
        "Art, silver, thrift finds. Your zodiac sign won't help you find better deals, but we will.",
        "Our zodiac sign didn't predict this, but here we are.",
        "Your sign said you'd buy something today anyway."
    ];
    let currentSubtitleIndex = 0;
    let subtitleCycleTime = 0;
    const subtitleCycleInterval = 5000; // Change every 5 seconds

    function cycleSubtitle() {
        if (!heroSubtitle) return;

        subtitleCycleTime += 16; // ~60fps

        if (subtitleCycleTime >= subtitleCycleInterval) {
            subtitleCycleTime = 0;

            // Subtle lightning effect on transition
            heroSubtitle.classList.add('lightning-flash');

            // Fade out with subtle transform
            heroSubtitle.style.opacity = '0';
            heroSubtitle.style.transform = 'translateY(10px)';
            heroSubtitle.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

            setTimeout(() => {
                // Change text
                currentSubtitleIndex = (currentSubtitleIndex + 1) % subtitleMessages.length;
                heroSubtitle.textContent = subtitleMessages[currentSubtitleIndex];

                // Remove lightning class
                heroSubtitle.classList.remove('lightning-flash');

                // Fade in with subtle lightning entrance
                setTimeout(() => {
                    heroSubtitle.style.opacity = '1';
                    heroSubtitle.style.transform = 'translateY(0)';
                    heroSubtitle.classList.add('lightning-entrance');
                    setTimeout(() => {
                        heroSubtitle.classList.remove('lightning-entrance');
                    }, 800);
                }, 50);
            }, 600);
        }

        requestAnimationFrame(cycleSubtitle);
    }

    if (heroSubtitle) {
        cycleSubtitle();
    }

    // --- Scroll Detection: Hide Hero on Scroll, Show Products ---
    const heroSection = document.getElementById('hero-section');
    const subtitle = document.querySelector('.subtitle');
    const productsSection = document.getElementById('products-section');
    const brandName = document.getElementById('brand-name');
    const aboutTrigger = document.getElementById('about-trigger');
    const liveTrigger = document.getElementById('live-trigger');
    const aboutPanel = document.getElementById('about-panel');
    const livePanel = document.getElementById('live-panel');
    let lastScrollY = 0;
    let scrollThreshold = 100; // Hide after 100px scroll

    function handleScroll() {
        const currentScrollY = window.scrollY;

        if (currentScrollY > scrollThreshold) {
            // Hide hero section
            if (heroSection) {
                heroSection.style.opacity = '0';
                heroSection.style.transform = 'translateY(-50px)';
                heroSection.style.pointerEvents = 'none';
            }
            if (subtitle) {
                subtitle.style.opacity = '0';
                subtitle.style.transform = 'translateY(-20px)';
            }
            // Show products section
            if (productsSection) {
                productsSection.style.opacity = '1';
                productsSection.style.transform = 'translateY(0)';
            }
        } else {
            // Show hero section
            if (heroSection) {
                heroSection.style.opacity = '1';
                heroSection.style.transform = 'translateY(0)';
                heroSection.style.pointerEvents = 'auto';
            }
            if (subtitle) {
                subtitle.style.opacity = '1';
                subtitle.style.transform = 'translateY(0)';
            }
            // Keep products visible but can fade
            if (productsSection && currentScrollY < 50) {
                productsSection.style.opacity = '0.3';
            }
        }

        // Brand text expand/retract
        if (brandName) {
            if (currentScrollY > scrollThreshold && brandName.textContent !== 'cosmic deals') {
                brandName.textContent = 'cosmic deals';
            } else if (currentScrollY <= scrollThreshold && brandName.textContent !== 'CD') {
                brandName.textContent = 'CD';
            }
        }

        lastScrollY = currentScrollY;
    }

    function closePanels() {
        [aboutPanel, livePanel].forEach(panel => {
            if (panel) {
                panel.classList.remove('open');
                panel.setAttribute('aria-hidden', 'true');
            }
        });
    }

    function openPanel(panel) {
        if (!panel) return;
        closePanels();
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
    }

    if (aboutTrigger) {
        aboutTrigger.addEventListener('click', () => openPanel(aboutPanel));
    }
    if (liveTrigger) {
        liveTrigger.addEventListener('click', () => openPanel(livePanel));
    }
    document.querySelectorAll('.slide-panel__close').forEach(btn => {
        btn.addEventListener('click', () => closePanels());
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanels();
    });

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Make products visible initially and show them when scrolled
    if (productsSection) {
        productsSection.style.opacity = '1';
        productsSection.style.transform = 'translateY(0)';
        productsSection.classList.add('visible');
    }

    // Initial check
    handleScroll();

    window.addEventListener('resize', init);
    init();
    animate();

    // --- Zodiac Carousel ---
    const zodiacCarousel = document.getElementById('zodiac-carousel');
    const zodiacCarouselSigns = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];

    if (zodiacCarousel) {
        zodiacCarouselSigns.forEach(sign => {
            const card = document.createElement('div');
            card.className = 'zodiac-card';
            card.dataset.zodiac = sign.toLowerCase();
            card.innerHTML = `
                <div class="zodiac-card-content">
                    <div class="zodiac-card-name">${sign}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                // Filter products by zodiac
                filterMode = 'zodiac';
                activeZodiac = sign.toLowerCase();
                // Re-render buttons to show zodiac mode with correct active state
                renderFilterButtons();
                filterProducts();
                // Scroll to products section
                const productsSection = document.getElementById('products-section');
                if (productsSection) {
                    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            zodiacCarousel.appendChild(card);
        });
    }

    // --- Scroll Animations ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // --- Product Filter Logic ---
    const searchInput = document.getElementById('search-input');
    const zodiacBtns = document.querySelectorAll('.zodiac-btn');
    const zodiacFiltersScroll = document.querySelector('.zodiac-filters-scroll');
    let productCards = [];
    let activeZodiac = 'all';
    let activeStyle = 'all';
    let filterMode = 'zodiac'; // 'zodiac' or 'styles'

    // Style categories
    const styleCategories = [
        { value: 'all', label: 'All' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'silver', label: 'Silver' },
        { value: 'gold', label: 'Gold' },
        { value: 'art', label: 'Art' },
        { value: 'clothing', label: 'Clothing' },
        { value: 'accessories', label: 'Accessories' }
    ];

    // Zodiac signs
    const zodiacSigns = [
        { value: 'all', label: 'All' },
        { value: 'aries', label: 'Aries' },
        { value: 'taurus', label: 'Taurus' },
        { value: 'gemini', label: 'Gemini' },
        { value: 'cancer', label: 'Cancer' },
        { value: 'leo', label: 'Leo' },
        { value: 'virgo', label: 'Virgo' },
        { value: 'libra', label: 'Libra' },
        { value: 'scorpio', label: 'Scorpio' },
        { value: 'sagittarius', label: 'Sagittarius' },
        { value: 'capricorn', label: 'Capricorn' },
        { value: 'aquarius', label: 'Aquarius' },
        { value: 'pisces', label: 'Pisces' }
    ];

    // Function to render filter buttons
    function renderFilterButtons() {
        if (!zodiacFiltersScroll) return;

        zodiacFiltersScroll.innerHTML = '';

        if (filterMode === 'styles') {
            // Render style category buttons
            styleCategories.forEach(style => {
                const btn = document.createElement('button');
                btn.className = 'zodiac-btn';
                if (style.value === 'all') {
                    btn.classList.add('styles-btn');
                    // Make "All" button toggle back to zodiac mode
                    btn.setAttribute('data-filter-type', 'zodiac-toggle');
                } else {
                    btn.setAttribute('data-filter-type', 'styles');
                    btn.setAttribute('data-style', style.value);
                }
                btn.textContent = style.label;
                if (style.value === activeStyle) {
                    btn.classList.add('active');
                }
                btn.addEventListener('click', () => {
                    if (style.value === 'all' && btn.hasAttribute('data-filter-type') && btn.getAttribute('data-filter-type') === 'zodiac-toggle') {
                        // Toggle back to zodiac mode
                        filterMode = 'zodiac';
                        activeZodiac = 'all';
                        renderFilterButtons();
                        filterProducts();
                    } else {
                        // Filter by style
                        document.querySelectorAll('[data-filter-type="styles"]').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        activeStyle = style.value;
                        filterProducts();
                        setTimeout(attachProductCardHandlers, 50);
                    }
                });
                zodiacFiltersScroll.appendChild(btn);
            });
        } else {
            // Render zodiac buttons
            zodiacSigns.forEach(zodiac => {
                const btn = document.createElement('button');
                btn.className = 'zodiac-btn';
                if (zodiac.value === 'all') {
                    btn.classList.add('styles-btn');
                    btn.setAttribute('data-filter-type', 'styles-toggle');
                    btn.textContent = 'Styles';
                } else {
                    btn.setAttribute('data-zodiac', zodiac.value);
                    btn.textContent = zodiac.label;
                }
                if (zodiac.value === activeZodiac) {
                    btn.classList.add('active');
                }
                btn.addEventListener('click', () => {
                    if (zodiac.value === 'all' && btn.hasAttribute('data-filter-type') && btn.getAttribute('data-filter-type') === 'styles-toggle') {
                        // Toggle to styles mode
                        filterMode = 'styles';
                        activeStyle = 'all';
                        renderFilterButtons();
                        filterProducts();
                    } else {
                        // Filter by zodiac
                        document.querySelectorAll('[data-zodiac]').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        activeZodiac = zodiac.value;
                        filterProducts();
                        setTimeout(attachProductCardHandlers, 50);
                    }
                });
                zodiacFiltersScroll.appendChild(btn);
            });
        }
    }

    // Load product images immediately - no delay, must be visible
    function loadProductImages() {
        productCards = document.querySelectorAll('.product-card-small');

        // Add placeholder images to products missing images
        productCards.forEach((card, index) => {
            const imgContainer = card.querySelector('.w-full.h-40, .h-40');
            if (imgContainer) {
                // Check if it has a span placeholder (any span, not just with specific class)
                const hasSpan = imgContainer.querySelector('span');
                const existingImg = imgContainer.querySelector('img');

                // ALWAYS replace if there's a span - this is the main issue
                if (hasSpan) {
                    const productId = card.dataset.productId || `product-${index}`;
                    const placeholderImages = [
                        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop'
                    ];
                    const imgUrl = card.dataset.img || placeholderImages[index % placeholderImages.length];

                    // Create new image element
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = card.dataset.title || 'Product';
                    img.className = 'w-full h-full object-cover';
                    img.loading = 'eager';
                    img.decoding = 'async';
                    img.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; width: 100% !important; height: 100% !important;';

                    // Replace ALL content with image immediately - clear spans
                    imgContainer.innerHTML = '';
                    imgContainer.appendChild(img);

                    // Update data attribute
                    if (!card.dataset.img) {
                        card.dataset.img = imgUrl;
                    }
                } else if (!existingImg) {
                    // No image and no span - add image
                    const placeholderImages = [
                        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
                        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop'
                    ];
                    const imgUrl = card.dataset.img || placeholderImages[index % placeholderImages.length];

                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = card.dataset.title || 'Product';
                    img.className = 'w-full h-full object-cover';
                    img.loading = 'eager';
                    img.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; width: 100% !important; height: 100% !important;';

                    imgContainer.appendChild(img);
                } else if (existingImg) {
                    // Image exists, ensure it loads eagerly and is visible
                    existingImg.loading = 'eager';
                    existingImg.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
                    if (!existingImg.src && card.dataset.img) {
                        existingImg.src = card.dataset.img;
                    }
                }
            }
        });
    }

    // Load images immediately when DOM is ready
    loadProductImages();

    // Run multiple times to ensure all images load
    setTimeout(loadProductImages, 0);
    setTimeout(loadProductImages, 50);
    setTimeout(loadProductImages, 200);

    // Function to dynamically render products from localStorage
    async function renderProductsFromStorage() {
        const { getProducts } = await import('./api.js');
        const products = await getProducts();

        if (!products || products.length === 0) return;

        // Group products by zodiac (handle multiple zodiacs per product)
        const productsByZodiac = {};
        products.forEach(product => {
            // Handle comma-separated zodiacs
            const zodiacs = product.zodiac ? product.zodiac.split(',').map(z => z.trim()) : ['just-in'];

            zodiacs.forEach(zodiac => {
                const zodiacKey = zodiac || 'just-in';
                if (!productsByZodiac[zodiacKey]) {
                    productsByZodiac[zodiacKey] = [];
                }
                // Only add if not already in this zodiac's list (avoid duplicates)
                if (!productsByZodiac[zodiacKey].find(p => p.id === product.id)) {
                    productsByZodiac[zodiacKey].push(product);
                }
            });
        });

        const productsSection = document.getElementById('products-section');
        const productsLoader = document.getElementById('products-loader');
        if (!productsSection) return;

        // Show loader
        if (productsLoader) productsLoader.classList.remove('hidden');

        // Clear existing product rows (keep structure)
        const existingRows = productsSection.querySelectorAll('.product-row');
        existingRows.forEach(row => {
            const grid = row.querySelector('.product-grid-row');
            if (grid) grid.innerHTML = '';
        });

        // Add products to appropriate rows or create new rows
        Object.keys(productsByZodiac).forEach(zodiac => {
            let row = productsSection.querySelector(`.product-row[data-zodiac="${zodiac}"]`);

            if (!row) {
                // Create new row if it doesn't exist
                row = document.createElement('div');
                row.className = 'product-row';
                row.setAttribute('data-zodiac', zodiac);
                const displayName = zodiac === 'just-in' ? 'Just In' : zodiac.charAt(0).toUpperCase() + zodiac.slice(1);
                row.innerHTML = `
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="font-heading text-2xl md:text-3xl font-bold text-white">${displayName}</h2>
                        <button class="text-gray-400 hover:text-white transition-colors text-sm">view more →</button>
                    </div>
                    <div class="product-grid-row"></div>
                `;
                productsSection.appendChild(row);
            }

            const grid = row.querySelector('.product-grid-row');
            if (!grid) return;

            productsByZodiac[zodiac].forEach(product => {
                const card = document.createElement('article');
                card.className = 'product-card-small rounded-lg overflow-hidden glass-card fade-in-up visible';
                // Use first zodiac for data attribute (for filtering)
                const firstZodiac = product.zodiac ? product.zodiac.split(',')[0].trim() : 'just-in';
                card.setAttribute('data-zodiac', firstZodiac);
                card.setAttribute('data-title', product.title);
                card.setAttribute('data-product-id', product.id);
                card.setAttribute('data-price', `$${parseFloat(product.price || 0).toFixed(2)}`);
                card.setAttribute('data-category', product.category || 'Just In');
                card.setAttribute('data-img', product.image_url || '');

                const isVideo = product.image_url && (product.image_url.match(/\.(mp4|mov|webm|ogg)$/i) || product.image_url.startsWith('data:video'));
                const price = `$${parseFloat(product.price || 0).toFixed(2)}`;

                card.innerHTML = `
                    <div class="product-card-image-container" role="img" aria-label="${product.title}">
                        ${isVideo
                        ? `<video src="${product.image_url}" class="w-full h-full object-cover" muted loop playsinline aria-hidden="true"></video>`
                        : `<img src="${product.image_url || ''}" alt="${product.title}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400?text=Cosmic+Item'">`
                    }
                        <div class="product-card-overlay">
                            <h3 class="product-card-title">${product.title}</h3>
                            <p class="product-card-price" aria-label="Price: ${price}">${price}</p>
                        </div>
                    </div>
                `;

                grid.appendChild(card);
            });
        });

        // Hide loader
        if (productsLoader) productsLoader.classList.add('hidden');

        // Re-attach handlers and reload images
        productCards = document.querySelectorAll('.product-card-small');
        attachProductCardHandlers();
        loadProductImages();
    }

    // Listen for product updates from dashboard
    window.addEventListener('products-updated', async () => {
        await renderProductsFromStorage();
    });

    // Initial render from storage (after a short delay to let DOM settle)
    setTimeout(async () => {
        const { getProducts } = await import('./api.js');
        const products = await getProducts();
        if (products && products.length > 0) {
            await renderProductsFromStorage();
        }
    }, 500);

    function filterProducts() {
        if (productCards.length === 0) {
            productCards = document.querySelectorAll('.product-card-small');
        }
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let visibleCount = 0;

        productCards.forEach(card => {
            const title = card.dataset.title ? card.dataset.title.toLowerCase() : '';
            const zodiac = card.dataset.zodiac ? card.dataset.zodiac.toLowerCase() : '';
            const category = card.dataset.category ? card.dataset.category.toLowerCase() : '';

            // Search across title, category, and zodiac
            const matchesSearch = !searchTerm ||
                title.includes(searchTerm) ||
                category.includes(searchTerm) ||
                zodiac.includes(searchTerm);

            let matchesFilter = false;
            if (filterMode === 'styles') {
                if (activeStyle === 'all') {
                    matchesFilter = true;
                } else {
                    matchesFilter = category.includes(activeStyle.toLowerCase());
                }
            } else {
                matchesFilter = activeZodiac === 'all' || zodiac.includes(activeZodiac);
            }

            const isVisible = matchesSearch && matchesFilter;
            card.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) visibleCount++;
        });

        // Show toast if no results (only if searching)
        if (visibleCount === 0 && searchTerm) {
            toast.info('No matches found in the cosmos for that search.', 2000);
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterProducts();
            setTimeout(attachProductCardHandlers, 50);
        });
    }

    // Initialize filter buttons
    renderFilterButtons();

    // --- Touch/Swipe Support for Mobile (Horizontal Only) ---
    const productGridRows = document.querySelectorAll('.product-grid-row');

    productGridRows.forEach(productGrid => {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let isHorizontalSwipe = false;

        function handleTouchStart(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isHorizontalSwipe = false;
        }

        function handleTouchMove(e) {
            if (!touchStartX || !touchStartY) return;

            const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

            // Determine if this is a horizontal swipe (more horizontal than vertical)
            if (deltaX > deltaY && deltaX > 10) {
                isHorizontalSwipe = true;
                // Prevent vertical scroll when swiping horizontally
                e.preventDefault();
            } else if (deltaY > deltaX) {
                // Vertical scroll - allow it
                isHorizontalSwipe = false;
            }
        }

        function handleTouchEnd(e) {
            if (!isHorizontalSwipe || !touchStartX) {
                touchStartX = 0;
                touchStartY = 0;
                return;
            }

            touchEndX = e.changedTouches[0].clientX;
            const swipeDistance = touchStartX - touchEndX;
            const scrollAmount = productGrid.clientWidth * 0.8; // Scroll 80% of viewport

            if (Math.abs(swipeDistance) > 50) { // Minimum swipe distance
                if (swipeDistance > 0) {
                    // Swipe left - scroll right
                    productGrid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                } else {
                    // Swipe right - scroll left
                    productGrid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                }
            }

            touchStartX = 0;
            touchStartY = 0;
        }

        // Touch event listeners - only prevent default on horizontal swipes
        productGrid.addEventListener('touchstart', handleTouchStart, { passive: true });
        productGrid.addEventListener('touchmove', handleTouchMove, { passive: false }); // Need to be able to preventDefault
        productGrid.addEventListener('touchend', handleTouchEnd, { passive: true });

        // NO mouse drag support - removed completely
        // Users can scroll with mouse wheel or touch gestures only
    });

    // --- Product Modal Logic ---
    const modalOverlay = document.getElementById('product-modal-overlay');
    const modal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalCategory = document.getElementById('modal-category');
    const modalPrice = document.getElementById('modal-price');
    const modalAddToCart = document.getElementById('modal-add-to-cart');
    const modalCheckout = document.getElementById('modal-checkout');
    const modalStardustEarn = document.getElementById('modal-stardust-earn');
    const modalStardustAmount = document.getElementById('modal-stardust-amount');

    let currentModalProductId = null;
    let currentModalPrice = 0;
    let currentModalImages = [];
    let currentModalImageIndex = 0;

    async function openModal(card) {
        const productId = card.dataset.productId;
        const productImg = card.dataset.img || 'https://placehold.co/400x400/1a1a1a/FFFFFF?text=Product';
        const productTitle = card.dataset.title || 'Product';
        const productCategory = card.dataset.category || 'Just In';
        const productPrice = card.dataset.price || '$99.00';

        // Try to get full product data to check for multiple images
        let productImages = [productImg];
        if (productId) {
            try {
                const { getProductById } = await import('./api.js');
                const product = await getProductById(productId);
                if (product && product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
                    productImages = product.image_urls;
                } else if (product && product.image_url) {
                    productImages = [product.image_url];
                }
            } catch (error) {
                console.warn('Could not fetch product details:', error);
            }
        }

        // Extract numeric price for calculations
        currentModalPrice = parseFloat(productPrice.replace('$', '').replace(',', '')) || 99;
        currentModalProductId = productId;
        currentModalImages = productImages;
        currentModalImageIndex = 0;

        // Set modal content
        updateModalImage();
        if (modalTitle) modalTitle.textContent = productTitle;
        if (modalCategory) modalCategory.textContent = productCategory;
        if (modalPrice) modalPrice.textContent = productPrice;

        // Update navigation controls
        updateModalNavigation();

        // Calculate and show star dust earnings (1 star dust per $1)
        const stardustEarned = Math.floor(currentModalPrice);
        if (modalStardustEarn && modalStardustAmount) {
            modalStardustAmount.textContent = stardustEarned;
            modalStardustEarn.classList.remove('hidden');
        }

        // Store product ID on modal buttons
        if (modalAddToCart) {
            modalAddToCart.dataset.productId = productId;
        }
        if (modalCheckout) {
            modalCheckout.dataset.productId = productId;
        }

        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                modalOverlay.classList.remove('opacity-0');
                if (modal) modal.classList.add('open');
            }, 10);
        }
    }

    function updateModalImage() {
        if (!modalImg || currentModalImages.length === 0) return;

        const imageUrl = currentModalImages[currentModalImageIndex];
        modalImg.src = imageUrl;
        modalImg.onerror = function () {
            this.src = 'https://placehold.co/400x400/1a1a1a/FFFFFF?text=Product';
        };
    }

    function updateModalNavigation() {
        const prevBtn = document.getElementById('modal-img-prev');
        const nextBtn = document.getElementById('modal-img-next');
        const indicators = document.getElementById('modal-img-indicators');

        if (currentModalImages.length <= 1) {
            // Hide navigation if only one image
            if (prevBtn) prevBtn.classList.add('hidden');
            if (nextBtn) nextBtn.classList.add('hidden');
            if (indicators) indicators.classList.add('hidden');
            return;
        }

        // Show navigation buttons
        if (prevBtn) prevBtn.classList.remove('hidden');
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (indicators) indicators.classList.remove('hidden');

        // Update button states
        if (prevBtn) {
            prevBtn.disabled = currentModalImageIndex === 0;
            prevBtn.style.opacity = currentModalImageIndex === 0 ? '0.5' : '1';
        }
        if (nextBtn) {
            nextBtn.disabled = currentModalImageIndex === currentModalImages.length - 1;
            nextBtn.style.opacity = currentModalImageIndex === currentModalImages.length - 1 ? '0.5' : '1';
        }

        // Update indicators
        if (indicators) {
            indicators.innerHTML = '';
            currentModalImages.forEach((img, index) => {
                const dot = document.createElement('button');
                dot.className = `w-2 h-2 rounded-full transition-all ${index === currentModalImageIndex
                    ? 'bg-white'
                    : 'bg-gray-600 hover:bg-gray-500'
                    }`;
                dot.addEventListener('click', () => {
                    currentModalImageIndex = index;
                    updateModalImage();
                    updateModalNavigation();
                });
                indicators.appendChild(dot);
            });
        }
    }

    function nextModalImage() {
        if (currentModalImageIndex < currentModalImages.length - 1) {
            currentModalImageIndex++;
            updateModalImage();
            updateModalNavigation();
        }
    }

    function prevModalImage() {
        if (currentModalImageIndex > 0) {
            currentModalImageIndex--;
            updateModalImage();
            updateModalNavigation();
        }
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.add('opacity-0');
            if (modal) modal.classList.remove('open');
            document.body.style.overflow = '';
            setTimeout(() => {
                modalOverlay.classList.add('hidden');
                currentModalProductId = null;
                currentModalPrice = 0;
            }, 300);
        }
    }

    // Update product cards click handlers - refresh when products are loaded
    function attachProductCardHandlers() {
        const cards = document.querySelectorAll('.product-card-small');
        cards.forEach(card => {
            // Remove existing listeners by cloning
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);

            newCard.addEventListener('click', (e) => {
                // Don't trigger if clicking on a button or link inside
                if (e.target.closest('button') || e.target.closest('a')) {
                    return;
                }
                openModal(newCard);
            });
        });
    }

    // Initial attachment
    setTimeout(() => {
        attachProductCardHandlers();
    }, 100);

    // Modal Add to Cart button
    if (modalAddToCart) {
        modalAddToCart.addEventListener('click', async () => {
            const productId = modalAddToCart.dataset.productId || currentModalProductId;
            if (!productId) {
                toast.error('Product ID not found');
                return;
            }

            try {
                modalAddToCart.disabled = true;
                modalAddToCart.textContent = 'Adding...';

                const { addProductToCart } = await import('./cart.js');
                const success = await addProductToCart(productId, 1);

                if (success) {
                    // Show success feedback
                    modalAddToCart.textContent = 'Added!';
                    setTimeout(() => {
                        closeModal();
                        // Open cart sidebar
                        const rightSidebarCart = document.getElementById('right-sidebar-cart');
                        const rightSidebarOverlay = document.getElementById('right-sidebar-overlay');
                        if (rightSidebarCart && rightSidebarOverlay) {
                            rightSidebarCart.classList.add('open');
                            rightSidebarOverlay.classList.remove('hidden');
                            setTimeout(() => {
                                rightSidebarOverlay.style.opacity = '1';
                            }, 10);
                            document.body.style.overflow = 'hidden';
                        }
                    }, 500);
                } else {
                    toast.error('Failed to add item to cart. Please sign in first.');
                    modalAddToCart.disabled = false;
                    modalAddToCart.textContent = 'Add to Cart';
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                toast.error('An error occurred. Please try again.');
                modalAddToCart.disabled = false;
                modalAddToCart.textContent = 'Add to Cart';
            }
        });
    }

    // Modal Checkout button
    if (modalCheckout) {
        modalCheckout.addEventListener('click', async () => {
            const productId = modalCheckout.dataset.productId || currentModalProductId;
            if (!productId) {
                toast.error('Product ID not found');
                return;
            }

            try {
                modalCheckout.disabled = true;
                modalCheckout.textContent = 'Processing...';

                const { addProductToCart } = await import('./cart.js');
                const success = await addProductToCart(productId, 1);

                if (success) {
                    closeModal();
                    // Open cart sidebar and show payment methods
                    const rightSidebarCart = document.getElementById('right-sidebar-cart');
                    const rightSidebarOverlay = document.getElementById('right-sidebar-overlay');
                    const paymentMethods = document.getElementById('payment-methods');

                    if (rightSidebarCart && rightSidebarOverlay) {
                        rightSidebarCart.classList.add('open');
                        rightSidebarOverlay.classList.remove('hidden');
                        setTimeout(() => {
                            rightSidebarOverlay.style.opacity = '1';
                            if (paymentMethods) {
                                paymentMethods.classList.remove('hidden');
                            }
                        }, 10);
                        document.body.style.overflow = 'hidden';
                    }
                } else {
                    toast.error('Failed to add item to cart. Please sign in first.');
                    modalCheckout.disabled = false;
                    modalCheckout.textContent = 'Checkout';
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                toast.error('An error occurred. Please try again.');
                modalCheckout.disabled = false;
                modalCheckout.textContent = 'Checkout';
            }
        });
    }

    // Modal image navigation
    const modalImgPrev = document.getElementById('modal-img-prev');
    const modalImgNext = document.getElementById('modal-img-next');

    if (modalImgPrev) {
        modalImgPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            prevModalImage();
        });
    }

    if (modalImgNext) {
        modalImgNext.addEventListener('click', (e) => {
            e.stopPropagation();
            nextModalImage();
        });
    }

    // Keyboard navigation for modal images
    document.addEventListener('keydown', (e) => {
        if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevModalImage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextModalImage();
            }
        }
    });

    // Swipe support for modal images on mobile
    if (modalImg) {
        let touchStartX = 0;
        let touchEndX = 0;

        modalImg.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        modalImg.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next image
                    nextModalImage();
                } else {
                    // Swipe right - previous image
                    prevModalImage();
                }
            }
            touchStartX = 0;
            touchEndX = 0;
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }

    // --- Sidebar Toggle Functionality ---
    const leftSidebarTrigger = document.getElementById('left-sidebar-trigger');
    const leftSidebar = document.getElementById('left-sidebar');
    const leftSidebarOverlay = document.getElementById('left-sidebar-overlay');
    const leftSidebarClose = document.getElementById('left-sidebar-close');

    const rightSidebarTrigger = document.getElementById('cart-trigger');
    const rightSidebarCart = document.getElementById('right-sidebar-cart');
    const rightSidebarOverlay = document.getElementById('right-sidebar-overlay');
    const rightSidebarClose = document.getElementById('right-sidebar-close');

    // Accessibility: Set ARIA attributes for sidebar toggles
    if (leftSidebarTrigger) {
        leftSidebarTrigger.setAttribute('aria-expanded', 'false');
        leftSidebarTrigger.setAttribute('aria-controls', 'left-sidebar');
        leftSidebarTrigger.setAttribute('aria-label', 'Open navigation sidebar');
    }
    if (rightSidebarTrigger) {
        rightSidebarTrigger.setAttribute('aria-expanded', 'false');
        rightSidebarTrigger.setAttribute('aria-controls', 'right-sidebar-cart');
        rightSidebarTrigger.setAttribute('aria-label', 'Open shopping cart');
    }

    function openLeftSidebar() {
        if (leftSidebar && leftSidebarOverlay) {
            leftSidebar.classList.add('open');
            leftSidebarOverlay.classList.remove('hidden');
            setTimeout(() => {
                leftSidebarOverlay.style.opacity = '1';
            }, 10);
            document.body.style.overflow = 'hidden';
        }
    }

    function closeLeftSidebar() {
        if (leftSidebar && leftSidebarOverlay) {
            leftSidebar.classList.remove('open');
            leftSidebarOverlay.style.opacity = '0';
            setTimeout(() => {
                leftSidebarOverlay.classList.add('hidden');
            }, 300);
            document.body.style.overflow = '';
        }
    }

    function openRightSidebar() {
        if (rightSidebarCart && rightSidebarOverlay) {
            rightSidebarCart.classList.add('open');
            rightSidebarOverlay.classList.remove('hidden');
            setTimeout(() => {
                rightSidebarOverlay.style.opacity = '1';
            }, 10);
            document.body.style.overflow = 'hidden';
        }
    }

    function closeRightSidebar() {
        if (rightSidebarCart && rightSidebarOverlay) {
            rightSidebarCart.classList.remove('open');
            rightSidebarOverlay.style.opacity = '0';
            setTimeout(() => {
                rightSidebarOverlay.classList.add('hidden');
            }, 300);
            document.body.style.overflow = '';
        }
    }

    if (leftSidebarTrigger) {
        leftSidebarTrigger.addEventListener('click', openLeftSidebar);
    }
    if (leftSidebarClose) {
        leftSidebarClose.addEventListener('click', closeLeftSidebar);
    }
    if (leftSidebarOverlay) {
        leftSidebarOverlay.addEventListener('click', closeLeftSidebar);
    }

    if (rightSidebarTrigger) {
        rightSidebarTrigger.addEventListener('click', openRightSidebar);
    }
    if (rightSidebarClose) {
        rightSidebarClose.addEventListener('click', closeRightSidebar);
    }
    if (rightSidebarOverlay) {
        rightSidebarOverlay.addEventListener('click', closeRightSidebar);
    }

    // Close sidebars on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLeftSidebar();
            closeRightSidebar();
        }
    });

    // Dark mode only - no theme toggle
    document.documentElement.setAttribute('data-theme', 'dark');

    // --- Initialize Authentication (temporarily disabled) ---
    // import('./auth.js').then(({ initAuth }) => {
    //     initAuth();
    // }).catch(err => {
    //     console.warn('Auth module not available:', err);
    // });

    // --- Initialize Cart ---
    import('./cart.js').then(({ initCart }) => {
        initCart();
    }).catch(err => {
        console.warn('Cart module not available:', err);
    });

    // --- Initialize Star Dust ---
    import('./stardust.js').then(({ initStardust }) => {
        initStardust();
    }).catch(err => {
        console.warn('Star dust module not available:', err);
    });

    // --- Initialize Payments ---
    import('./payments.js').then(({ initPayments }) => {
        initPayments();
    }).catch(err => {
        console.warn('Payments module not available:', err);
    });

    // --- Mobile Keyboard Handling for Prompt Bar v2 ---
    // Note: searchInput is already declared above in Product Filter Logic section
    const searchPrompt = document.getElementById('search-prompt');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    // Clear search button functionality
    if (clearSearchBtn && searchInput) {
        function updateClearButton() {
            if (searchInput.value.trim().length > 0) {
                clearSearchBtn.classList.remove('hidden');
            } else {
                clearSearchBtn.classList.add('hidden');
            }
        }

        searchInput.addEventListener('input', () => {
            updateClearButton();
            filterProducts(); // Also filter when typing
        });
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            filterProducts();
            searchInput.focus();
        });

        // Initial state
        updateClearButton();
    }

    // Improved keyboard handling
    if (searchPrompt && searchInput) {
        let initialViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        let isKeyboardOpen = false;

        function handleViewportResize() {
            if (!searchPrompt || !searchInput) return;

            const currentViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            const viewportHeightDiff = initialViewportHeight - currentViewportHeight;

            // If keyboard is open (viewport shrunk significantly)
            if (viewportHeightDiff > 150 && !isKeyboardOpen) {
                isKeyboardOpen = true;
                // Keep at bottom but ensure it's visible above keyboard
                searchPrompt.style.bottom = '0';
                // Scroll input into view if needed
                setTimeout(() => {
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            } else if (viewportHeightDiff <= 150 && isKeyboardOpen) {
                isKeyboardOpen = false;
                searchPrompt.style.bottom = '0';
            }
        }

        // Use Visual Viewport API if available (better for mobile)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
            window.visualViewport.addEventListener('scroll', handleViewportResize);
        } else {
            // Fallback for browsers without Visual Viewport API
            window.addEventListener('resize', handleViewportResize);
        }

        // Handle input focus/blur
        searchInput.addEventListener('focus', () => {
            setTimeout(() => {
                handleViewportResize();
                // Ensure prompt stays visible
                searchPrompt.style.bottom = '0';
            }, 300);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                isKeyboardOpen = false;
                searchPrompt.style.bottom = '0';
            }, 300);
        });
    }

    // --- Button Loading Helper ---
    function setButtonLoading(btn, isLoading, originalText) {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.setAttribute('data-original-text', btn.innerHTML);
            btn.innerHTML = `<span class="flex items-center justify-center gap-2"><div class="loading-spinner w-4 h-4"></div> Loading...</span>`;
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.getAttribute('data-original-text') || originalText || 'Submit';
        }
    }

    // --- Checkout Button Handler ---
    const checkoutBtn = document.getElementById('checkout-btn');
    const paymentMethods = document.getElementById('payment-methods');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (paymentMethods) {
                paymentMethods.classList.remove('hidden');
            }
        });
    }

    // Payment method handlers
    const payStripe = document.getElementById('pay-stripe');
    const payVenmo = document.getElementById('pay-venmo');
    const payCashApp = document.getElementById('pay-cashapp');
    const payCrypto = document.getElementById('pay-crypto');

    if (payStripe) {
        payStripe.addEventListener('click', async () => {
            const { getCartItemsList, getCartTotal } = await import('./cart.js');
            const { checkoutWithStripe } = await import('./payments.js');
            const items = getCartItemsList();
            const total = getCartTotal();
            setButtonLoading(payStripe, true);
            await checkoutWithStripe(items, total);
            setButtonLoading(payStripe, false);
        });
    }

    if (payVenmo) {
        payVenmo.addEventListener('click', async () => {
            const { getCartItemsList, getCartTotal } = await import('./cart.js');
            const { checkoutWithVenmo } = await import('./payments.js');
            const items = getCartItemsList();
            const total = getCartTotal();
            setButtonLoading(payVenmo, true);
            await checkoutWithVenmo(items, total);
            setButtonLoading(payVenmo, false);
        });
    }

    if (payCashApp) {
        payCashApp.addEventListener('click', async () => {
            const { getCartItemsList, getCartTotal } = await import('./cart.js');
            const { checkoutWithCashApp } = await import('./payments.js');
            const items = getCartItemsList();
            const total = getCartTotal();
            setButtonLoading(payCashApp, true);
            await checkoutWithCashApp(items, total);
            setButtonLoading(payCashApp, false);
        });
    }

    if (payCrypto) {
        payCrypto.addEventListener('click', async () => {
            const { getCartItemsList, getCartTotal } = await import('./cart.js');
            const { checkoutWithCrypto } = await import('./payments.js');
            const items = getCartItemsList();
            const total = getCartTotal();
            setButtonLoading(payCrypto, true);
            await checkoutWithCrypto(items, total);
            setButtonLoading(payCrypto, false);
        });
    }

    // --- Auth Form Handlers ---
    const authSubmit = document.getElementById('auth-submit');
    const authEmail = document.getElementById('auth-email');
    const authPhone = document.getElementById('auth-phone');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (authSubmit) {
        authSubmit.addEventListener('click', async () => {
            const email = authEmail?.value;
            const phone = authPhone?.value;

            if (!email && !phone) {
                toast.warning('Please enter an email or phone number');
                return;
            }

            const { signInWithEmail, signUpWithEmail, signInWithPhone } = await import('./auth.js');

            setButtonLoading(authSubmit, true);
            if (email) {
                // For demo, create account if doesn't exist
                // In production, separate sign in/sign up flows
                const password = prompt('Enter password (or leave blank to create account)');
                if (password) {
                    const result = await signInWithEmail(email, password);
                    if (!result.success) {
                        toast.info('Sign in failed. Creating new account...');
                        await signUpWithEmail(email, password, phone);
                    }
                } else {
                    await signUpWithEmail(email, 'temp123', phone);
                }
            } else if (phone) {
                await signInWithPhone(phone);
                toast.info('Check your phone for OTP code');
                const token = prompt('Enter OTP code:');
                if (token) {
                    const { verifyOTP } = await import('./auth.js');
                    await verifyOTP(phone, token);
                }
            }
            setButtonLoading(authSubmit, false);
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            const { signOut } = await import('./auth.js');
            await signOut();
        });
    }
});


