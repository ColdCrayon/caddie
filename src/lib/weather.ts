export interface WeatherForecast {
  current: {
    temperature: number
    wind_speed: number
    wind_direction: number
    weather_code: number
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    wind_speed_10m_max: number[]
    precipitation_sum: number[]
    weather_code: number[]
  }
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherForecast> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toString())
  url.searchParams.set('longitude', lng.toString())
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code')
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,weather_code')
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('wind_speed_unit', 'mph')
  url.searchParams.set('forecast_days', '3')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()
  return {
    current: {
      temperature: data.current.temperature_2m,
      wind_speed: data.current.wind_speed_10m,
      wind_direction: data.current.wind_direction_10m,
      weather_code: data.current.weather_code,
    },
    daily: data.daily,
  }
}

export function windDirectionLabel(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(degrees / 45) % 8]
}

export function weatherDescription(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly Cloudy'
  if (code <= 9) return 'Foggy'
  if (code <= 19) return 'Drizzle'
  if (code <= 29) return 'Thunderstorm'
  if (code <= 39) return 'Blowing Snow'
  if (code <= 49) return 'Fog'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Rain Showers'
  if (code <= 94) return 'Thunderstorm'
  return 'Storm'
}
