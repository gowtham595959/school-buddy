// client/src/api.js
import axios from 'axios';

// 👇 No REACT_APP_API_URL, no hard-coded Codespaces URL
// CRA dev server will proxy `/api` to backend
const API_BASE = '/api';

console.log("API BASE =", API_BASE);

export const fetchSchools = async () => {
  const res = await axios.get(`${API_BASE}/schools`);
  return res.data;
};
