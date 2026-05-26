const translations = {
  fr: {
    "nav.home": "Accueil",
    "nav.diagnostic": "Diagnostic",
    "nav.hospitals": "Hôpitaux",
    "nav.lyra": "Lyra",
    "nav.scan": "Scanner",
    "nav.profile": "Profil",
    "diagnostic.title": "Analyse des symptômes",
    "diagnostic.placeholder":
      "Décrivez vos symptômes... ex: fièvre 38.5°C, maux de tête depuis 2 jours",
    "diagnostic.submit": "Analyser mes symptômes",
    "diagnostic.analyzing": "Pulse AI analyse vos symptômes...",
    "severity.low": "RISQUE FAIBLE",
    "severity.medium": "RISQUE MODÉRÉ",
    "severity.high": "RISQUE ÉLEVÉ",
    "severity.critical": "CRITIQUE — Urgence",
    "auth.login": "Connexion",
    "auth.signup": "Créer un compte",
    "home.tip": "Conseil du jour",
    "offline": "Hors ligne — certaines fonctions sont limitées",
  },
  en: {
    "nav.home": "Home",
    "nav.diagnostic": "Diagnose",
    "nav.hospitals": "Hospitals",
    "nav.lyra": "Lyra",
    "nav.scan": "Scanner",
    "nav.profile": "Profile",
    "diagnostic.title": "Symptom Analysis",
    "diagnostic.placeholder":
      "Describe your symptoms... e.g. fever 38.5°C, headache for 2 days",
    "diagnostic.submit": "Analyze My Symptoms",
    "diagnostic.analyzing": "Pulse AI is analyzing your symptoms...",
    "severity.low": "LOW RISK",
    "severity.medium": "MEDIUM RISK",
    "severity.high": "HIGH RISK",
    "severity.critical": "CRITICAL — Emergency",
    "auth.login": "Sign In",
    "auth.signup": "Create Account",
    "home.tip": "Today's Tip",
    "offline": "Offline — some features are limited",
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)["fr"];

export function t(key: TranslationKey, locale: Locale = "en"): string {
  return translations[locale][key] ?? translations.en[key] ?? key;
}
