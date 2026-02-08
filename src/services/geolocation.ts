// Geolocation service for proximity-based features

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
};

export const watchPosition = (
  onSuccess: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void
): number => {
  return navigator.geolocation.watchPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  });
};

export const clearWatch = (watchId: number): void => {
  navigator.geolocation.clearWatch(watchId);
};

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if user is within a certain radius of a location
 * @param userCoords User's current coordinates
 * @param targetCoords Target location coordinates
 * @param radiusMeters Radius in meters (default 100m)
 */
export const isWithinRadius = (
  userCoords: Coordinates,
  targetCoords: Coordinates,
  radiusMeters: number = 100
): boolean => {
  const distance = calculateDistance(
    userCoords.latitude,
    userCoords.longitude,
    targetCoords.latitude,
    targetCoords.longitude
  );
  return distance <= radiusMeters;
};

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Get distance color based on proximity
 */
export const getDistanceColor = (meters: number): string => {
  if (meters < 20) return 'text-success';
  if (meters < 50) return 'text-warning';
  return 'text-muted-foreground';
};
