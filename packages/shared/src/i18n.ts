/** Hafif i18n çekirdeği — TR varsayılan, EN hazır. Web + mobil ortak. */

export type Locale = "tr" | "en";
export const LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";

type Dict = Record<string, string>;

const tr: Dict = {
  "nav.sell": "İlan Ver",
  "nav.login": "Giriş",
  "nav.search": "Ne arıyorsun? (ör. iPhone, koltuk, bisiklet)",
  "explore.discover": "Keşfet",
  "explore.forYou": "Senin için",
  "explore.all": "Tümü",
  "explore.results": "ilan",
  "explore.noResults": "Sonuç bulunamadı.",
  "explore.saveSearch": "Aramayı kaydet",
  "explore.map": "Harita",
  "explore.list": "Liste",
  "sort.relevance": "İlgili",
  "sort.newest": "En yeni",
  "sort.price_asc": "Artan fiyat",
  "sort.price_desc": "Azalan fiyat",
  "common.loading": "Yükleniyor…",
  "common.cancel": "Vazgeç",
  "common.send": "Gönder",
  "profile.title": "Profilim",
  "profile.logout": "Çıkış yap",
  "profile.save": "Kaydet",
  "profile.myListings": "İlanlarım",
  "profile.favorites": "Favorilerim",
  "profile.becomeStore": "Mağaza Ol",
  "profile.language": "Dil",
  "listing.message": "Mesaj At",
  "listing.makeOffer": "Teklif Ver",
  "listing.boost": "Öne Çıkar",
  "listing.similar": "Benzer ilanlar",
  "listing.safety": "Kapora gönderme. Yüz yüze, güvenli yerde buluş.",
};

const en: Dict = {
  "nav.sell": "Post Ad",
  "nav.login": "Sign in",
  "nav.search": "What are you looking for? (e.g. iPhone, sofa, bike)",
  "explore.discover": "Discover",
  "explore.forYou": "For you",
  "explore.all": "All",
  "explore.results": "ads",
  "explore.noResults": "No results found.",
  "explore.saveSearch": "Save search",
  "explore.map": "Map",
  "explore.list": "List",
  "sort.relevance": "Relevant",
  "sort.newest": "Newest",
  "sort.price_asc": "Price ↑",
  "sort.price_desc": "Price ↓",
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.send": "Send",
  "profile.title": "My Profile",
  "profile.logout": "Sign out",
  "profile.save": "Save",
  "profile.myListings": "My Listings",
  "profile.favorites": "My Favorites",
  "profile.becomeStore": "Become a Store",
  "profile.language": "Language",
  "listing.message": "Message",
  "listing.makeOffer": "Make Offer",
  "listing.boost": "Boost",
  "listing.similar": "Similar listings",
  "listing.safety": "Never send deposits. Meet in person, in a safe place.",
};

const DICTS: Record<Locale, Dict> = { tr, en };

export type TranslationKey = keyof typeof tr;

/** Belirli bir dil için çeviri fonksiyonu üretir. Eksik anahtar → anahtarın kendisi. */
export function createT(locale: Locale) {
  const dict = DICTS[locale] ?? tr;
  return (key: TranslationKey): string => dict[key] ?? tr[key] ?? key;
}

export const localeLabel: Record<Locale, string> = { tr: "Türkçe", en: "English" };
