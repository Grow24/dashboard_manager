// components/MapWidget.tsx
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapWidget({ locations }: { locations: Array<{ lat: number; lng: number; label?: string }> }) {
  if (!locations?.length) return <div>No location data available</div>;

  return (
    <MapContainer 
      center={[locations[0].lat, locations[0].lng]} 
      zoom={10} 
      style={{ height: '300px', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {locations.map((loc, idx) => (
        <Marker key={idx} position={[loc.lat, loc.lng]}>
          <Popup>{loc.label || `Location ${idx + 1}`}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}