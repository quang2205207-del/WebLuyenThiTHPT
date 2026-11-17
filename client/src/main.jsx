import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './AuthContext';
import { AudioPlayerProvider } from './components/AudioPlayerContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AudioPlayerProvider>
          <App />
        </AudioPlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
