// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import configApiKey from './config.js';

// --- V2.0 DATABASE DEFINITIONS ---

// A constant array listing all 21 attributes.
const characterImageDatabase = {
    "base": {
        "neutral": "https://preview.redd.it/starter-outfit-started-poses-v0-nt3w0wjfhxzf1.jpg?width=320&crop=smart&auto=webp&s=0aaa6da78484c4762040417ea29f63aaef61fed0",
        "curious": "https://preview.redd.it/starter-outfit-started-poses-v0-erop40w9hxzf1.jpg?width=320&crop=smart&auto=webp&s=30ff4c78700f7716ce4034529e4ac49aae98fac4"
    },
    "sweater+skirt": {
        "neutral": "https://preview.redd.it/starter-outfit-started-poses-v0-xigp5rlkixzf1.jpg?width=320&crop=smart&auto=webp&s=bba1b6ad44351db78abb37a00e363f6355a946d5",
        "curious": "https://preview.redd.it/starter-outfit-started-poses-v0-ebk3sh8bhxzf1.jpg?width=320&crop=smart&auto=webp&s=af6b82081106c6a871c7bd4f556a4f3ff01c4beb"
    }
};
const ALL_STATS = [
    // Mindset
    'cautious', 'curious', 'bold',
    // Social
    'charming', 'intimidating', 'alluring',
    'honorable', 'dishonorable',
    'secure', 'insecure',
    'reserved', 'expressive',
    // Skills
    'logical', 'creative', 'perceptive',
    'agile', 'clumsy',
    'enduring', 'feeble',
    'eloquent', 'stuttering'
];

// Maps the 21 stats to the three core mindsets.
const mindsetCategories = {
    bold: ['bold', 'intimidating', 'alluring', 'dishonorable', 'expressive', 'agile', 'enduring', 'eloquent'],
    curious: ['curious', 'charming', 'secure', 'logical', 'creative', 'perceptive'],
    cautious: ['cautious', 'honorable', 'insecure', 'reserved', 'clumsy', 'feeble', 'stuttering']
};

// --- Firebase & API Globals ---
// NOTE: These variables are 'undefined' in a local environment.
// You will need to replace them with your actual Firebase config and API key for local testing.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const apiKey = configApiKey || "";
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}'); // <-- PASTE YOUR FIREBASE CONFIG OBJECT HERE
let db, auth, userId;

// Base image for the character model
const BASE_MODEL_URL = "https://placehold.co/320x427/27272a/7f7f7f?text=Base+Model"; // Placeholder for 'added-04.jpg'

/**
 * The "Armory" (Clothing Database)
 * NOW INCLUDES 'imageUrl' for the image generation API.
 * Using placeholders as we don't have public URLs for the assets yet.
 */
const clothingDatabase = {
    "underwear": {
        "boyshorts": { 
            name: "Boy-Shorts", 
            stats: { cautious: 1, bold: -1, curious: 0 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Boyshorts"
        },
        "thong": { 
            name: "Thong", 
            stats: { cautious: -1, bold: 2, curious: 1 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Thong"
        },
        "none": { 
            name: "Commando", 
            stats: { cautious: -2, bold: 3, curious: 0 },
            imageUrl: null // No image for 'none'
        }
    },
    "bra": {
        "none": { 
            name: "No Bra", 
            stats: { cautious: -1, bold: 1, curious: 1 },
            imageUrl: null
        },
        "sports": { 
            name: "Sports Bra", 
            stats: { cautious: 2, bold: -1, curious: 0 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Sports+Bra"
        },
        "pushup": {
            name: "Push-up Bra",
            stats: { cautious: 0, bold: 2, curious: 0 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Pushup+Bra"
        }
    },
    "outfit_top": {
        "sweater": {
            name: "Baggy Sweater",
            stats: { reserved: 2, secure: 1, cautious: 2, creative: -1, feeble: 1 },
            imageUrl: "https://preview.redd.it/new-clothes-im-going-to-stop-soon-and-buckle-down-on-the-v0-crg60v296tzf1.jpg?width=320&crop=smart&auto=webp&s=b716074f2fd74a105c7da6db61385d3c13021033"
        },
        "top": {
            name: "Form-Fitting Top",
            stats: { cautious: -1, bold: 2, curious: 0 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Fitted+Top"
        }
    },
    "outfit_bottom": {
        "jeans": {
            name: "Tight Blue Jeans",
            stats: { alluring: 2, expressive: -1, bold: 1, insecure: 1, clumsy: 1 },
            imageUrl: "https://preview.redd.it/new-clothes-im-going-to-stop-soon-and-buckle-down-on-the-v0-y84gfvs76tzf1.jpg?width=320&crop=smart&auto=webp&s=7e53684b4209fc4abe92b083b79961778fe3548a"
        },
        "skirt": {
            name: "Plaid Skirt",
            stats: { creative: 2, alluring: 1, reserved: -1 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Skirt"
        },
        "trousers": {
            name: "Loose Linen Trousers",
            stats: { cautious: 0, bold: 0, curious: 0 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Trousers"
        }
    },
    "outfit_all": {
        "dress": {
            name: "Simple Dress",
            stats: { cautious: 0, bold: 2, curious: 1 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Dress"
        }
    },
    "shoes": { // Added shoes as a category
        "chucks": {
            name: "White Converse",
            stats: { enduring: 2, honorable: 1, creative: 1, eloquent: -1, feeble: -1 },
            imageUrl: "https://preview.redd.it/new-clothes-im-going-to-stop-soon-and-buckle-down-on-the-v0-ay7utzd86tzf1.jpg?width=320&crop=smart&auto=webp&s=6499de54015a94400f9ddf58b7f20b274baa4c71"
        },
        "heels": {
            name: "Red Stiletto Pump",
            stats: { cautious: 0, bold: 0, curious: 0 },
            imageUrl: "https://placehold.co/320x427/ffffff/333333?text=Heels"
        },
        "none": {
            name: "Barefoot",
            stats: { cautious: 0, bold: 0, curious: 0 },
            imageUrl: null
        }
    },
    "intent": {
        "intent_cautious": {
            name: "Intent: Cautious",
            stats: { cautious: 1, bold: 0, curious: 0 },
            imageUrl: null
        },
        "intent_curious": {
            name: "Intent: Curious",
            stats: { cautious: 0, bold: 0, curious: 1 },
            imageUrl: null
        },
        "intent_bold": {
            name: "Intent: Bold",
            stats: { cautious: 0, bold: 1, curious: 0 },
            imageUrl: null
        }
    }
};

/**
 * The Story Data
 * This object defines the scenes and choices.
 */
const storyData = {
    "S1_08": {
        // Text is now generated by AI
        choices: [
            { text: "Boy-Shorts", key: "boyshorts", category: "underwear", nextScene: "S1_09" },
            { text: "Thong", key: "thong", category: "underwear", nextScene: "S1_09" },
            { text: "Commando", key: "none", category: "underwear", nextScene: "S1_09" }
        ]
    },
    "S1_09": {
        // Text is now generated by AI
        choices: [
            { text: "Sports Bra", key: "sports", category: "bra", nextScene: "S1_10" },
            { text: "Push-up Bra", key: "pushup", category: "bra", nextScene: "S1_10" },
            { text: "No Bra", key: "none", category: "bra", nextScene: "S1_10" }
        ]
    },
    "S1_10": {
        // Text is now generated by AI
        choices: [
            { text: "Hoodie and Jeans", key: ["hoodie", "jeans"], category: ["outfit_top", "outfit_bottom"], nextScene: "S1_11" },
            { text: "Fitted Top and Skirt", key: ["top", "skirt"], category: ["outfit_top", "outfit_bottom"], nextScene: "S1_11" },
            { text: "Simple Dress", key: "dress", category: "outfit_all", nextScene: "S1_11" }
        ]
    },
    "S1_11": {
        // Text is now generated by AI
        choices: [
            { text: "With Caution. I need to be careful.", key: "intent_cautious", category: "intent", nextScene: "S1_END" },
            { text: "With Curiosity. What will happen?", key: "intent_curious", category: "intent", nextScene: "S1_END" },
            { text: "With Boldness. This is my day.", key: "intent_bold", category: "intent", nextScene: "S1_END" }
        ]
    },
    "S1_END": {
        // Text is now generated by AI
        choices: [
            { text: "Start Over (Reset Prototype)", key: "S1_08", category: "reset", nextScene: "S1_08" }
        ]
    }
};

const DEFAULT_SCENE_IMAGE_URL = "https://preview.redd.it/what-do-yall-think-new-logo-time-v0-8zmlko0klrzf1.jpeg?width=640&crop=smart&auto=webp&s=b37e388430fce2ecd91ae19c637dc7df9930ca58";

const narrativeTimeline = {
    "P1": {
        narrative: "[P1: The Awakening] The morning light filters through the blinds. Another day. How will you face it?",
        imageUrl: "https://placehold.co/600x400/1a1a1a/ffffff?text=Bedroom",
        choices: [
            { text: "With caution. Keep your head down.", mindset: "cautious", nextPart: "P2" },
            { text: "With curiosity. See what happens.", mindset: "curious", nextPart: "P2" },
            { text: "With boldness. Take control.", mindset: "bold", nextPart: "P2" }
        ]
    },
    "P2": {
        narrative: "[P2: The Commute] Time to get to the university. How will you travel?",
        imageUrl: "https://placehold.co/600x400/2a2a2a/ffffff?text=On+The+Way",
        choices: [
            { text: "Take the bus. It's crowded, but efficient.", flag: "commuteMethod", value: "bus", nextPart: "P3" },
            { text: "Ride your bike. It's risky, but freeing.", flag: "commuteMethod", value: "bike", nextPart: "P3" },
            { text: "Walk. It's slow, but gives you time to think.", flag: "commuteMethod", value: "walk", nextPart: "P3" }
        ]
    },
    "P3": {
        narrative: "[P3: The Work Drop] You pass by Alex's office. They're a minor rival, a social obstacle.",
        imageUrl: "https://placehold.co/600x400/3a3a3a/ffffff?text=Alex's+Office",
        emotion: "curious",
        choices: [
            { text: "Avoid eye contact and hurry past.", flag: "alexRelationship", value: "avoid", nextPart: "P4" },
            { text: "Slow down and observe their interaction.", flag: "alexRelationship", value: "observe", nextPart: "P4" },
            { text: "Offer a sharp, confrontational greeting.", flag: "alexRelationship", value: "confront", nextPart: "P4" }
        ]
    },
    "P4": {
        narrative: "[P4: Business Class] The lecture is underway. What is your role in the discussion?",
        imageUrl: "https://placehold.co/600x400/4a4a4a/ffffff?text=Classroom",
        choices: [
            { text: "Stay quiet and just take notes.", flag: "participation", value: "quiet", nextPart: "P5" },
            { text: "Listen intently, analyzing every point.", flag: "participation", value: "analytical", nextPart: "P5" },
            { text: "Be vocal, challenging the professor's ideas.", flag: "participation", value: "vocal", nextPart: "P5" }
        ]
    },
    "P5": {
        narrative: "[P5: Wrestling Practice] The gym is hot, the atmosphere intense. You're paired with a stronger opponent. How do you react to their physical dominance?",
        imageUrl: "https://placehold.co/600x400/5a5a5a/ffffff?text=Gym",
        emotion: "curious",
        choices: [
            { text: "(Cautious) Yield, feeling the humiliation of the pin.", mindset: "cautious", flag: "practiceControl", value: "humiliated", nextPart: "P6" },
            { text: "(Curious) Analyze their technique, even in defeat.", mindset: "curious", flag: "practiceControl", value: "analyzed", nextPart: "P6" },
            { text: "(Bold) Use leverage and grit to turn the tables, dominating them.", mindset: "bold", flag: "practiceControl", value: "dominant", nextPart: "P6" }
        ]
    },
    "P6": {
        narrative: "[P6: Confession & Prep] The night looms. You're meeting Mitch at the bar. He confessed feelings for you recently. How do you prepare?",
        imageUrl: "https://placehold.co/600x400/6a6a6a/ffffff?text=Getting+Ready",
        choices: [
            { text: "Pick something from your closet. Keep it friendly.", flag: "mitchBond", value: "friend", nextPart: "P7" },
            { text: "Go shopping. Buy something ambiguous, something that sends a blurry signal.", flag: "mitchBond", value: "blurry", nextPart: "P7" },
            { text: "Call him. Suggest you're both looking for an intimate victory tonight.", flag: "mitchBond", value: "intimate", nextPart: "P7" }
        ]
    },
    "P7": {
        narrative: "[P7: The Bar] The noise, the lights, the people. It's the climax of the day.",
        imageUrl: "https://placehold.co/600x400/7a7a7a/ffffff?text=The+Bar",
        choices: [
            { text: "Focus on Mitch. He needs your support.", flag: "conflictWinner", value: "mitch", nextPart: "END" },
            { text: "Your eyes meet a compelling stranger across the room. Invite them over.", flag: "conflictWinner", value: "stranger", nextPart: "END" }
        ]
    }
};

// --- V2.0 GAME LOGIC ---

/**
 * The "Character Sheet" (Player Stats)
 * This object holds the current state of the game.
 */
let gameState = {
    stats: {
        cautious: 0, curious: 0, bold: 0,
        charming: 0, intimidating: 0, alluring: 0,
        honorable: 0, dishonorable: 0,
        secure: 0, insecure: 0,
        reserved: 0, expressive: 0,
        logical: 0, creative: 0, perceptive: 0,
        agile: 0, clumsy: 0,
        enduring: 0, feeble: 0,
        eloquent: 0, stuttering: 0
    },
    equipped: {
        bra: null,
        underwear: null,
        outfit_top: null,
        outfit_bottom: null,
        outfit_all: null,
        shoes: "chucks", // Defaulting to having shoes on
        intent: null
    },
    currentScene: "S1_08",
    userId: null, // Will be set after auth

    // --- New V3 Narrative State ---
    // Mindset scores, calculated from clothing at the start.
    mindset_cautious: 0,
    mindset_curious: 0,
    mindset_bold: 0,

    // Narrative Timeline Flags
    currentPart: "P1",
    commuteMethod: null,      // Set in P2: "bike", "bus", or "walk"
    alexRelationship: null,   // Set in P3: "avoid", "observe", or "confront"
    isLateForClass: false,    // Set based on P2 choice ("walk" makes it true)
    participation: null,      // Set in P4: "quiet", "analytical", or "vocal"
    practiceControl: null,    // Set in P5: "humiliated", "analyzed", or "dominant"
    mitchBond: null,          // Set in P6: "friend", "blurry", or "intimate"
    conflictWinner: null,     // Set in P7: "mitch" or "stranger"
    finalBond: null           // Set in P7: e.g., "guiltyDuty", "sanctuary"
};

// --- DOM Element References ---
let narrativeContainer, choicesContainer, characterImage, sceneImage, loadingOverlay, saveButton, loadButton, beginButton, continueButton, wardrobeButton;

// Set a maximum value for the meters to calculate percentages
const MAX_STAT_VALUE = 10;

const wardrobeData = {
    "top": {
        narrative: "What will Lily wear on top?",
        choices: [
            { text: "Baggy Sweater", key: "sweater", category: "outfit_top", nextStep: "bottom", functional: true },
            { text: "Form-Fitting Top", key: "top", category: "outfit_top", nextStep: "bottom", functional: false }
        ]
    },
    "bottom": {
        narrative: "What will Lily wear on the bottom?",
        choices: [
            { text: "Plaid Skirt", key: "skirt", category: "outfit_bottom", nextStep: "shoes", functional: true },
            { text: "Loose Linen Trousers", key: "trousers", category: "outfit_bottom", nextStep: "shoes", functional: false }
        ]
    },
    "shoes": {
        narrative: "What shoes will Lily wear?",
        choices: [
            { text: "White Converse", key: "chucks", category: "shoes", nextStep: "end", functional: true },
            { text: "Red Stiletto Pump", key: "heels", category: "shoes", nextStep: "end", functional: false }
        ]
    }
};

/**
 * Recalculates the player's stats based on equipped items.
 */
function recalculateStats() {
    // Create a new stats object initialized to zero
    let newStats = {};
    ALL_STATS.forEach(stat => newStats[stat] = 0);

    // Loop through every slot in 'equipped'
    for (const category in gameState.equipped) {
        const itemId = gameState.equipped[category];
        if (itemId) {
            const item = clothingDatabase[category]?.[itemId];
            if (item && item.stats) {
                // Add item's stats to the total
                for (const stat in item.stats) {
                    if (newStats.hasOwnProperty(stat)) {
                        newStats[stat] += item.stats[stat];
                    }
                }
            }
        }
    }
    
    // Update the global gameState
    gameState.stats = newStats;
}

/**
 * Calculates the initial mindset scores based on categorized stats from clothing.
 * This is called once after the wardrobe selection is complete.
 */
function calculateInitialMindsetScores() {
    // Ensure mindset scores are part of gameState and reset them
    gameState.mindset_cautious = 0;
    gameState.mindset_curious = 0;
    gameState.mindset_bold = 0;

    // Sum stats for each mindset category
    for (const mindset in mindsetCategories) {
        let total = 0;
        mindsetCategories[mindset].forEach(stat => {
            if (gameState.stats.hasOwnProperty(stat)) {
                total += gameState.stats[stat];
            }
        });
        // Assign the calculated total to the corresponding gameState property
        gameState[`mindset_${mindset}`] = total;
    }

    console.log("Initial mindset scores calculated:", {
        cautious: gameState.mindset_cautious,
        curious: gameState.mindset_curious,
        bold: gameState.mindset_bold
    });
}

/**
 * Updates the UI meters based on the current gameState.
 */
function updateMeters() {
    const meterBarCautious = document.getElementById('meter-bar-cautious');
    const meterBarCurious = document.getElementById('meter-bar-curious');
    const meterBarBold = document.getElementById('meter-bar-bold');

    if (meterBarCautious) {
        const cautiousPercent = Math.max(0, Math.min(100, (gameState.stats.cautious / MAX_STAT_VALUE) * 100));
        meterBarCautious.style.width = `${cautiousPercent}%`;
    }
    if (meterBarCurious) {
        const curiousPercent = Math.max(0, Math.min(100, (gameState.stats.curious / MAX_STAT_VALUE) * 100));
        meterBarCurious.style.width = `${curiousPercent}%`;
    }
    if (meterBarBold) {
        const boldPercent = Math.max(0, Math.min(100, (gameState.stats.bold / MAX_STAT_VALUE) * 100));
        meterBarBold.style.width = `${boldPercent}%`;
    }
}

/**
 * Updates the character image based on the current outfit and narrative emotion.
 */
function updateCharacterImage() {
    // Query the DOM for the element each time to avoid stale references.
    const characterImageEl = document.getElementById('character-image');
    if (!characterImageEl) {
        console.error("Could not find the 'character-image' element.");
        return;
    }

    const part = narrativeTimeline[gameState.currentPart];
    const emotion = part?.emotion || "neutral"; // Default to neutral if no emotion is specified

    let outfitKey = "base"; // Default to the base nude model

    // Create an outfit key if a top and bottom are equipped
    const top = gameState.equipped.outfit_top;
    const bottom = gameState.equipped.outfit_bottom;
    if (top && bottom) {
        outfitKey = `${top}+${bottom}`;
    }
    // TODO: Add logic for 'outfit_all' (dresses) if needed.

    // --- Image URL Lookup with Fallbacks ---
    let imageUrl = characterImageDatabase.base.neutral; // Ultimate fallback

    const outfitImages = characterImageDatabase[outfitKey];
    const baseImages = characterImageDatabase.base;

    if (outfitImages) {
        // 1. Try to find the specific emotion for the outfit
        if (outfitImages[emotion]) {
            imageUrl = outfitImages[emotion];
        }
        // 2. Fallback to the neutral version of the outfit
        else if (outfitImages.neutral) {
            imageUrl = outfitImages.neutral;
        }
    } else {
        // 3. If outfit not found, fallback to the base model for the specific emotion
        if (baseImages[emotion]) {
            imageUrl = baseImages[emotion];
        }
        // 4. The final fallback is the neutral base model (already set)
    }

    // Update the image on the screen
    characterImageEl.src = imageUrl;
    console.log(`Updating character image. Emotion: ${emotion}, Outfit: ${outfitKey}, URL: ${imageUrl}`);
}


/**
 * Toggles the loading overlay.
 */
function setLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
    } else {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.classList.remove('flex');
    }
}

// --- AI API FUNCTIONS ---

/**
 * Helper function to fetch an image from a URL and convert it to a Gemini-compatible format.
 * NOTE: This will not work if the images are on a different domain without CORS enabled.
 * A proxy is used as a workaround for this prototype.
 */
async function urlToGenerativePart(url) {
    // A proxy is used to bypass CORS issues with placehold.co in a browser environment.
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type;
    const arrayBuffer = await blob.arrayBuffer();
    // A classic way to Base64-encode an ArrayBuffer in the browser.
    const base64Data = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    return {
        inlineData: {
            data: base64Data,
            mimeType
        }
    };
}

/**
 * (AI TASK 1) Generates the character image by combining layers.
 * This has been refactored to use gemini-pro-vision and sends base64 image data directly.
 */
async function generateCharacterImage() {
    if (!apiKey) {
        console.warn("Missing API key, skipping image generation.");
        characterImage.src = "https://placehold.co/320x427/27272a/ffffff?text=Image+Generation+Skipped+(No+API+Key)";
        return;
    }
    setLoading(true);
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const apiUrl = `${proxyUrl}https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;
    
    try {
        // --- 1. Collect Image URLs ---
        let imageUrls = [BASE_MODEL_URL]; // Start with the base model
        let clothingDesc = [];

        for (const category in gameState.equipped) {
            const itemId = gameState.equipped[category];
            if (itemId) {
                const item = clothingDatabase[category]?.[itemId];
                if (item && item.imageUrl) {
                    imageUrls.push(item.imageUrl);
                    clothingDesc.push(item.name);
                }
            }
        }

        // --- 2. Fetch and Prepare Image Data ---
        // Use Promise.all to fetch all images concurrently using the helper.
        console.log("Fetching images for generation:", imageUrls);
        const imageParts = await Promise.all(imageUrls.map(url => urlToGenerativePart(url)));
        console.log("Image parts prepared successfully.");

        // --- 3. Construct the Prompt and Payload ---
        const userPrompt = `Combine the equipped clothing items onto the base character model. The first image is the base model, and the subsequent images are the clothing items to be layered on top: ${clothingDesc.join(', ')}. The final image should be one coherent character portrait with all items worn correctly, rendered in a realistic style.`;

        const payload = {
            contents: [{
                parts: [
                    { text: userPrompt },
                    ...imageParts // Spread the array of image parts
                ]
            }],
        };

        // --- 4. Make the API Call (with backoff) ---
        let response;
        let retries = 0;
        const maxRetries = 3;
        while (retries < maxRetries) {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) break;

            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.warn(`API call failed with status ${response.status}. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API response error body:", errorBody);
            throw new Error(`API call failed after ${maxRetries} retries with status ${response.status}`);
        }

        const result = await response.json();
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64Data) {
            characterImage.src = `data:image/png;base64,${base64Data}`;
        } else {
            console.error("Image generation failed. API Response:", result);
            // Log the full response if the expected data isn't there.
            if (result.candidates && result.candidates[0].finishReason !== 'STOP') {
                console.error("Image generation stopped for reason:", result.candidates[0].finishReason);
                console.error("Safety Ratings:", result.candidates[0].safetyRatings);
            }
            characterImage.src = "https://placehold.co/320x427/c70000/ffffff?text=Image+Gen+Failed";
        }
    } catch (error) {
        console.error("Error during image generation process:", error);
        characterImage.src = "https://placehold.co/320x427/c70000/ffffff?text=Image+Gen+Error";
    } finally {
        setLoading(false);
    }
}

/**
 * (AI TASK 3) Generates the narrative text for a scene.
 */
async function generateNarrative(sceneId) {
    if (!apiKey) {
        console.warn("Missing API key, skipping narrative generation.");
        narrativeContainer.innerHTML = `<p class="mb-4 text-gray-500">Narrative generation skipped (No API Key).</p>`;
        return;
    }
    setLoading(true);
    narrativeContainer.innerHTML = `<p class="mb-4 text-gray-500">Generating narrative...</p>`;
    // Note: The model was already updated. This confirms the endpoint structure for gemini-pro.
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const apiUrl = `${proxyUrl}https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const systemPrompt = `You are Delilah, a narrative co-author for an interactive game. Your role is to write the descriptive prose for a scene. You must not violate content policies. Focus on internal monologue, atmosphere, and identity. Keep the text to a single, engaging paragraph.`;
    
    let userQuery;
    if (sceneId === "S1_08") {
        userQuery = `Write a calm, introspective introductory paragraph for the first scene of a narrative RPG called "Lily's Life." The scene is S1_08, where Lily is about to choose her underwear. The paragraph should set a quiet, thoughtful tone, focusing on the character's internal state without explicitly mentioning the clothing choice.`;
    } else {
        userQuery = `Write a concise internal monologue for Lily in scene '${sceneId}'. This should reflect her mindset based on her stats (Cautious: ${gameState.stats.cautious}, Curious: ${gameState.stats.curious}, Bold: ${gameState.stats.bold}) and the impact of the item she just selected or chose to skip. Her current equipped items are: ${JSON.stringify(gameState.equipped)}. The monologue should be a brief, non-sensitive, SFW paragraph of 1-2 sentences.`;
    }

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        // Implement exponential backoff for API calls
        let response;
        let retries = 0;
        const maxRetries = 3;
        while (retries < maxRetries) {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                break; // Success
            }

            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.warn(`API call failed with status ${response.status}. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }

        if (!response.ok) {
            throw new Error(`API call failed after ${maxRetries} retries with status ${response.status}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            narrativeContainer.innerHTML = `<p class="mb-4 opacity-0 transition-opacity duration-500 ease-in-out">${text}</p>`;
            setTimeout(() => {
                narrativeContainer.querySelector('p')?.classList.remove('opacity-0');
            }, 50);
        } else {
            console.error("Narrative generation failed:", result);
            narrativeContainer.innerHTML = `<p class="mb-4 text-red-400">Error generating narrative.</p>`;
        }
    } catch (error) {
        console.error("Error calling text API:", error);
        narrativeContainer.innerHTML = `<p class="mb-4 text-red-400">Error connecting to narrative AI.</p>`;
    } finally {
        setLoading(false);
    }
}

// --- FIREBASE SAVE/LOAD FUNCTIONS ---

/**
 * (SAVE/LOAD TASK) Saves the current gameState to Firestore.
 */
async function saveGame() {
    if (!userId) {
        console.error("Not authenticated. Cannot save.");
        return;
    }
    setLoading(true);
    console.log(`Saving game for userId: ${userId}`);
    try {
        const savePath = doc(db, 'artifacts', appId, 'users', userId, 'lily-save', 'slot-1');
        await setDoc(savePath, gameState);
        console.log("Game saved!");
        saveButton.textContent = "Saved!";
        setTimeout(() => { saveButton.textContent = "Save Game"; }, 2000);
    } catch (error) {
        console.error("Error saving game:", error);
        saveButton.textContent = "Save Failed!";
        setTimeout(() => { saveButton.textContent = "Save Game"; }, 2000);
    } finally {
        setLoading(false);
    }
}

/**
 * (SAVE/LOAD TASK) Loads the gameState from Firestore.
 */
async function loadGame() {
    if (!userId) {
        console.error("Not authenticated. Cannot load.");
        return;
    }
    setLoading(true);
    console.log(`Loading game for userId: ${userId}`);
    try {
        const savePath = doc(db, 'artifacts', appId, 'users', userId, 'lily-save', 'slot-1');
        const docSnap = await getDoc(savePath);
        
        if (docSnap.exists()) {
            gameState = docSnap.data();
            console.log("Game loaded!");
            
            // Re-render the UI with loaded data
            recalculateStats();
            updateMeters();
            await renderScene(gameState.currentScene); // Re-render narrative and choices
            
            // Also regenerate image for the loaded state
            if(gameState.currentScene === 'S1_END') {
                await generateCharacterImage();
            }

            loadButton.textContent = "Loaded!";
            setTimeout(() => { loadButton.textContent = "Load Game"; }, 2000);
        } else {
            console.log("No save file found.");
            loadButton.textContent = "No Save!";
            setTimeout(() => { loadButton.textContent = "Load Game"; }, 2000);
        }
    } catch (error) {
        console.error("Error loading game:", error);
        loadButton.textContent = "Load Failed!";
        setTimeout(() => { loadButton.textContent = "Load Game"; }, 2000);
    } finally {
        setLoading(false);
    }
}

/**
 * Handles a player's choice.
 */
function handleChoice(choice) {
    const { key, category, nextScene } = choice;

    // Handle "reset" choice
    if (category === "reset") {
        // Reset game state
        gameState.stats = { cautious: 0, curious: 0, bold: 0 };
        gameState.equipped = {
            bra: null,
            underwear: null,
            outfit_top: null,
            outfit_bottom: null,
            outfit_all: null,
            shoes: "chucks",
            intent: null
        };
        // Reset character image to base
        characterImage.src = BASE_MODEL_URL;
    } 
    // Handle array of items (e.g., top and bottom)
    else if (Array.isArray(category)) {
        // Clear 'outfit_all' if a top/bottom is chosen
        gameState.equipped.outfit_all = null;
        category.forEach((cat, index) => {
            gameState.equipped[cat] = key[index];
        });
    } 
    // Handle single item
    else {
        // If 'outfit_all' is chosen, clear top/bottom
        if (category === 'outfit_all') {
            gameState.equipped.outfit_top = null;
            gameState.equipped.outfit_bottom = null;
        }
        gameState.equipped[category] = key;
    }

    // Recalculate stats and update UI after any choice
    recalculateStats();
    updateMeters();

    // Render the next scene
    renderScene(nextScene);
}

/**
 * Handles a player's choice in the narrative timeline.
 */
function handleNarrativeChoice(choice) {
    const { flag, value, nextPart, mindset } = choice;

    // Update the gameState with the new flag
    if (flag) {
        gameState[flag] = value;
    }

    // If the choice affects a mindset, increment the score
    if (mindset) {
        const mindsetKey = `mindset_${mindset}`;
        if (gameState.hasOwnProperty(mindsetKey)) {
            gameState[mindsetKey]++;
            console.log(`Mindset updated: ${mindsetKey} is now ${gameState[mindsetKey]}`);
        }
    }

    // Special logic for P2 commute outcomes
    if (gameState.currentPart === "P2" && flag === "commuteMethod") {
        gameState.isLateForClass = (value === "walk");
    }

    // Advance to the next part of the story
    renderNarrativeScene(nextPart);
}

/**
 * Renders a new scene in the UI.
 * NOW calls AI for narrative text.
 */
async function renderScene(sceneId) {
    gameState.currentScene = sceneId;
    const scene = storyData[sceneId];

    if (!scene) {
        console.error(`Scene '${sceneId}' not found!`);
        narrativeContainer.innerHTML = `<p class="mb-4 text-red-400">Error: Scene not found.</p>`;
        return;
    }

    // Update narrative text using AI
    await generateNarrative(sceneId);

    // Clear old choices
    choicesContainer.innerHTML = '';

    // Create and append new choices
    scene.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.className = "choice-button w-full p-3 bg-gray-700 rounded-lg text-left text-indigo-300 hover:bg-indigo-600 hover:text-white transform opacity-0 translate-y-2";
        button.onclick = () => handleChoice(choice);
        choicesContainer.appendChild(button);

        // Animate choices in
        setTimeout(() => {
            button.classList.remove('opacity-0', 'translate-y-2');
        }, 100 * (index + 1));
    });

    // The old image generation is no longer needed.
    // if (sceneId === 'S1_END') {
    //     await generateCharacterImage();
    // }
}

/**
 * Renders a narrative scene from the timeline.
 */
function renderNarrativeScene(partId) {
    gameState.currentPart = partId;
    updateCharacterImage(); // Update the character's portrait
    const part = narrativeTimeline[partId];

    // Update the scene image, falling back to the default if not specified
    if (sceneImage) {
        sceneImage.src = part?.imageUrl || DEFAULT_SCENE_IMAGE_URL;
    }

    if (partId === "END") {
        narrativeContainer.innerHTML = `<p class="mb-4">The story concludes for now.</p>`;
        choicesContainer.innerHTML = ''; // Clear choices

        // --- V3 UI FIX: Show the main menu again ---
        const mainMenuContainer = document.getElementById('main-menu-container');
        if (mainMenuContainer) {
            mainMenuContainer.classList.remove('hidden');
        }

        // Optionally, add a button to restart the narrative
        const restartButton = document.createElement('button');
        restartButton.textContent = "Start Over";
        restartButton.className = "choice-button w-full p-3 bg-indigo-500 rounded-lg text-left text-white hover:bg-indigo-600";
        restartButton.onclick = () => {
            // This could reset the narrative flags and go back to P1 or the wardrobe
            renderWardrobeStep("top");
        };
        choicesContainer.appendChild(restartButton);
        return;
    }

    if (!part) {
        console.error(`Narrative part '${partId}' not found!`);
        narrativeContainer.innerHTML = `<p class="mb-4 text-red-400">Error: Narrative part not found.</p>`;
        return;
    }

    // --- Consequence Checks & Narrative Modification ---
    let narrative = part.narrative; // Start with the default narrative

    // P4 Check: Is the player late for class?
    if (partId === "P4" && gameState.isLateForClass) {
        narrative = "Arriving late after the walk, Lily slips into the classroom, trying to be unnoticed. " + narrative;
    }

    // P7 Check: What is the bond with Mitch?
    if (partId === "P7") {
        switch (gameState.mitchBond) {
            case "friend":
                narrative = "P7 [Friend]: At the bar, the goal is survival, a safe harbor. The noise of the crowd feels like a wall between Lily and the world." + narrative;
                break;
            case "blurry":
                narrative = "P7 [Blurry]: The air in the bar is thick with unspoken tension. A choice hangs in the air between the familiar face of Mitch and the allure of a stranger." + narrative;
                break;
            case "intimate":
                narrative = "P7 [Intimate]: This isn't just a night out; it's a victory lap. Every glance from Mitch feels like a shared secret, a celebration of boundaries pushed together." + narrative;
                break;
        }
    }

    // Update narrative text
    narrativeContainer.innerHTML = `<p class="mb-4">${narrative}</p>`;

    // Clear old choices
    choicesContainer.innerHTML = '';

    // Create and append new choices
    part.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.className = "choice-button w-full p-3 bg-gray-700 rounded-lg text-left text-indigo-300 hover:bg-indigo-600 hover:text-white transform opacity-0 translate-y-2";
        button.onclick = () => handleNarrativeChoice(choice);

        // --- V3 UI Logic: Stat-based choice availability ---
        // For now, we'll make all choices available and apply the visual effect.
        // In the future, a stat check would go here.
        // Example: if (choice.mindset && gameState[`mindset_${choice.mindset}`] >= 5) {
        if (true) { // Placeholder for stat check
            button.classList.add('available-choice');
        }
        // } else { button.disabled = true; button.classList.add('cursor-not-allowed', 'text-gray-500'); }

        choicesContainer.appendChild(button);

        // Animate choices in
        setTimeout(() => {
            button.classList.remove('opacity-0', 'translate-y-2');
        }, 100 * (index + 1));
    });
}


/**
 * Initializes Firebase connection.
 */
async function initializeFirebase() {
    // Check if Firebase config is provided
    if (!firebaseConfig.apiKey) {
        console.error("Firebase config is missing. Running in 'offline' mode.");
        console.warn("Save/Load functionality will be disabled.");
        
        // Disable save/load buttons
        if (saveButton) saveButton.disabled = true;
        if (loadButton) loadButton.disabled = true;
        
        // Do not render the scene on initial load, wait for user to click "Begin"
        updateMeters();
        return; // Stop initialization
    }

    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        setLogLevel('Debug'); // Enable Firestore logging

        // Sign in
        // Use a placeholder token for local dev if __initial_auth_token__ isn't present
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        if (token) {
            await signInWithCustomToken(auth, token);
        } else {
            console.warn("No auth token found, signing in anonymously for local dev.");
            await signInAnonymously(auth);
        }
        
        userId = auth.currentUser.uid;
        gameState.userId = userId;
        console.log("Firebase Initialized. User ID:", userId);
        
        // Now that Firebase is ready, the user can begin the game.
        updateMeters();

    } catch (error) {
        console.error("Firebase initialization error:", error);
        narrativeContainer.innerHTML = `<p class="mb-4 text-red-400">Error: Firebase connection failed. ${error.message}</p>`;
        // Still try to update meters, but the game won't start
        updateMeters();
    }
}


// --- INITIALIZATION ---

/**
 * Initialize the game when the DOM is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM element references
    narrativeContainer = document.getElementById('narrative-container');
    choicesContainer = document.getElementById('choices-container');
    characterImage = document.getElementById('character-image');
    sceneImage = document.getElementById('scene-image');
    loadingOverlay = document.getElementById('loading-overlay');
    saveButton = document.getElementById('save-button');
    loadButton = document.getElementById('load-button');
    beginButton = document.getElementById('begin-button');
    continueButton = document.getElementById('continue-button');
    wardrobeButton = document.getElementById('wardrobe-button');
    const mainMenuContainer = document.getElementById('main-menu-container');

    // Add event listeners
    saveButton.onclick = saveGame;
    loadButton.onclick = loadGame;
    beginButton.onclick = () => {
        mainMenuContainer.classList.add('hidden');
        // V3 FIX: Start the new narrative timeline instead of the old scene system.
        renderNarrativeScene("P1");
    };
    continueButton.onclick = () => {
        generateNarrative(gameState.currentScene);
    };
    wardrobeButton.onclick = () => {
        let newStats = {};
        ALL_STATS.forEach(stat => newStats[stat] = 0);
        gameState.stats = newStats;
        updateMeters();
        mainMenuContainer.classList.add('hidden');
        renderWardrobeStep("top");
    };

    // Start the game by initializing Firebase
    initializeFirebase();
});

function renderWardrobeStep(step) {
    if (step === "end") {
        calculateInitialMindsetScores(); // Calculate mindset scores from final clothing stats
        renderNarrativeScene("P1"); // Start the narrative timeline
        return;
    }

    const stepData = wardrobeData[step];
    if (!stepData) {
        console.error(`Wardrobe step '${step}' not found!`);
        return;
    }

    narrativeContainer.innerHTML = `<p class="mb-4">${stepData.narrative}</p>`;
    choicesContainer.innerHTML = '';

    stepData.choices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        if (choice.functional) {
            button.className = "choice-button w-full p-3 bg-indigo-500 rounded-lg text-left text-white hover:bg-indigo-600";
            button.onclick = () => {
                gameState.equipped[choice.category] = choice.key;
                const item = clothingDatabase[choice.category]?.[choice.key];
                if (item && item.imageUrl) {
                    characterImage.src = item.imageUrl;
                }
                recalculateStats();
                updateMeters();
                renderWardrobeStep(choice.nextStep);
            };
        } else {
            button.className = "choice-button w-full p-3 bg-gray-700 rounded-lg text-left text-gray-400 cursor-not-allowed";
            button.disabled = true;
        }
        choicesContainer.appendChild(button);
    });
}
