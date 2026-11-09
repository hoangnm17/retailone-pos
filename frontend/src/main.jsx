import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style/POS/SalePage.css';
import './style/pos-scope.css';
createRoot(document.getElementById('root')).render(<App/>);
