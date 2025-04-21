// index.js
import './src/global';
import { registerRootComponent } from 'expo';
import App from './src/App';

// Add global error handler
if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args[0].includes("Cannot read property 'S' of undefined")) {
      console.log('DEBUG - S property error details:', args);
      console.log('Stack trace:', new Error().stack);
    }
    originalConsoleError(...args);
  };
}

registerRootComponent(App);