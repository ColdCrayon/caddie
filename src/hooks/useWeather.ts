import { useQuery } from '@tanstack/react-query'
import { fetchWeather } from '../lib/weather'

export function useWeather(lat: number | undefined, lng: number | undefined) {
  return useQuery({
    queryKey: ['weather', lat, lng],
    queryFn: () => fetchWeather(lat!, lng!),
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}
