import Framework7 from 'framework7/bundle';
import 'framework7/css/bundle';

// Import your main app component (.f7 file, NOT ./app.js)
import App from '../app.f7';

// Define routes
const routes = [
  {
    path: '/',
    url: './index.html',
  },
  {
    path: '/page-home/',
    componentUrl: './pages/home.f7',
  },
];

// Initialize Framework7
const app = new Framework7({
  el: '#app', // Root app element in index.html
  name: 'My Hello World App',
  theme: 'md', // Use 'md' for Material Design (not 'material')
  darkMode: true, // Use 'darkMode' (not 'darkTheme')
  component: App, // Use 'component' (not 'app')
  routes: routes, // Pass routes directly into the constructor
});

// Create the main view
const mainView = app.views.create('.view-main', {
  url: '/page-home/',
});
