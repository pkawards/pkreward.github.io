# Student Achievement Management System (GitHub Pages Version)

This project is a static web application for managing student achievements, designed to be hosted on **GitHub Pages**.

## Features
- **Dashboard**: View statistics, recent awards, and leaderboards.
- **Form Wizard**: Step-by-step form for submitting new awards.
- **Subject Summary**: Filter and view awards by department/subject group.
- **Pending Rewards**: Track awards that have not been received yet.
- **Responsive Design**: Works on Desktop, Tablet, and Mobile.
- **Dark Mode**: Support for light and dark themes.

## Setup Instructions

### 1. Hosting on GitHub Pages
1. Upload the files (`index.html`, `style.css`, `script.js`, `README.md`) to your GitHub repository.
2. Go to **Settings** > **Pages**.
3. Under **Source**, select `main` branch (or `master`).
4. Click **Save**.
5. Your website will be live at `https://<your-username>.github.io/<repo-name>/`.

### 2. Configuration
The application connects to a Google Apps Script (GAS) backend.
To change the backend URL, edit `script.js` line 5:

```javascript
const API_URL = "https://script.google.com/macros/s/AKfycbzGlRlOg6xE0P8z8EUH0lGOVRvM5GvcdtGGBqySEOxPslwhW2adcxPonazUYUjM30VG6Q/exec";
```

### 3. File Structure
- `index.html`: Main application skeleton and views.
- `style.css`: Custom styles and animations.
- `script.js`: Application logic, API calls, and UI handling.

## Technologies
- **HTML5 / CSS3 / JavaScript (ES6+)**
- **TailwindCSS** (via CDN for runtime styling)
- **Lucide Icons** (Iconography)
- **SweetAlert2** (Modal alerts)

## Credits
Developed for Pakkred School.
