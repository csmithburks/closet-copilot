import * as Location from 'expo-location';

// Current temperature (°F) and rain for the phone's location, from Open-Meteo
// (free, no account). Returns null if location or network isn't available.
export async function currentWeather() {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = pos.coords;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}` +
      '&current=temperature_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&temperature_unit=fahrenheit&timezone=auto&forecast_days=1';
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    const code = d.current?.weather_code ?? 0;
    const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    const snowy = (code >= 71 && code <= 77) || code === 85 || code === 86;
    const chance = d.daily?.precipitation_probability_max?.[0] ?? 0;
    return {
      tempF: Math.round(d.current?.temperature_2m),
      high: Math.round(d.daily?.temperature_2m_max?.[0]),
      low: Math.round(d.daily?.temperature_2m_min?.[0]),
      rain: rainy || snowy || chance >= 50,
      summary: snowy ? 'Snow' : rainy ? 'Rain' : chance >= 50 ? `${chance}% chance of rain` : 'Dry',
      at: Date.now(),
    };
  } catch {
    return null;
  }
}
