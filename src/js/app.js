import Framework7 from 'framework7';
import App from './app';

const app = new Framework7({
  // App parameters
  name: 'My Hello World App',
  theme: 'material', 
  
  // Enable Dark Mode
  darkTheme: true, 
  
  // App component
  app: App,
});

// Initialize the app
app.framework7.init();

// Add a simple "Hello World" view to the app
app.views.create({
  el: '.view-main',
  url: '#/page-home/',
});

// Define the Home Page content via Router
app.views.router.routes = [
  {
    path: '/page-home/',
    componentUrl: './pages/home.f7',
  },
];