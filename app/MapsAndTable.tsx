// import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

import React, { useState, useRef } from 'react';
// import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Dot,
} from 'recharts';

const containerStyle = {
    width: '100%',
    height: '500px',
};

const center = {
    lat: 37.7749, // Default center (San Francisco)
    lng: -122.4194,
};

// Example markers
const markers = [
    { id: 1, position: { lat: 37.7749, lng: -122.4194 }, title: 'San Francisco' },
    { id: 2, position: { lat: 34.0522, lng: -118.2437 }, title: 'Los Angeles' },
    { id: 3, position: { lat: 40.7128, lng: -74.006 }, title: 'New York' },
];

// Sample data for charts
const data = [
    { name: 'Jan', uv: 400, pv: 240 },
    { name: 'Feb', uv: 300, pv: 139 },
    { name: 'Mar', uv: 200, pv: 980 },
    { name: 'Apr', uv: 278, pv: 390 },
    { name: 'May', uv: 189, pv: 480 },
    { name: 'Jun', uv: 239, pv: 380 },
    { name: 'Jul', uv: 349, pv: 430 },
];

// Custom tooltip content
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip" style={{ backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ccc' }}>
                <p className="label">{`Name: ${payload[0].payload.name}`}</p>
                <p className="intro">{`UV: ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

export default function MapComponent() {
    const [zoom, setZoom] = useState(5);
    const [activeBar, setActiveBar] = useState(null);

    // const onZoomChanged = (map) => {
    //     setZoom(map.getZoom());
    // };

    const handleBarMouseEnter = (data) => {
        setActiveBar(data);
    };

    const handleBarMouseLeave = () => {
        setActiveBar(null);
    };
    // const [zoom, setZoom] = useState(5);
    const mapRef = useRef(null);

    const onLoad = (map) => {
        mapRef.current = map;
    };

    const onZoomChanged = () => {
        if (mapRef.current) {
            setZoom(mapRef.current.getZoom());
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
           <LoadScript googleMapsApiKey="AIzaSyC2YZDmqIxjLu_Giotukm7zb6_qKaJQ6Vk">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={zoom}
                    onLoad={onLoad}
                    onZoomChanged={onZoomChanged}
                    options={{
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                    }}
                >
                    {markers.map(({ id, position, title }) => (
                        <Marker key={id} position={position} title={title} />
                    ))}
                </GoogleMap>
            </LoadScript>

            {/* Charts container */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 40 }}>
                {/* Bar Chart */}
                <div style={{ width: '45%', height: 300 }}>
                    <h3 style={{ textAlign: 'center' }}>Bar Chart</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="uv"
                                fill="#8884d8"
                                animationDuration={1500}
                                onMouseEnter={handleBarMouseEnter}
                                onMouseLeave={handleBarMouseLeave}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Line Chart */}
                <div style={{ width: '45%', height: 300 }}>
                    <h3 style={{ textAlign: 'center' }}>Line Chart</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="pv"
                                stroke="#82ca9d"
                                strokeWidth={3}
                                animationDuration={1500}
                                animationEasing="ease-in-out"
                                dot={<Dot r={5} animationDuration={500} />}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}