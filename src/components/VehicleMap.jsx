import React, { useState, useEffect, useRef } from "react";
import "./VehicleMap.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});


const flagIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1055/1055646.png",
  iconSize: [30, 30],
  iconAnchor: [20, 40],
});


const carDivIcon = new L.DivIcon({
  html: `<img id="car-icon" src="/redcar.png" alt="car" style="width:50px;height:40px;transform:rotate(0deg);" />`,
  className: "",
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});


function getDistance(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(hav));
}


function getBearing(A, B) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const lat1 = toRad(A[0]);
  const lat2 = toRad(B[0]);
  const dLon = toRad(B[1] - A[1]);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function VehicleMap() {
  const [route, setRoute] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visitedPath, setVisitedPath] = useState([]);
  const [currentPos, setCurrentPos] = useState([0, 0]);
  const [speed, setSpeed] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [distanceCovered, setDistanceCovered] = useState(0);
  const [showStats, setShowStats] = useState(true);

  const intervalRef = useRef(null);
  const segmentIndexRef = useRef(0);
  const progressRef = useRef(0);

  
  useEffect(() => {
    if (window.innerWidth < 600) setShowStats(false);
  }, []);


  useEffect(() => {
    fetch("/dummy-route.json")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((p) => [p.latitude, p.longitude]);
        const roundTrip = [...formatted, formatted[0]];
        setRoute(roundTrip);
        setVisitedPath([roundTrip[0]]);
        setCurrentPos(roundTrip[0]);
      });
  }, []);

  
  useEffect(() => {
    if (isPlaying && route.length > 1) {
      const step = 0.02;
      const interval = 50 / speed;

      intervalRef.current = setInterval(() => {
        const i = segmentIndexRef.current;
        const progress = progressRef.current;
        const start = route[i];
        const end = route[i + 1];
        if (!end) {
          clearInterval(intervalRef.current);
          alert("🎉 Round Trip Completed!");
          return;
        }

        const lat = start[0] + (end[0] - start[0]) * progress;
        const lng = start[1] + (end[1] - start[1]) * progress;
        const newPos = [lat, lng];
        setCurrentPos(newPos);
        setVisitedPath((prev) => [...prev, newPos]);

        
        const bearing = getBearing(start, end);
        const carEl = document.getElementById("car-icon");
        if (carEl)
          carEl.style.transform = `rotate(${(bearing - 90 + 90) % 360}deg)`;

        progressRef.current += step;

        if (progressRef.current >= 1) {
          progressRef.current = 0;
          segmentIndexRef.current++;
          setCurrentIndex(segmentIndexRef.current);

          
          setDistanceCovered((prev) => prev + getDistance(start, end) * 1000);
        }
      }, interval);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, route]);

  if (route.length === 0) return <p>Loading route...</p>;

  
  const totalDistance = route.reduce(
    (sum, _, i) =>
      i < route.length - 1 ? sum + getDistance(route[i], route[i + 1]) : sum,
    0
  );
  const progressPercent = Math.min(
    ((currentIndex / (route.length - 1)) * 100).toFixed(1),
    100
  );

  const speedKmH = (speed * 40).toFixed(1); 
  const distanceKm = (distanceCovered / 1000).toFixed(2);

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        background: darkMode ? "#121212" : "#fff",
        color: darkMode ? "#e0e0e0" : "#000",
      }}
    >
     
      <div
        style={{
          position: "absolute",
          top: 10,
          transform: "translateX(-50%)",
          maxWidth: 380,
          background: darkMode ? "#2d2d2d" : "#fff",
          padding: "14px 18px",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          zIndex: 1000,
        }}
        className="control-panel"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ margin: 0 }}>🚗 Vehicle Tracker</h3>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: darkMode ? "#ffeb3b" : "#333",
              color: darkMode ? "#333" : "white",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <p style={{ marginTop: 8 }}>
          Coordinates: {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}
        </p>
        <p>Progress: {progressPercent}%</p>

        
        <div
          style={{
            background: "#ddd",
            borderRadius: 8,
            height: 8,
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: darkMode ? "#00e676" : "#2196f3",
              transition: "width 0.2s ease",
            }}
          />
        </div>

    
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: isPlaying ? "#f44336" : "#4caf50",
              color: "white",
            }}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              clearInterval(intervalRef.current);
              segmentIndexRef.current = 0;
              progressRef.current = 0;
              setCurrentIndex(0);
              setVisitedPath([route[0]]);
              setCurrentPos(route[0]);
              setDistanceCovered(0);
              const carEl = document.getElementById("car-icon");
              if (carEl) carEl.style.transform = "rotate(0deg)";
            }}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: "#2196f3",
              color: "white",
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ fontWeight: "bold" }}>
            Speed: {speed.toFixed(1)}×
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

      
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowStats(!showStats)}
            style={{
              width: "100%",
              background: darkMode ? "#444" : "#e0e0e0",
              border: "none",
              borderRadius: 6,
              padding: "6px 10px",
              fontWeight: "bold",
              cursor: "pointer",
              color: darkMode ? "#fff" : "#000",
            }}
          >
            {showStats ? "📉 Hide Travel Stats" : "📊 Show Travel Stats"}
          </button>

          {showStats && (
            <div
              style={{
                marginTop: 8,
                background: darkMode ? "#1b1b1b" : "#f5f5f5",
                padding: "8px 10px",
                borderRadius: 8,
                transition: "all 0.3s ease",
              }}
            >
              <p style={{ margin: "4px 0" }}>
                🚘 Distance: {distanceKm} / {totalDistance.toFixed(2)} km
              </p>
              <p style={{ margin: "4px 0" }}>💨 Speed: {speedKmH} km/h</p>
            </div>
          )}
        </div>
      </div>

      
      <MapContainer
        center={currentPos}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={
            darkMode
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution="© OpenStreetMap contributors"
        />

        <Marker position={route[0]} icon={flagIcon}>
          <Popup>🏁 Start Point</Popup>
        </Marker>
        <Marker position={route[route.length - 1]} icon={flagIcon}>
          <Popup>🏁 End Point</Popup>
        </Marker>

        <Marker position={currentPos} icon={carDivIcon}>
          <Popup>🚗 Vehicle</Popup>
        </Marker>

        <Polyline positions={route} color="blue" weight={3} />
        <Polyline positions={visitedPath} pathOptions={{ color: "red" }} />

        {route.map((pos, i) => (
          <Marker
            key={i}
            position={pos}
            icon={
              new L.DivIcon({
                html: `<div style="background:${
                  i <= currentIndex ? "#e91e63" : "#007bff"
                };width:24px;height:24px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:12px;font-weight:bold;">
            ${i + 1}
          </div>`,
                className: "number-marker",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })
            }
          >
            <Popup>Stop {i + 1}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default VehicleMap;
