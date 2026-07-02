// app.json üzerine env-tabanlı override'lar (production / EAS hazır).
// GOOGLE_MAPS_API_KEY: EAS secret veya .env — Android harita karoları için gereklidir.
// Anahtar yoksa iOS haritası (Apple Maps) çalışır, Android'de harita boş kalır (çökme yok).
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const android = { ...config.android };
  if (googleMapsApiKey) {
    android.config = {
      ...(android.config || {}),
      googleMaps: { apiKey: googleMapsApiKey },
    };
  }
  return { ...config, android };
};
