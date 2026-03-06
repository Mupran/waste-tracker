# Waste Tracker

A real-time waste collection tracking application — similar to food delivery tracking, but for garbage trucks.

## Apps

| App | Description |
|-----|-------------|
| `apps/driver` | Garbage truck driver app — continuously broadcasts GPS location |
| `apps/resident` | Resident app — shows live truck location, ETA, and proximity alerts |

## Tech Stack

- **Framework:** React Native + Expo (iOS & Android)
- **Backend:** Firebase (Firestore real-time DB + Cloud Functions)
- **Auth:** Firebase Authentication
- **Maps:** Google Maps (`react-native-maps`)
- **Notifications:** Expo Notifications + Firebase Cloud Messaging

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Firebase project set up
- Google Maps API key

### Setup

1. Clone the repo
```bash
git clone https://github.com/Mupran/waste-tracker.git
cd waste-tracker
```

2. Install dependencies for each app
```bash
cd apps/driver && npm install
cd ../resident && npm install
```

3. Configure environment variables — copy `.env.example` to `.env` in each app folder and fill in your keys.

4. Run the app
```bash
npx expo start
```

## Project Structure

```
waste-tracker/
├── apps/
│   ├── driver/       # Driver app
│   └── resident/     # Resident app
├── shared/           # Shared types and utilities
└── firebase/         # Firestore rules and Cloud Functions
```
