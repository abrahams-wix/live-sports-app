# Live Sports App

A dedicated web application for tracking Cleveland sports teams (Guardians, Browns, Cavs), built with Node.js and Express.

## Features

- **Responsive Landing Page**: Modern, responsive design with a "Cleveland sports. All in one place." tagline that adapts to screen size.
- **Dynamic Layouts**: Utilizes Flexbox for sticky footers and centered content.
- **Live Data Integration**: Connects to ESPN's public API to fetch real-time team data and schedules (currently implemented for MLB).
- **Custom Branding**: Stylized interface featuring Cleveland skyline imagery and team logos.

## Tech Stack

- **Frontend**: HTML5, CSS3 (Custom properties, Flexbox, Media Queries)
- **Backend**: Node.js, Express.js
- **Tools**: Nodemon for development

## Getting Started

### Prerequisites
- Node.js installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/abrahams-wix/live-sports-app.git
   ```
2. Navigate to the project directory:
   ```bash
   cd live-sports-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server with live reloading:

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### Endpoints

- `GET /`: Health check.
- `GET /mlb/teams`: Fetches detailed data for the Cleveland Guardians.
- `GET /mlb/schedule`: Fetches the current schedule for the Cleveland Guardians.

## Project Structure

- `app.js`: Main Express application and API route definitions.
- `pages/`: HTML files for the frontend interfaces.
- `styles/`: CSS stylesheets.
- `images/`: Asset directory for logos and graphics.
