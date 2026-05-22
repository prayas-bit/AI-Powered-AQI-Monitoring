import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { aqiService } from '../services/api';
import { Map, AlertTriangle, ShieldCheck, HelpCircle, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const MAP_CENTER = [20.5937, 78.9629];

// Helper component: forces Leaflet to recalculate tile grid after mount
// This is essential in Vite/React Router where the map is rendered inside a flex layout
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const MapView = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await aqiService.getMapStations();
        setStations(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch station coordinates. Verify the backend service.');
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  const getAqiColor = (aqi) => {
    if (aqi <= 50) return '#10b981'; // Emerald
    if (aqi <= 100) return '#f59e0b'; // Amber
    if (aqi <= 200) return '#ef4444'; // Red
    if (aqi <= 300) return '#8b5cf6'; // Purple
    return '#b91c1c'; // Dark Red
  };

  const getAqiSafetyLabel = (aqi) => {
    if (aqi <= 50) return 'Safe (Good)';
    if (aqi <= 100) return 'Safe (Moderate)';
    if (aqi <= 200) return 'Restricted (Unhealthy)';
    if (aqi <= 300) return 'Highly Restricted';
    return 'Critical (Work Suspended)';
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Title Header */}
      <div className="cy-glass p-6 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ borderColor: 'rgba(245,230,66,0.15)' }}>
        <div>
          <h1 className="text-5xl font-display font-black cy-gradient-text tracking-tight flex items-center gap-2.5">
            <Map size={38} style={{ color: '#F5E642' }} />
            Interactive Pollution Map
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Geographic spatial visualization of active AQI stations and localized air quality safety bands.
          </p>
        </div>
        {stations.length > 0 && (
          <span
            className="px-4 py-1.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: 'rgba(245,230,66,0.12)',
              color: '#F5E642',
              border: '1px solid rgba(245,230,66,0.35)',
              boxShadow: '0 0 10px rgba(245,230,66,0.15)',
            }}
          >
            {stations.length} Active Stations
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Map Area */}
        <div
          className="cy-glass lg:col-span-3 rounded-3xl overflow-hidden shadow-2xl relative z-0"
          style={{
            height: '600px',
            border: '1px solid rgba(245,230,66,0.15)',
            boxShadow: '0 0 30px rgba(245,230,66,0.07)',
          }}
        >
          {loading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(8,8,9,0.60)' }}>
              <div
                className="w-10 h-10 border-4 rounded-full animate-spin"
                style={{
                  borderColor: 'rgba(245,230,66,0.2)',
                  borderTopColor: '#F5E642',
                }}
              ></div>
            </div>
          )}
          <MapContainer
            key={mapKey}
            center={MAP_CENTER}
            zoom={4}
            style={{ height: '100%', width: '100%', minHeight: '600px' }}
            scrollWheelZoom={true}
          >
            <InvalidateSizeOnMount />
            {/* Using Dark-Themed tiles mapped on CartoDB */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {stations.map((st) => (
              <CircleMarker
                key={st.city}
                center={[st.lat, st.lon]}
                radius={12}
                pathOptions={{
                  fillColor: getAqiColor(st.aqi),
                  color: '#ffffff',
                  weight: 1.5,
                  opacity: 0.9,
                  fillOpacity: 0.75,
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <span className="font-semibold text-xs text-slate-800">{st.city}: {st.aqi} AQI</span>
                </Tooltip>

                <Popup>
                  <div className="p-2 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b pb-1.5 gap-4"
                      style={{ borderColor: 'rgba(245,230,66,0.15)' }}>
                      <span className="font-display font-bold text-sm" style={{ color: '#F5E642' }}>{st.city}</span>
                      <span
                        className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]"
                        style={{ backgroundColor: `${getAqiColor(st.aqi)}22`, color: getAqiColor(st.aqi), border: `1px solid ${getAqiColor(st.aqi)}44` }}
                      >
                        {st.category}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between gap-6">
                        <span>AQI Index:</span>
                        <span className="font-bold text-white">{st.aqi}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span>PM2.5 Level:</span>
                        <span className="text-white">{st.pm25} ug/m³</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span>PM10 Level:</span>
                        <span className="text-white">{st.pm10} ug/m³</span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t flex items-center gap-1.5 text-slate-300"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      {st.aqi <= 100 ? (
                        <ShieldCheck size={12} style={{ color: '#F5E642' }} className="shrink-0" />
                      ) : (
                        <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      )}
                      <span className="text-[10px] font-semibold">{getAqiSafetyLabel(st.aqi)}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar Legend and Guidelines */}
        <div className="space-y-6">

          {/* Color Legend Card */}
          <div
            className="cy-glass p-6 rounded-3xl shadow-lg space-y-4"
            style={{
              border: '1px solid rgba(245,230,66,0.15)',
              boxShadow: '0 0 20px rgba(245,230,66,0.05)',
            }}
          >
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} style={{ color: '#F5E642' }} />
              Pollution Legend
            </h3>

            <div className="space-y-3">
              {[
                { range: '0–50', label: 'Good', color: '#10b981' },
                { range: '51–100', label: 'Moderate', color: '#f59e0b' },
                { range: '101–200', label: 'Unhealthy', color: '#ef4444' },
                { range: '201–300', label: 'Very Unhealthy', color: '#8b5cf6' },
                { range: '301+', label: 'Hazardous', color: '#b91c1c' }
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-2 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(8,8,9,0.50)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                  <div className="flex-1 flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">{item.label}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{item.range}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spatial Notes */}
          <div
            className="cy-glass p-6 rounded-3xl shadow-lg space-y-3"
            style={{
              border: '1px solid rgba(245,230,66,0.15)',
              boxShadow: '0 0 20px rgba(245,230,66,0.05)',
            }}
          >
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle size={14} style={{ color: '#F5E642' }} />
              Spatial Analytics
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Click on any coordinates marker pin to retrieve the real-time breakdown of chemical parameters and view the immediate health protective actions required by site crews.
            </p>
            <div
              className="p-3 rounded-xl text-[10px] leading-relaxed"
              style={{
                backgroundColor: 'rgba(245,230,66,0.05)',
                border: '1px solid rgba(245,230,66,0.15)',
                color: '#F5E642',
              }}
            >
              <b>Admin note:</b> Map pins are fetched from active municipal monitor points and dynamically refresh.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default MapView;
