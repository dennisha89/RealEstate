"use client";

import { useState, useEffect, useCallback } from "react";

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface UseGeolocationResult {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * GPS hook — gets user's current position.
 * Auto-requests on mount, provides refresh function.
 */
export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Enable GPS to find nearby properties."
            : err.code === 2
            ? "Location unavailable"
            : "Location request timed out"
        );
        setLoading(false);
        // Fallback to Austin, TX for demo
        setPosition({ lat: 30.2672, lng: -97.7431, accuracy: 0, timestamp: Date.now() });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    getPosition();
  }, [getPosition]);

  return { position, error, loading, refresh: getPosition };
}

/** Calculate distance between two points in miles (Haversine) */
export function distanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
