import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { cityToCoords, jitter, type Listing } from "@satiyo/shared";
import { formatPrice } from "@/lib/format";

export function ListingsMap({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const pins = listings
    .map((l) => {
      const base = cityToCoords(l.city);
      return base ? { l, pos: jitter(base, l.id) } : null;
    })
    .filter(Boolean) as { l: Listing; pos: [number, number] }[];

  const center = pins[0]?.pos ?? [39.0, 35.0];

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{ latitude: center[0], longitude: center[1], latitudeDelta: pins.length ? 4 : 12, longitudeDelta: pins.length ? 4 : 12 }}
    >
      {pins.map(({ l, pos }) => (
        <Marker
          key={l.id}
          coordinate={{ latitude: pos[0], longitude: pos[1] }}
          title={`${formatPrice(l.price, l.priceType)} · ${l.title}`}
          description="İlanı aç"
          onCalloutPress={() => router.push(`/ilan/${l.id}`)}
        />
      ))}
    </MapView>
  );
}
