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
const BASE_MODEL_URL = "https://preview.redd.it/another-set-of-baselines-v0-bjbkswhc3tzf1.jpg?width=320&crop=smart&auto=webp&s=c0141deba9fc96fc62b61ecec31225fa3ef192e8"; // Placeholder for 'added-04.jpg'

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

const sceneImageDatabase = {
    // This maps abstract asset names to actual image URLs.
    // Most will use the default for now as per instructions.
    "ASSET_P2_OFFICE_DOOR": "https://preview.redd.it/what-do-yall-think-new-logo-time-v0-8zmlko0klrzf1.jpeg?width=640&crop=smart&auto=webp&s=b37e388430fce2ecd91ae19c637dc7df9930ca58",
};

const narrativeTimeline = {
    "P1": {
        narrative: "The morning light filters through the blinds, painting stripes across the room. It's a new day, another chance to define who you are. The reflection in the mirror is still a stranger, a puzzle you're slowly piecing together. The first choice of the day is always the hardest: how to face the world waiting outside.",
        imageUrl: "ASSET_P1_BEDROOM",
        choices: [
            { text: "[Cautious] Ugh, another day. Let's just get this over with. Keep a low profile.", mindset: "cautious", nextPart: "P1-1" },
            { text: "[Curious] I wonder what today will be like? So many possibilities to explore.", mindset: "curious", nextPart: "P1-1" },
            { text: "[Bold] This is my day. I'm going to own it. Time to make a statement.", mindset: "bold", nextPart: "P1-1" }
        ]
    },
    "P1-1": {
        narrative: "Time to get to the university. The commute is a battlefield, a series of choices that will set the tone for the entire day. Each option has its own risks, its own rewards.",
        imageUrl: "ASSET_P1_COMMUTE_MAP",
        choices: [
            { text: "[Cautious] Walk. It's slow and agonizing, but it avoids people.", flag: "commuteMethod", value: "walk", nextPart: "P2-1" },
            { text: "[Curious] Take the bus. It's a petri dish of social interaction.", flag: "commuteMethod", value: "bus", nextPart: "P2-1" },
            { text: "[Bold] Ride your bike. It's fast, risky, and gets the adrenaline pumping.", flag: "commuteMethod", value: "bike", nextPart: "P2-1" }
        ]
    },
    "P2-1": {
        narrative: "You arrive at the office manager's door, feeling anxious about seeing Alex. You must make a choice about engagement.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [
            { text: "[Cautious] Slip the folder under the door and send a quick text.", mindset: "cautious", consequences: { alexRelationship: "hostile" }, nextPart: "P2-1A" },
            { text: "[Curious] Observe Alex from a distance to gather data.", mindset: "curious", consequences: { alexRelationship: "confused" }, nextPart: "P2-1B" },
            { text: "[Bold] Walk in, make eye contact, and challenge him about the deadline.", mindset: "bold", consequences: { alexRelationship: "intrigued" }, nextPart: "P2-1C" }
        ]
    },
    "P2-1A": {
        narrative: "The safest choice is evasion. You leave the folder anonymously, accepting the guaranteed hostility.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P2-2" } ]
    },
    "P2-1B": {
        narrative: "You successfully gather data on Alex’s confused reaction to your formal, cold action. Safety achieved through distance.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P2-2" } ]
    },
    "P2-1C": {
        narrative: "You assert control immediately, challenging Alex about the work. He is surprised and intrigued by your new confidence.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P2-2" } ]
    },
    "P2-2": {
        narrative: "Dr. Thorne publicly reprimands you for being late. The entire class is watching you.",
        imageUrl: "ASSET_P2_LECTURE_HALL",
        choices: [ { text: "Take your seat.", nextPart: "P2-3" } ]
    },
    "P2-3": {
        narrative: "You must choose whether to engage academically or continue to hide.",
        imageUrl: "ASSET_P2_LECTURE_HALL",
        choices: [
            { text: "[Cautious] Keep my head down, avoid all eye contact.", mindset: "cautious", nextPart: "P2-3A" },
            { text: "[Curious] Write a complex question on a note card and pass it up.", mindset: "curious", nextPart: "P2-3B" },
            { text: "[Bold] Aggressively challenge the professor on a minor point.", mindset: "bold", nextPart: "P2-3C" }
        ]
    },
    "P2-3A": {
        narrative: "You surrender to silence, accepting the shame and making yourself invisible for the duration of the class.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P3-1" } ]
    },
    "P2-3B": {
        narrative: "You successfully assert intellectual competence without speaking, minimizing social risk while gaining credit.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P3-1" } ]
    },
    "P2-3C": {
        narrative: "You engage in a reckless but necessary verbal confrontation, feeling a sharp, cleansing shock of defiance.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P3-1" } ]
    },
    "P3-1": {
        narrative: "Coach shouts. You must enter the hostile environment of the men's locker room.",
        imageUrl: "ASSET_P3_COACH",
        choices: [ { text: "Enter the locker room.", nextPart: "P3-3" } ]
    },
    "P3-3": {
        narrative: "You must change into the singlet amidst the casual exposure of your teammates.",
        imageUrl: "ASSET_P3_LOCKER_ROOM",
        choices: [
            { text: "[Cautious] Face the locker, change quickly, body hidden.", mindset: "cautious", nextPart: "P3-3A" },
            { text: "[Curious] Change quickly, but clinically scan the room.", mindset: "curious", nextPart: "P3-3B" },
            { text: "[Bold] Change openly, meeting teammates' eyes.", mindset: "bold", nextPart: "P3-3C" }
        ]
    },
    "P3-3A": {
        narrative: "You successfully hide the body, accepting the shame of evasion.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P3-4" } ]
    },
    "P3-3B": {
        narrative: "You collect crucial data on the male social environment while changing.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P3-4" } ]
    },
    "P3-3C": {
        narrative: "You assert presence immediately, turning a moment of vulnerability into a moment of defiance.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P3-4" } ]
    },
    "P3-4": {
        narrative: "Ben executes the cradle hold. His hand placement is intrusive, causing the sudden, confusing \"flutter.\"",
        imageUrl: "ASSET_P3_GRAPPLE_CLOSE",
        choices: [
            { text: "[Cautious] Shyly try to pull his hand away, resisting the intrusive pressure.", mindset: "cautious", consequences: { practiceControl: "humiliated" }, nextPart: "P3-4A" },
            { text: "[Curious] Freeze, analyzing the chemical and hormonal \"flutter.\"", mindset: "curious", consequences: { practiceControl: "analyzed" }, nextPart: "P3-4B" },
            { text: "[Bold] Lean into the touch, \"allowing\" it to assert control.", mindset: "bold", consequences: { practiceControl: "dominant" }, nextPart: "P3-4C" }
        ]
    },
    "P3-4A": {
        narrative: "Ben misinterprets the resistance and pins you in an embarrassing, exposed way. The shame is absolute.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P4-1" } ]
    },
    "P3-4B": {
        narrative: "You turn the physical contact into a clinical experiment, gaining data but feeling off-center.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P4-1" } ]
    },
    "P3-4C": {
        narrative: "You successfully assert control over the intimate moment; Ben is shocked and falters. You feel powerful.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P4-1" } ]
    },
    "P4-1": {
        narrative: "Mitch offers comfort and a choice: \"You need a drink... and clothes.\"",
        imageUrl: "ASSET_P4_MITCH_CAR",
        choices: [
            { text: "[Cautious] Rummage the Closet: Seek privacy and safety in familiar surroundings.", nextPart: "P4-2" },
            { text: "[Bold] Go Shopping: Force public exposure and new confrontations.", nextPart: "P4-3" }
        ]
    },
    "P4-2": {
        narrative: "You retreat to the private closet. Your choice here sets the final bond with Mitch.",
        imageUrl: "ASSET_P4_CLOSET",
        choices: [
            { text: "[Cautious] Choose oversized, loose-fitting clothes (Hiding).", mindset: "cautious", consequences: { mitchBond: "friend" }, nextPart: "P4-2A" },
            { text: "[Curious] Select something analytical (Test Case).", mindset: "curious", consequences: { mitchBond: "blurry" }, nextPart: "P4-2B" },
            { text: "[Bold] Choose a dramatically revealing outfit (Defiance).", mindset: "bold", consequences: { mitchBond: "intimate" }, nextPart: "P4-2C" }
        ]
    },
    "P4-2A": {
        narrative: "You emerge in protective camouflage. Mitch offers only platonic support.",
        imageUrl: "ASSET_P4_COAT_FINAL",
        choices: [ { text: "Continue", nextPart: "P5-1A" } ]
    },
    "P4-2B": {
        narrative: "You choose an analytical outfit; the resulting interaction is tense and unresolved with Mitch.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1B" } ]
    },
    "P4-2C": {
        narrative: "You choose defiance privately, leading to an immediate, intimate dynamic with Mitch.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1C" } ]
    },
    "P4-3": {
        narrative: "You choose public exposure. Your choice here sets the final bond with Mitch.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [
            { text: "[Cautious] Stays isolated in the fitting room (Hiding).", mindset: "cautious", consequences: { mitchBond: "friend" }, nextPart: "P4-3A" },
            { text: "[Curious] Needs help with a zipper (Tense Proximity).", mindset: "curious", consequences: { mitchBond: "blurry" }, nextPart: "P4-3B" },
            { text: "[Bold] Uses the moment to openly flirt with Mitch (Assertion).", mindset: "bold", consequences: { mitchBond: "intimate" }, nextPart: "P4-3C" }
        ]
    },
    "P4-3A": {
        narrative: "You avoid confrontation even in public, buying something safe. The bond remains platonic.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1A" } ]
    },
    "P4-3B": {
        narrative: "You initiate a tense, awkward, physical interaction, leaving the bond undefined.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1B" } ]
    },
    "P4-3C": {
        narrative: "You openly assert your new body, turning the moment into an immediate, intimate connection with Mitch.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1C" } ]
    },
    "P5-1A": {
        narrative: "You are in a safe haven. The focus is on refuge and avoiding confrontation.",
        imageUrl: "ASSET_P5_BAR_SAFE",
        choices: [
            { text: "[Cautious] Hunch low, seek shelter, and quietly ask to leave.", mindset: "cautious", consequences: { finalBond: "sanctuary" }, nextPart: "P5-1A1" },
            { text: "[Curious] Observe the patrons, analyzing their social dynamics.", mindset: "curious", consequences: { finalBond: "detachment" }, nextPart: "P5-1A2" },
            { text: "[Bold] Initiate a conversation with a nearby stranger.", mindset: "bold", consequences: { finalBond: "tested" }, nextPart: "P5-1A3" }
        ]
    },
    "P5-1A1": {
        narrative: "You retreat successfully, achieving the goal of survival and emotional sanctuary.",
        imageUrl: "ASSET_P5_EXIT_NIGHT",
        choices: [ { text: "Game End", nextPart: "END" } ]
    },
    "P5-1A2": {
        narrative: "You gather final data points before leaving, feeling detached but satisfied.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Game End", nextPart: "END" } ]
    },
    "P5-1A3": {
        narrative: "You quickly test the waters with a stranger before retreating back to Mitch's safety.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Game End", nextPart: "END" } ]
    },
    "P5-1B": {
        narrative: "The Stranger (Mark) approaches, forcing a conflict. You must choose who to validate.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [
            { text: "[Cautious] Pull Mitch closer, offering the Stranger a polite dismissal.", mindset: "cautious", consequences: { conflictWinner: "mitch" }, nextPart: "P5-1B1" },
            { text: "[Bold] Give the Stranger a deliberate, prolonged stare that invites the challenge.", mindset: "bold", consequences: { conflictWinner: "stranger" }, nextPart: "P5-1B2" }
        ]
    },
    "P5-1B1": {
        narrative: "Mitch rises to the challenge, successfully defending you. He is the winner.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1B3" } ]
    },
    "P5-1B2": {
        narrative: "You invite the challenge. The Stranger verbally dominates Mitch, becoming the winner.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1B4" } ]
    },
    "P5-1B3": {
        narrative: "Mitch is high on victory. You choose to make a deep, emotional confession to him.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Game End", nextPart: "END", consequences: { finalBond: "sanctuary" } } ]
    },
    "P5-1B4": {
        narrative: "Driven by instinctual duty, you follow the Stranger. You must choose the location of the power exchange.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [
            { text: "[Verbal] Bathroom (Confined space, leads to Submission/Mood Restoration).", consequences: { finalBond: "moodRestoration" }, nextPart: "P5-1B4A" },
            { text: "[Non-Verbal] Alley (Public risk, leads to Mastery/Guilty Duty).", consequences: { finalBond: "guiltyDuty" }, nextPart: "P5-1B4B" }
        ]
    },
    "P5-1B4A": {
        narrative: "You accept dominance verbally. Your mood is restored. You now must decide Mitch's fate.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1B5" } ]
    },
    "P5-1B4B": {
        narrative: "You command his obedience non-verbally, achieving cold mastery. You feel guilty duty.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Continue", nextPart: "P5-1B5" } ]
    },
    "P5-1B5": {
        narrative: "You find Mitch. You must choose whether to offer pity or abandon him to his grief.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [
            { text: "[Cautious] Offer comfort/pity to Mitch.", mindset: "cautious", consequences: { mitchComfort: "pity" }, nextPart: "P5-1B5A" },
            { text: "[Bold] Walk away from the wreckage.", mindset: "bold", consequences: { mitchComfort: "abandonment" }, nextPart: "P5-1B5B" }
        ]
    },
    "P5-1B5A": {
        narrative: "You attempt to comfort Mitch. Outcome depends on his consolable state.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Game End", nextPart: "END" } ]
    },
    "P5-1B5B": {
        narrative: "You choose the cold path of self-preservation, abandoning Mitch to his grief.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Game End", nextPart: "END" } ]
    },
    "P5-1C": {
        narrative: "You arrive with Mitch as a new couple. The night is a display of public celebration and boundary-pushing.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [
            { text: "[Curious] Test reactions from others (men/women) to your pairing.", mindset: "curious", consequences: { finalBond: "performance" }, nextPart: "P5-1C1" },
            { text: "[Bold] Initiate public, boundary-pushing affection with Mitch.", mindset: "bold", consequences: { finalBond: "exposed" }, nextPart: "P5-1C2" }
        ]
    },
    "P5-1C1": {
        narrative: "You focus on the sociological experiment of your public relationship.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Game End", nextPart: "END" } ]
    },
    "P5-1C2": {
        narrative: "You make a bold, public claim over Mitch, cementing the power dynamic you established.",
        imageUrl: "ASSET_P2_OFFICE_DOOR",
        choices: [ { text: "Game End", nextPart: "END" } ]
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
    commuteMethod: null,
    isLateForClass: false,
    alexRelationship: null,
    practiceControl: null,
    gettingReadyChoice: null,
    mitchBond: null,
    finalBond: null,
    conflictWinner: null,
    mitchComfort: null,
    stateHistory: []
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
    const { consequences, nextPart, mindset } = choice;

    // Save a deep copy of the current state to the history
    gameState.stateHistory.push(JSON.parse(JSON.stringify(gameState)));

    // Apply all consequences from the choice
    if (consequences) {
        for (const key in consequences) {
            if (gameState.hasOwnProperty(key)) {
                gameState[key] = consequences[key];
                console.log(`State updated: ${key} is now ${gameState[key]}`);
            }
        }
    }

    // If the choice affects a mindset, increment the score
    if (mindset) {
        const mindsetKey = `mindset_${mindset}`;
        if (gameState.hasOwnProperty(mindsetKey)) {
            gameState[mindsetKey]++;
            console.log(`Mindset updated: ${mindsetKey} is now ${gameState[mindsetKey]}`);
        }
    }

    // Advance to the next part of the story, if one is defined
    if (nextPart) {
        renderNarrativeScene(nextPart);
    }
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

    // Update the scene image by looking up the asset name in the database
    if (sceneImage) {
        const imageUrl = sceneImageDatabase[part?.imageUrl] || DEFAULT_SCENE_IMAGE_URL;
        sceneImage.src = imageUrl;
    }

    if (partId === "END") {
        const finalStats = `FINAL_STATS: Cautious (${gameState.mindset_cautious}) / Curious (${gameState.mindset_curious}) / Bold (${gameState.mindset_bold})`;
        narrativeContainer.innerHTML = `<p class="mb-4">The story concludes for now. ${finalStats}</p>`;
        choicesContainer.innerHTML = ''; // Clear choices

        // --- V3 UI FIX: Show the main menu again ---
        const mainMenuContainer = document.getElementById('main-menu-container');
        if (mainMenuContainer) {
            mainMenuContainer.classList.remove('hidden');
        }

        // Optionally, add a button to restart the narrative
        const restartButton = document.createElement('button');
        restartButton.textContent = "Start Over";
        restartButton.className = "candy-button";
        restartButton.onclick = () => {
            // This could reset the narrative flags and go back to P1 or the wardrobe
            location.reload(); // Simple reload for now
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

        if (choice.nextPart) {
            button.className = "candy-button";
            button.onclick = () => handleNarrativeChoice(choice);
            button.classList.add('available-choice');
        } else {
            button.className = "candy-button disabled";
            button.onclick = () => showComingSoonPopup();
        }

        choicesContainer.appendChild(button);

        // Animate choices in
        setTimeout(() => {
            button.classList.remove('opacity-0', 'translate-y-2');
        }, 100 * (index + 1));
    });

    // Add a "Back" button if there's history
    if (gameState.stateHistory.length > 0) {
        const backButton = document.createElement('button');
        backButton.textContent = "Back";
        backButton.className = "choice-button w-full p-3 bg-gray-600 rounded-lg text-left text-white hover:bg-gray-700 mt-4";
        backButton.onclick = () => goBack();
        choicesContainer.appendChild(backButton);
    }
}

/**
 * Reverts the game to the previous state.
 */
function goBack() {
    if (gameState.stateHistory.length > 0) {
        // Pop the last state from the history
        const previousState = gameState.stateHistory.pop();

        // Restore the entire game state
        gameState = previousState;

        // Re-render the scene with the restored state
        console.log("Reverting to previous state:", gameState);
        renderNarrativeScene(gameState.currentPart);
    } else {
        console.warn("No history to go back to.");
    }
}

/**
 * Shows a temporary "Coming Soon" popup.
 */
function showComingSoonPopup() {
    const popup = document.getElementById('coming-soon-popup');
    if (popup) {
        popup.classList.remove('hidden');
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 1500); // Hide after 1.5 seconds
    }
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
            button.className = "candy-button";
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
            button.className = "candy-button disabled";
            button.disabled = true;
        }
        choicesContainer.appendChild(button);
    });
}
