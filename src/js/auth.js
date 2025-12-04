// Authentication Management
import { supabaseClient } from './supabase.js';
import { createOrUpdateProfile, getUserProfile } from './api.js';

const zodiacSigns = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

// Initialize auth state
let currentUser = null;

// Get current user
export async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

// Sign in with email
export async function signInWithEmail(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        console.error('Sign in error:', error);
        return { success: false, error };
    }
    
    currentUser = data.user;
    await loadUserProfile();
    return { success: true, user: data.user };
}

// Sign up with email
export async function signUpWithEmail(email, password, phone = null) {
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        phone
    });
    
    if (error) {
        console.error('Sign up error:', error);
        return { success: false, error };
    }
    
    currentUser = data.user;
    return { success: true, user: data.user };
}

// Sign in with phone (OTP)
export async function signInWithPhone(phone) {
    const { data, error } = await supabaseClient.auth.signInWithOtp({
        phone,
        options: {
            channel: 'sms'
        }
    });
    
    if (error) {
        console.error('Phone sign in error:', error);
        return { success: false, error };
    }
    
    return { success: true, message: 'OTP sent to your phone' };
}

// Verify OTP
export async function verifyOTP(phone, token) {
    const { data, error } = await supabaseClient.auth.verifyOtp({
        phone,
        token,
        type: 'sms'
    });
    
    if (error) {
        console.error('OTP verification error:', error);
        return { success: false, error };
    }
    
    currentUser = data.user;
    await loadUserProfile();
    return { success: true, user: data.user };
}

// Sign out
export async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Sign out error:', error);
        return { success: false, error };
    }
    currentUser = null;
    return { success: true };
}

// Update user zodiac
export async function updateUserZodiac(zodiac) {
    if (!zodiacSigns.includes(zodiac.toLowerCase())) {
        return { success: false, error: 'Invalid zodiac sign' };
    }
    
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }
    
    const profile = await createOrUpdateProfile(user.id, { zodiac: zodiac.toLowerCase() });
    if (!profile) {
        return { success: false, error: 'Failed to update profile' };
    }
    
    return { success: true, profile };
}

// Load user profile and update UI
export async function loadUserProfile() {
    const user = await getCurrentUser();
    if (!user) {
        updateAuthUI(null);
        return null;
    }
    
    const profile = await getUserProfile(user.id);
    if (!profile) {
        // Create profile if it doesn't exist
        await createOrUpdateProfile(user.id, {
            email: user.email,
            phone: user.phone
        });
    }
    
    updateAuthUI(user, profile);
    return profile;
}

// Update authentication UI
function updateAuthUI(user, profile = null) {
    const authForm = document.getElementById('auth-form');
    const userInfo = document.getElementById('user-info');
    const userEmailDisplay = document.getElementById('user-email-display');
    const userZodiac = document.getElementById('user-zodiac');
    const zodiacSelector = document.getElementById('zodiac-selector');
    const horoscopeSection = document.getElementById('horoscope-section');
    const stardustSection = document.getElementById('stardust-section');
    const stardustBalance = document.getElementById('stardust-balance');
    
    if (user) {
        // User is signed in
        if (authForm) authForm.classList.add('hidden');
        if (userInfo) {
            userInfo.classList.remove('hidden');
            if (userEmailDisplay) {
                userEmailDisplay.textContent = user.email || user.phone || 'User';
            }
        }
        
        // Update zodiac display
        if (profile?.zodiac) {
            if (userZodiac) {
                userZodiac.textContent = profile.zodiac.charAt(0).toUpperCase() + profile.zodiac.slice(1);
            }
            if (zodiacSelector) zodiacSelector.classList.add('hidden');
            if (horoscopeSection) horoscopeSection.classList.remove('hidden');
            // Load horoscope
            loadHoroscope(profile.zodiac);
        } else {
            if (zodiacSelector) {
                zodiacSelector.classList.remove('hidden');
                populateZodiacSelector();
            }
        }
        
        // Update star dust balance
        if (stardustSection) stardustSection.classList.remove('hidden');
        if (stardustBalance) {
            stardustBalance.textContent = profile?.stardust_balance || 0;
        }
    } else {
        // User is not signed in
        if (authForm) authForm.classList.remove('hidden');
        if (userInfo) userInfo.classList.add('hidden');
        if (zodiacSelector) zodiacSelector.classList.add('hidden');
        if (horoscopeSection) horoscopeSection.classList.add('hidden');
        if (stardustSection) stardustSection.classList.add('hidden');
    }
}

// Populate zodiac selector
function populateZodiacSelector() {
    const selector = document.getElementById('zodiac-selector');
    if (!selector) return;
    
    selector.innerHTML = '';
    zodiacSigns.forEach(sign => {
        const button = document.createElement('button');
        button.textContent = sign.charAt(0).toUpperCase() + sign.slice(1);
        button.dataset.zodiac = sign;
        button.addEventListener('click', async () => {
            const result = await updateUserZodiac(sign);
            if (result.success) {
                // Update UI
                document.querySelectorAll('#zodiac-selector button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                button.classList.add('selected');
                await loadUserProfile();
            }
        });
        selector.appendChild(button);
    });
}

// Load horoscope (placeholder - can be replaced with API)
async function loadHoroscope(zodiac) {
    const horoscopeText = document.getElementById('horoscope-text');
    if (!horoscopeText) return;
    
    // Placeholder horoscope - replace with actual API call
    const horoscopes = {
        aries: "Today brings new opportunities. Trust your instincts and take bold action.",
        taurus: "Stability is key today. Focus on your goals and maintain your routine.",
        gemini: "Communication is highlighted. Express your thoughts clearly and listen actively.",
        cancer: "Emotional clarity emerges. Trust your feelings and nurture your relationships.",
        leo: "Your creativity shines. Share your talents and inspire others.",
        virgo: "Attention to detail pays off. Organize your thoughts and plans.",
        libra: "Balance is essential. Find harmony between your needs and others'.",
        scorpio: "Transformation is possible. Embrace change and let go of what no longer serves.",
        sagittarius: "Adventure calls. Explore new ideas and expand your horizons.",
        capricorn: "Hard work yields results. Stay disciplined and focused on your ambitions.",
        aquarius: "Innovation is favored. Think outside the box and embrace uniqueness.",
        pisces: "Intuition guides you. Trust your inner wisdom and creative vision."
    };
    
    horoscopeText.textContent = horoscopes[zodiac.toLowerCase()] || "The stars align in your favor today.";
}

// Initialize auth on page load
export async function initAuth() {
    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            currentUser = session?.user || null;
            await loadUserProfile();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            updateAuthUI(null);
        }
    });
    
    // Load initial user state
    await loadUserProfile();
}

// Export zodiac signs for use in other modules
export { zodiacSigns };

