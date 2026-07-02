"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import Link from "next/link";
import { cityToCoords, jitter, type Listing } from "@satiyo/shared";
import { formatPrice } from "@/lib/format";

// Leaflet varsayılan ikon yolu Next'te bozulur — CDN ikonuyla düzelt
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

export default function MapView({ listings }: { listings: Listing[] }) {
  const pins = listings
    .map((l) => {
      const base = cityToCoords(l.city);
      return base ? { l, pos: jitter(base, l.id) } : null;
    })
    .filter(Boolean) as { l: Listing; pos: [number, number] }[];

  const center: [number, number] = pins[0]?.pos ?? [39.0, 35.0];

  return (
    <div style={{ height: 540, borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
      <MapContainer center={center} zoom={pins.length ? 6 : 5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map(({ l, pos }) => (
          <Marker key={l.id} position={pos} icon={icon}>
            <Popup>
              <strong>{formatPrice(l.price, l.priceType)}</strong><br />
              {l.title}<br />
              <Link href={`/ilan/${l.id}`}>İlana git →</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {pins.length === 0 && (
        <div className="empty" style={{ marginTop: -300, position: "relative", zIndex: 500 }}>
          Bu sonuçlarda haritalanacak konum yok.
        </div>
      )}
    </div>
  );
}
