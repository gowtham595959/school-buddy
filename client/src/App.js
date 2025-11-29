import React, { useEffect, useState } from "react";
import MapView from "./MapView";
import { fetchSchools } from "./api";
import "./App.css";

function App() {
  const [schools, setSchools] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetchSchools()
      .then((data) => setSchools(data))
      .catch((err) => console.error("Error loading schools", err));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <img src="/logo.png" className="logo" alt="Logo" />
        <h1>School Catchment Map</h1>
      </header>

      <div className="main">
        <div className="sidebar">
          <h3>Select School</h3>

          {!schools.length && <p>Loading schools...</p>}

          {schools.length > 0 && (
            <select
              multiple
              value={selected}
              onChange={(e) =>
                setSelected(
                  [...e.target.selectedOptions].map((opt) => opt.value)
                )
              }
            >
              {schools.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <p className="info">
            Tiffin uses postcode boundaries.  
            Wallington & Nonsuch use radius catchments.
          </p>
        </div>

        <MapView selectedSchools={selected} />
      </div>
    </div>
  );
}

export default App;
