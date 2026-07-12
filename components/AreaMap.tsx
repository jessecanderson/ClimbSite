"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

type Point = {
  name: string;
  lat: number;
  lng: number;
  kind: "area" | "campground";
  detail?: string;
  href?: string;
};

const areaIcon = L.divIcon({
  className: "map-pin area-pin",
  html: '<span style="background:#a14f35;border:2px solid white;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.25);display:block;height:18px;width:18px"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const campIcon = L.divIcon({
  className: "map-pin camp-pin",
  html: '<span style="background:#2f5f4b;border:2px solid white;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.25);display:block;height:18px;width:18px"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function FitMapToPoints({ points }: { points: Point[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }

    map.fitBounds(
      L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number])),
      { padding: [36, 36], maxZoom: 11 }
    );
  }, [map, points]);

  return null;
}

export function AreaMap({ points }: { points: Point[] }) {
  const center = points[0] ?? { lat: 37.78, lng: -83.68 };

  return (
    <div className="map-shell">
      <MapContainer center={[center.lat, center.lng]} zoom={11} scrollWheelZoom={false}>
        <FitMapToPoints points={points} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <Marker
            key={`${point.kind}-${point.name}`}
            position={[point.lat, point.lng]}
            icon={point.kind === "area" ? areaIcon : campIcon}
          >
            <Popup>
              <strong>{point.name}</strong>
              {point.detail ? <p style={{ margin: "6px 0" }}>{point.detail}</p> : null}
              {point.href ? <a href={point.href}>View details</a> : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-dot legend-area" />Climbing area</span>
        <span><i className="legend-dot legend-camp" />Campground</span>
      </div>
    </div>
  );
}
