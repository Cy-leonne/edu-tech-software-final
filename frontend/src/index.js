
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';
import App from './App';
import theme from './theme';
import store from './redux/store';
import { Provider } from 'react-redux';
import ErrorBoundary from './components/ErrorBoundary';

axios.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  try {
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null');
    const userId = storedUser?._id || storedUser?.id;
    if (userId && !config.headers['x-admin-id'] && !config.headers['x-user-id']) {
      config.headers['x-admin-id'] = userId;
    }
  } catch {
    return config;
  }

  return config;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Provider store={store}>
          <App />
        </Provider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
