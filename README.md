# Bike Route Mapper

A community-driven web app for mapping, rating, and navigating bicycle routes and infrastructure in Heidelberg. Users can draw routes, log rides, rate cycling infrastructure, and discover Nextbike stations -- all on an interactive map.

Built as a university project for the course *Geodatenerfassung und -visualisierung* at Heidelberg University.

## Features

**Route Management**
- Draw custom bike routes on an interactive map
- Community ratings (1-5 stars) with averaging
- Slope classification (flat, slight, medium, steep, varied)
- Route status tracking (planned, completed, aborted)

**Infrastructure Mapping (POIs)**
- Bike stands (capacity, roofed/lighted status, user verification)
- Repair stations (tools, air pump availability)
- E-bike charging stations (plug type, pricing)
- Real-time Nextbike station data via public API

**Navigation**
- Point-to-point bicycle routing via OSRM
- Route options: fastest, best-rated, flattest
- Location search via Nominatim / OpenStreetMap

**Gamification**
- Distance tracking, CO2 savings, calorie estimates
- XP / leveling system, streak tracking
- Achievements (distance milestones, eco warrior, calorie burner)

**Admin Panel**
- Approve / reject user-submitted routes and bike stands
- Content moderation dashboard

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Material-UI 6 |
| Maps | Leaflet, leaflet-draw, leaflet-routing-machine |
| Routing | OSRM (bicycle profile) |
| Backend | Firebase (Auth, Cloud Firestore, Hosting) |
| External Data | Nextbike API, Nominatim API |

## Architecture

```
┌─────────────────────────────────────┐
│           React Frontend            │
│  (Leaflet Map + MUI Components)     │
└──────┬──────────┬──────────┬────────┘
       │          │          │
       ▼          ▼          ▼
   Firebase    OSRM API   Nextbike API
   (Firestore, (bicycle    (live station
    Auth,       routing)    data)
    Hosting)
```

**Firestore Collections:** `routes`, `bikeStands`, `repairStations`, `chargingStations`, `nextbikeStations`, `userStats`

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Authentication enabled

### Setup

```bash
cd frontend
npm install
```

Create `frontend/.env` with your Firebase config:

```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

### Run

```bash
cd frontend
npm start
```

The app runs at `http://localhost:3000`.

### Deploy

```bash
cd frontend && npm run build
firebase deploy
```

## License

MIT
