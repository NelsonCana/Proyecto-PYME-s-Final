// src/main.jsx

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
// (Ya no necesitamos importar BrowserRouter aquí)
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Dejamos que App.jsx se encargue del Router */}
    <App /> 
  </React.StrictMode>
)