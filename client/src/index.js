// Import the main React library.
// React lets us write components using JSX (HTML-like syntax inside JavaScript).
import React from "react";

// Import the part of React that is responsible for connecting
// our React components to the real web browser DOM.
import ReactDOM from "react-dom/client";

// Import global styles for the whole application.
// These styles apply to the entire page.
import "./index.css";

// Import the main App component.
// This is the first React component that will be displayed on the screen.
import App from "./App";


// ------------------------------
// CREATE THE ROOT OF OUR APP
// ------------------------------

// Find the <div id="root"> inside public/index.html.
// The browser created this element when it loaded index.html.
// React needs this element so it knows *where* to put the app on the page.
const root = ReactDOM.createRoot(document.getElementById("root"));


// ------------------------------
// RENDER (DISPLAY) THE APP
// ------------------------------

// Tell React to "render" (show) the <App /> component
// inside the div we found above (#root).
// Everything inside our React application will now appear inside that div.
root.render(<App />);


// After this line runs, App.js loads ExplorePage (v2), and the UI appears.
