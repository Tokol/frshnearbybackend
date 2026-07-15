"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

type Point = { latitude: number; longitude: number };

function distanceKm(from: Point, to: Point) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationMap({ seller }: { seller: Point }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | undefined>(undefined);
  const currentMarker = useRef<Marker | undefined>(undefined);
  const [current, setCurrent] = useState<Point>();
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void import("leaflet").then((L) => {
      if (!active || !element.current || map.current) return;
      const instance = L.map(element.current).setView(
        [seller.latitude, seller.longitude],
        16,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(instance);
      L.marker([seller.latitude, seller.longitude], {
        icon: L.divIcon({
          className: "frsh-map-marker seller",
          html: "<span>●</span>",
          iconSize: [30, 38],
          iconAnchor: [15, 38],
        }),
      })
        .addTo(instance)
        .bindPopup("Registered seller location");
      map.current = instance;
    });
    return () => {
      active = false;
      map.current?.remove();
      map.current = undefined;
    };
  }, [seller.latitude, seller.longitude]);

  function showCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }
    setFinding(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrent(point);
        const L = await import("leaflet");
        if (map.current) {
          currentMarker.current?.remove();
          currentMarker.current = L.marker([point.latitude, point.longitude], {
            icon: L.divIcon({
              className: "frsh-map-marker current",
              html: "<span>●</span>",
              iconSize: [30, 38],
              iconAnchor: [15, 38],
            }),
          })
            .addTo(map.current)
            .bindPopup("Your current location");
          map.current.fitBounds(
            [
              [seller.latitude, seller.longitude],
              [point.latitude, point.longitude],
            ],
            { padding: [42, 42], maxZoom: 16 },
          );
        }
        setFinding(false);
      },
      (locationError) => {
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. Allow it in this site's browser settings to calculate distance."
            : "Your current location could not be detected.",
        );
        setFinding(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  const distance = current ? distanceKm(current, seller) : undefined;
  const directions = current
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${current.latitude}%2C${current.longitude}%3B${seller.latitude}%2C${seller.longitude}`
    : undefined;
  return (
    <div className="location-map-widget">
      <div ref={element} className="leaflet-map" />
      <div className="map-legend">
        <span>
          <i className="seller-dot" /> Registered location
        </span>
        {current && (
          <span>
            <i className="current-dot" /> Your location
          </span>
        )}
      </div>
      <div className="distance-row">
        {distance == null ? (
          <button
            type="button"
            onClick={showCurrentLocation}
            disabled={finding}
          >
            {finding ? "Finding your location…" : "Show my location & distance"}
          </button>
        ) : (
          <>
            <div>
              <small>STRAIGHT-LINE DISTANCE</small>
              <strong>
                {distance < 1
                  ? `${Math.round(distance * 1000)} m away`
                  : `${distance.toFixed(1)} km away`}
              </strong>
            </div>
            <a href={directions} target="_blank" rel="noreferrer">
              Get directions ↗
            </a>
          </>
        )}
      </div>
      {error && <p className="map-location-error">{error}</p>}
    </div>
  );
}
