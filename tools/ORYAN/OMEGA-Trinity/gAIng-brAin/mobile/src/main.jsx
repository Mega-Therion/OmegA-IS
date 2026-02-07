/**
 * OMEGA Mobile - Main Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize Capacitor plugins
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';

// Configure status bar
const initializeApp = async () => {
  try {
    // Set status bar style
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
  } catch (e) {
    // Not on mobile
  }

  try {
    // Configure keyboard
    Keyboard.setAccessoryBarVisible({ isVisible: false });
    Keyboard.setScroll({ isDisabled: true });
  } catch (e) {
    // Not on mobile
  }
  
  // Handle back button on Android
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      CapApp.exitApp();
    } else {
      window.history.back();
    }
  });

  // Hide splash screen
  try {
    await SplashScreen.hide();
  } catch (e) {
    // Not on mobile
  }
  
  // Hide loading screen
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 300);
  }
};

// Render app
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize after render
initializeApp();
