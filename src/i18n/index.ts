import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { usePreferences } from "@/lib/preferences";
// pl.json / en.json are synced from the desktop (npm run sync:shared);
// texts that exist only on the phone live in mobile.*.json under "mobile".
import en from "./en.json";
import mobileEn from "./mobile.en.json";
import mobilePl from "./mobile.pl.json";
import pl from "./pl.json";

void i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: { ...pl, ...mobilePl } },
    en: { translation: { ...en, ...mobileEn } },
  },
  lng: usePreferences.getState().language,
  fallbackLng: "pl",
  interpolation: { escapeValue: false },
});

usePreferences.subscribe((state, prev) => {
  if (state.language !== prev.language) void i18n.changeLanguage(state.language);
});

export default i18n;
