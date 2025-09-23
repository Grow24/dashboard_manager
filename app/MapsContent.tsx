import React, { useState, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '700px',
};

const indiaCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const markers = [
  { id: 1, position: { lat: 28.6139, lng: 77.209 }, title: 'New Delhi', type: 'capital' },
  { id: 2, position: { lat: 19.076, lng: 72.8777 }, title: 'Mumbai', type: 'metro' },
  { id: 3, position: { lat: 13.0827, lng: 80.2707 }, title: 'Chennai', type: 'metro' },
  { id: 4, position: { lat: 22.5726, lng: 88.3639 }, title: 'Kolkata', type: 'metro' },
  { id: 5, position: { lat: 12.9716, lng: 77.5946 }, title: 'Bangalore', type: 'metro' },
];

export default function MapsContent() {
  const [zoom, setZoom] = useState(5);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [clickInfo, setClickInfo] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, latLng: null });
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const clickTimeoutRef = useRef(null);

  const onLoad = (map) => {
    mapRef.current = map;
  };

  const onZoomChanged = () => {
    if (mapRef.current) {
      setZoom(mapRef.current.getZoom());
    }
  };

  const filteredMarkers = filterType === 'all' ? markers : markers.filter(m => m.type === filterType);

  // Single click handler with delay to distinguish from double click
  const handleMapClick = (event) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      setClickInfo({
        type: 'singleClick',
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
      setSelectedMarker(null);
      setContextMenu({ visible: false, x: 0, y: 0, latLng: null });
    }, 250); // 250ms delay
  };

  // Double click cancels single click timer
  const handleMapDoubleClick = (event) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    setClickInfo({
      type: 'doubleClick',
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    });
    setContextMenu({ visible: false, x: 0, y: 0, latLng: null });
    setSelectedMarker(null);
  };

  const handleMapRightClick = (event) => {
    event.domEvent.preventDefault(); // Prevent default browser context menu

    const mapDiv = mapRef.current.getDiv();
    const mapRect = mapDiv.getBoundingClientRect();

    // Calculate pixel position relative to map container
    const x = event.domEvent.clientX - mapRect.left;
    const y = event.domEvent.clientY - mapRect.top;

    setContextMenu({
      visible: true,
      x,
      y,
      latLng: event.latLng,
    });

    setClickInfo({
      type: 'contextMenu',
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    });
    setSelectedMarker(null);
  };

  const handleMarkerClick = (marker) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setSelectedMarker(marker);
    setClickInfo(null);
    setContextMenu({ visible: false, x: 0, y: 0, latLng: null });
  };

  // Context menu actions
  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(Math.min(mapRef.current.getZoom() + 1, 20));
    }
    setContextMenu({ visible: false, x: 0, y: 0, latLng: null });
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() - 1, 1));
    }
    setContextMenu({ visible: false, x: 0, y: 0, latLng: null });
  };

  const centerHere = () => {
    if (mapRef.current && contextMenu.latLng) {
      mapRef.current.panTo(contextMenu.latLng);
    }
    setContextMenu({ visible: false, x: 0, y: 0, latLng: null });
  };

  return (
    <div style={{ height: '90%', position: 'relative' }} ref={mapContainerRef}>
      <LoadScript googleMapsApiKey="AIzaSyAFXZaeBQvHKMHTSZYlPyCyyse8TTBtlIw">
        <div style={{ marginBottom: 10 }}>
          <label>
            Filter markers:&nbsp;
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All</option>
              <option value="capital">Capital</option>
              <option value="metro">Metro</option>
            </select>
          </label>
        </div>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={indiaCenter}
          zoom={zoom}
          onLoad={onLoad}
          onZoomChanged={onZoomChanged}
          onClick={handleMapClick}
          onDblClick={handleMapDoubleClick}
          onRightClick={handleMapRightClick}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {filteredMarkers.map(({ id, position, title }) => (
            <Marker
              key={id}
              position={position}
              title={title}
              onClick={() => handleMarkerClick({ id, position, title })}
            />
          ))}

          {selectedMarker && (
            <InfoWindow
              position={selectedMarker.position}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div>
                <h4>{selectedMarker.title}</h4>
                <p>Lat: {selectedMarker.position.lat.toFixed(4)}</p>
                <p>Lng: {selectedMarker.position.lng.toFixed(4)}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* Custom Context Menu */}
      {contextMenu.visible && (
        <ul
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            padding: '8px 0',
            margin: 0,
            listStyle: 'none',
            borderRadius: 4,
            zIndex: 1000,
            width: 150,
            userSelect: 'none',
          }}
          onContextMenu={(e) => e.preventDefault()} // prevent default context menu on our menu
        >
          <li
            style={{ padding: '8px 16px', cursor: 'pointer' }}
            onClick={zoomIn}
          >
            Zoom In
          </li>
          <li
            style={{ padding: '8px 16px', cursor: 'pointer' }}
            onClick={zoomOut}
          >
            Zoom Out
          </li>
          <li
            style={{ padding: '8px 16px', cursor: 'pointer' }}
            onClick={centerHere}
          >
            Center Here
          </li>
        </ul>
      )}

      <div style={{ marginTop: 20 }}>
        {clickInfo && (
          <div style={{ padding: 10, backgroundColor: '#eee', borderRadius: 4 }}>
            <strong>{clickInfo.type} detected at:</strong> Lat {clickInfo.lat.toFixed(4)}, Lng {clickInfo.lng.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}