export interface CurrentWeather {
  temperature: number;
  code: number;
  description: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Fallback usado cuando el usuario rechaza la geolocalizacion o no esta disponible.
export const DEFAULT_LOCATION: Coordinates = { latitude: -33.4489, longitude: -70.6693 };

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia intensa",
  66: "Lluvia helada",
  67: "Lluvia helada intensa",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve intensa",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos violentos",
  85: "Chubascos de nieve",
  86: "Chubascos de nieve intensos",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta con granizo intenso",
};

export function describeWeather(code: number): string {
  return WEATHER_DESCRIPTIONS[code] ?? "Clima no disponible";
}

export async function fetchCurrentWeather({ latitude, longitude }: Coordinates): Promise<CurrentWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo obtener el clima.");
  const payload = (await response.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
  const current = payload.current;
  if (!current || typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") {
    throw new Error("Respuesta de clima invalida.");
  }
  return {
    temperature: Math.round(current.temperature_2m),
    code: current.weather_code,
    description: describeWeather(current.weather_code),
  };
}

export function requestBrowserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocalizacion no disponible."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(error),
      { timeout: 8000, maximumAge: 600_000 },
    );
  });
}
