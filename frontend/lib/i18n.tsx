"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "hi";

export type Translations = typeof DICTIONARY.en;

export const DICTIONARY = {
  en: {
    // Branding & Header
    brandName: "Waste Intelligence",
    brandFirst: "Eco",
    brandSecond: "Track",
    taglineHeading: "Don’t throw it.",
    taglineHeadingSpan: "Know its value.",
    taglineSub: "Scan what you’re about to discard. Discover what it is, what it can become, and its best next use.",
    campusGuide: "Campus guide",
    slogan: "Small steps. Better planet.",
    signIn: "Sign in",
    connecting: "Connecting…",
    backendConnected: "Backend connected",
    backendOffline: "Backend offline",
    binStationTooltip: "Bin station",
    aboutTooltip: "About Waste Intelligence",

    // Hero Badge
    heroEyebrow: "A SMALL ACT. A BIG DIFFERENCE.",
    heroBadgeTop: "MAKE ROOM FOR",
    heroBadgeBottom: "a greener tomorrow",

    // Search Bar
    searchPlaceholder: "What are you throwing away?",
    searching: "Searching…",
    searchEmpty: "No matching item found.",
    tryPrompt: "Try:",
    bananaPeel: "Banana peel",
    plasticBottle: "Plastic bottle",
    pizzaBox: "Pizza box",
    oldBattery: "Old battery",
    chipsPacket: "Chips packet",

    // Main Action Cards
    scanPhotoTitle: "Scan a photo",
    scanPhotoDesc: "One item or a mixed pile. We’ll look for the right bin.",
    scanPhotoBtn: "Select photo",
    liveCameraTitle: "Live camera",
    liveCameraDesc: "Point at waste for instant on-device recognition.",
    liveCameraBtn: "Open camera",
    askAiTitle: "Ask Waste Intelligence AI",
    askAiPlaceholder: "e.g. A takeaway cup with a plastic lid…",
    askAiDesc: "Details make a difference.",

    // Results
    sortingResult: "SORTING RESULT",
    letsCheckThat: "LET’S CHECK THAT",
    verifiedBin: "Verified Bin",
    pizzaClean: "Clean / dry",
    pizzaGreasy: "Greasy / food-soiled",
    cleanPizzaTip: "Clean box can be recycled in the Blue bin.",
    greasyPizzaTip: "Greasy cardboard goes to the General waste bin.",

    // Bins Section
    binsEyebrow: "FIVE PLACES. ONE CLEANER CAMPUS.",
    binsHeading: "A home for every kind of waste.",
    meetYourBins: "Meet your bins.",
    findItsBin: "Find its bin",
    pointsTip: "Earn points every time a smart bin confirms your deposit.",

    // 5 Bin Types
    wetTitle: "Wet waste",
    wetShort: "Wet",
    wetDestination: "Green bin",
    wetDetail: "Food scraps, peels & tea leaves",
    wetExample: "Banana peel",

    dryTitle: "Dry recycling",
    dryShort: "Dry",
    dryDestination: "Blue bin",
    dryDetail: "Clean paper, plastic & metal",
    dryExample: "Plastic bottle",

    generalTitle: "General waste",
    generalShort: "General",
    generalDestination: "Black / grey bin",
    generalDetail: "Soiled paper & mixed packaging",
    generalExample: "Used tissue",

    specialTitle: "Special collection",
    specialShort: "Special",
    specialDestination: "Red bin / staffed desk",
    specialDetail: "Batteries, cables & electronics",
    specialExample: "Battery",

    glassTitle: "Glass",
    glassShort: "Glass",
    glassDestination: "Glass point",
    glassDetail: "Clean glass bottles & jars",
    glassExample: "Glass jar",

    // DLC Station
    dlcStationTitle: "Bin station",
    dlcSubtitle: "Set this device up at a bin. Hold each item in front of the camera. When a green item is captured, a +25 points QR code appears for 15 seconds.",
    startStation: "Start station",
    stopStation: "Stop station",
    openingCamera: "Opening camera…",
    acceptingItem: "Accepting",
    accepted: "Accepted",
    wrongBin: "Wrong bin",
    checkItem: "Check item",
    testGreenItemBtn: "Test Green Item (+25 QR)",
    rewardAvailable: "+25 POINTS REWARD",
    validFor: "Valid for",
    scanInRewardsNote: "Scan this QR code in Rewards using your registered account to receive your +25 points.",
    disappearsIn: "Disappears in",
    quickClaimBtn: "Quick Claim on this device",
    copyCodeBtn: "Copy Code",
    copied: "Copied!",

    // Rewards Page
    rewardsTitle: "Waste Intelligence Rewards",
    yourPoints: "YOUR POINTS",
    pointsUnit: "points",
    scanSmartBinQrTitle: "Scan Smart Bin QR",
    scanSmartBinQrDesc: "Deposited a green item? Scan the 15-second QR code generated at the bin to claim +25 points to your account.",
    scanQrBtn: "Scan QR Code",
    disposeAtSmartBin: "Dispose at a smart bin",
    disposeDesc: "Pick a bin and start a disposal. The bin's camera station confirms your deposit, then points appear.",
    startDisposalBtn: "Start disposal",
    rewardHistoryTitle: "Reward history",
    refresh: "Refresh",
    noRewardsYet: "No rewards yet. Start a disposal or scan a smart bin QR to earn points.",

    // QR Scanner Modal
    qrModalTitle: "Scan Smart Bin QR Code",
    qrModalSub: "Earn +25 points for green waste disposal",
    liveCameraTab: "Live Camera",
    enterCodeTab: "Enter Code",
    uploadPhotoTab: "Upload Photo",
    alignQrHint: "Align the 15-second green QR code inside the frame to scan.",
    manualCodeLabel: "Enter or paste the Smart Bin Claim Code:",
    claimPointsBtn: "Claim +25 Points",
    awardedTitle: "+25 Points Awarded!",
    creditedMsg: "Your points have been credited to your Waste Intelligence account.",
    verifiedPill: "✓ Verified Smart Bin Deposit",
    signInRequiredAlert: "Sign-in required: You must be successfully registered and signed in to receive reward points.",

    // Bottom Navigation
    navHome: "Home",
    navGuide: "Guide",
    navHistory: "History",
    navRewards: "Rewards",

    // Footer
    footerLine1: "A wiser way to waste.",
    footerLine2: "Made for small, everyday change.",

    // Language Toggle
    switchLangLabel: "हिन्दी",
  },
  hi: {
    // Branding & Header
    brandName: "इको ट्रैक (Waste Intelligence)",
    brandFirst: "Eco",
    brandSecond: "Track",
    taglineHeading: "फेंकने से पहले,",
    taglineHeadingSpan: "उसकी कीमत जानें.",
    taglineSub: "स्कैन करें और जानें कि सामग्री का दोबारा उपयोग, मरम्मत या पुनर्चक्रण कैसे किया जा सकता है.",
    campusGuide: "कैंपस गाइड",
    slogan: "छोटे कदम. बेहतर कल.",
    signIn: "साइन इन",
    connecting: "कनेक्ट हो रहा है…",
    backendConnected: "सर्वर कनेक्टेड",
    backendOffline: "सर्वर ऑफ़लाइन",
    binStationTooltip: "डस्टबिन स्टेशन",
    aboutTooltip: "इको ट्रैक के बारे में",

    // Hero Badge
    heroEyebrow: "एक छोटा कदम. एक बड़ा बदलाव.",
    heroBadgeTop: "एक बेहतर",
    heroBadgeBottom: "कल की शुरुआत",

    // Search Bar
    searchPlaceholder: "आप क्या फेंक रहे हैं?",
    searching: "खोज रहे हैं…",
    searchEmpty: "कोई वस्तु नहीं मिली.",
    tryPrompt: "सुझाव:",
    bananaPeel: "केले का छिलका",
    plasticBottle: "प्लास्टिक की बोतल",
    pizzaBox: "पिज़्ज़ा बॉक्स",
    oldBattery: "पुरानी बैटरी",
    chipsPacket: "चिप्स का पैकेट",

    // Main Action Cards
    scanPhotoTitle: "फ़ोटो स्कैन करें",
    scanPhotoDesc: "एक वस्तु या ढेर। हम सही डस्टबिन बताएंगे।",
    scanPhotoBtn: "फ़ोटो चुनें",
    liveCameraTitle: "लाइव कैमरा",
    liveCameraDesc: "कैमरे से तुरंत कचरा पहचानें।",
    liveCameraBtn: "कैमरा खोलें",
    askAiTitle: "इको ट्रैक AI से पूछें",
    askAiPlaceholder: "उदा. प्लास्टिक ढक्कन वाला कॉफ़ी कप…",
    askAiDesc: "विस्तार से सटीक जवाब मिलता है।",

    // Results
    sortingResult: "छँटाई परिणाम",
    letsCheckThat: "आइए जाँच करें",
    verifiedBin: "सत्यापित डस्टबिन",
    pizzaClean: "साफ़ / सूखा",
    pizzaGreasy: "चिकना / जूठा",
    cleanPizzaTip: "साफ़ डिब्बा नीले डस्टबिन (रीसाइक्लिंग) में जा सकता है।",
    greasyPizzaTip: "चिकना और जूठा गत्ता सामान्य कचरे के डस्टबिन में डालें।",

    // Bins Section
    binsEyebrow: "पाँच डस्टबिन. एक स्वच्छ परिसर.",
    binsHeading: "हर तरह के कचरे का सही ठिकाना.",
    meetYourBins: "अपने डस्टबिन पहचानें.",
    findItsBin: "सही डस्टबिन जानें",
    pointsTip: "हर बार सही डस्टबिन में डालने पर ईनाम अंक (Points) पाएँ।",

    // 5 Bin Types
    wetTitle: "गीला कचरा",
    wetShort: "गीला",
    wetDestination: "हरा डस्टबिन",
    wetDetail: "भोजन के अवशेष, छिलके और चाय पत्ती",
    wetExample: "केले का छिलका",

    dryTitle: "सूखा पुनर्चक्रण",
    dryShort: "सूखा",
    dryDestination: "नीला डस्टबिन",
    dryDetail: "साफ़ कागज़, प्लास्टिक और धातु",
    dryExample: "प्लास्टिक की बोतल",

    generalTitle: "सामान्य कचरा",
    generalShort: "सामान्य",
    generalDestination: "काला / स्लेटी डस्टबिन",
    generalDetail: "गंदा कागज़ और मिश्रित पैकेजिंग",
    generalExample: "इस्तेमाल किया हुआ टिशू",

    specialTitle: "विशेष संग्रह",
    specialShort: "विशेष",
    specialDestination: "लाल डस्टबिन / विशेष डेस्क",
    specialDetail: "बैटरी, केबल और इलेक्ट्रॉनिक सामान",
    specialExample: "बैटरी",

    glassTitle: "काँच",
    glassShort: "काँच",
    glassDestination: "काँच केंद्र",
    glassDetail: "काँच की साफ़ बोतलें और जार",
    glassExample: "काँच का जार",

    // DLC Station
    dlcStationTitle: "स्मार्ट डस्टबिन स्टेशन",
    dlcSubtitle: "इस डिवाइस को डस्टबिन पर रखें। कचरा डालने से पहले कैमरे को दिखाएँ। जब हरा कचरा पहचाना जाएगा, 15 सेकंड का QR कोड बनेगा (+25 अंक)।",
    startStation: "स्टेशन शुरू करें",
    stopStation: "स्टेशन रोकें",
    openingCamera: "कैमरा खुल रहा है…",
    acceptingItem: "स्वीकार्य",
    accepted: "स्वीकृत",
    wrongBin: "गलत डस्टबिन",
    checkItem: "जाँच करें",
    testGreenItemBtn: "हरा कचरा टेस्ट करें (+25 QR)",
    rewardAvailable: "+25 अंक का ईनाम",
    validFor: "वैध समय",
    scanInRewardsNote: "अपने रजिस्टर्ड खाते में +25 अंक पाने के लिए रिवॉर्ड्स सेक्शन में स्कैन करें।",
    disappearsIn: "समाप्त होने में",
    quickClaimBtn: "इस डिवाइस पर तुरंत क्लेम करें",
    copyCodeBtn: "कोड कॉपी करें",
    copied: "कॉपी हो गया!",

    // Rewards Page
    rewardsTitle: "इको ट्रैक रिवॉर्ड्स",
    yourPoints: "आपके कुल अंक",
    pointsUnit: "अंक",
    scanSmartBinQrTitle: "स्मार्ट डस्टबिन QR स्कैन करें",
    scanSmartBinQrDesc: "हरा कचरा डाला? अपने खाते में +25 अंक पाने के लिए डस्टबिन पर बना 15 सेकंड का QR कोड स्कैन करें।",
    scanQrBtn: "QR कोड स्कैन करें",
    disposeAtSmartBin: "स्मार्ट डस्टबिन में निस्तारण करें",
    disposeDesc: "डस्टबिन चुनें और प्रक्रिया शुरू करें। कैमरा सत्यापन के बाद अंक जुड़ जाएँगे।",
    startDisposalBtn: "निस्तारण शुरू करें",
    rewardHistoryTitle: "रिवॉर्ड इतिहास",
    refresh: "रिफ़्रेश",
    noRewardsYet: "अभी तक कोई रिवॉर्ड नहीं। अंक कमाने के लिए कचरा डालें या QR कोड स्कैन करें।",

    // QR Scanner Modal
    qrModalTitle: "स्मार्ट डस्टबिन QR कोड स्कैन करें",
    qrModalSub: "गीले/हरे कचरे के निस्तारण पर +25 अंक पाएँ",
    liveCameraTab: "लाइव कैमरा",
    enterCodeTab: "कोड दर्ज करें",
    uploadPhotoTab: "फ़ोटो अपलोड करें",
    alignQrHint: "स्कैन करने के लिए 15-सेकंड वाले हरे QR कोड को फ्रेम के अंदर लाएँ।",
    manualCodeLabel: "स्मार्ट डस्टबिन क्लेम कोड दर्ज करें या पेस्ट करें:",
    claimPointsBtn: "+25 अंक क्लेम करें",
    awardedTitle: "+25 अंक मिल गए!",
    creditedMsg: "आपके अंक आपके इको ट्रैक खाते में जोड़ दिए गए हैं।",
    verifiedPill: "✓ सत्यापित स्मार्ट डस्टबिन निस्तारण",
    signInRequiredAlert: "साइन-इन आवश्यक: रिवॉर्ड अंक पाने के लिए आपका पंजीकृत और साइन-इन होना आवश्यक है।",

    // Bottom Navigation
    navHome: "होम",
    navGuide: "गाइड",
    navHistory: "इतिहास",
    navRewards: "रिवॉर्ड्स",

    // Footer
    footerLine1: "कचरा प्रबंधन का समझदार तरीका.",
    footerLine2: "छोटे-छोटे रोज़मर्रा के बदलावों के लिए समर्पित.",

    // Language Toggle
    switchLangLabel: "English",
  },
};

type LanguageContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  t: Translations;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: DICTIONARY.en,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Starts in English by default as requested
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ecotrack_lang") as Language | null;
      if (saved === "en" || saved === "hi") {
        setLangState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem("ecotrack_lang", next);
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "hi" : "en");
  };

  const value: LanguageContextValue = {
    lang,
    setLang,
    toggleLang,
    t: DICTIONARY[lang],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
