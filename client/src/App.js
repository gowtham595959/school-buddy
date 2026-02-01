// client/src/App.js

import React, { useEffect, useState } from "react";
import MapView from "./MapView";
import { loadSchools } from "./domains/schools/schools.service";
import "./App.css";

export default function App() {
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await loadSchools();
        if (isMounted) {
          setSchools(data);
        }
      } catch (err) {
        console.error("❌ Failed to fetch schools:", err);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app">
      <div className="header">
        <img
          src="/logo_monkey.png"
          alt="logo"
          style={{ height: 80, width: "auto" }}
        />
        <h2>School Buddy</h2>
      </div>

      {/* Map */}
      <MapView schools={schools} />
    </div>
  );
}
