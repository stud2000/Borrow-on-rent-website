import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import API from '../utils/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView() {
  const [items, setItems] = useState([]);
  const [center, setCenter] = useState([20.5937, 78.9629]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
    API.get('/items', { params: { limit: 100 } })
      .then(res => setItems(res.data.items.filter(i => i.location?.coordinates?.[0] !== 0)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items Near You</h1>
          <p className="text-gray-500 text-sm">{items.length} items on the map</p>
        </div>
        <Link to="/" className="btn-secondary text-sm">← Browse List</Link>
      </div>

      {loading ? (
        <div className="h-[500px] bg-gray-100 rounded-2xl flex items-center justify-center">
          <div className="text-gray-400">Loading map...</div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ height: '600px' }}>
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {items.map(item => (
              item.location?.coordinates && (
                <Marker key={item._id} position={[item.location.coordinates[1], item.location.coordinates[0]]}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-gray-500">{item.category}</p>
                      <p className={`font-medium mt-1 ${item.status === 'available' ? 'text-green-600' : 'text-orange-500'}`}>{item.status}</p>
                      <a href={`/items/${item._id}`} className="text-blue-600 hover:underline block mt-1">View details →</a>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
