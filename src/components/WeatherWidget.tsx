import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";
import { DEFAULT_LOCATION, fetchCurrentWeather, requestBrowserLocation, type CurrentWeather } from "../services/weather";

function iconForCode(code: number): LucideIcon {
  if (code <= 1) return Sun;
  if (code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return CloudSun;
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" });
const timeFormatter = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function WeatherWidget() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    const load = async () => {
      let coords = DEFAULT_LOCATION;
      try {
        coords = await requestBrowserLocation();
      } catch {
        // Permiso denegado o geolocalizacion no disponible: usamos la ubicacion por defecto.
      }
      try {
        const current = await fetchCurrentWeather(coords);
        if (active) setWeather(current);
      } catch {
        if (active) setWeather(null);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const Icon = weather ? iconForCode(weather.code) : CloudSun;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/40 bg-white/80 p-4 shadow-soft backdrop-blur">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-secondary-container/25 text-primary">
        <Icon />
      </div>
      <div>
        <div className="text-2xl font-bold text-primary">{weather ? `${weather.temperature}°C` : "--"}</div>
        <div className="font-mono text-xs uppercase text-text-secondary">{weather ? weather.description : "Cargando clima"}</div>
        <div className="mt-1 text-xs text-text-secondary">
          {capitalize(dateFormatter.format(now))} · {timeFormatter.format(now)}
        </div>
      </div>
    </div>
  );
}
