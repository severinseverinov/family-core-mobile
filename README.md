# FamilyCore Mobile

React Native mobile application for FamilyCore - A SaaS Family Operating System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start the development server:
```bash
npm start
```

## Features

- Authentication (Email/Password)
- Family Management
- Calendar & Events
- Tasks
- Pets Management
- Kitchen Inventory & Shopping List
- Settings

## Tech Stack

- React Native (Expo)
- TypeScript
- Supabase
- React Navigation
- React i18next
- Zustand (State Management)
- TanStack Query (Data Fetching)

## Project Structure

```
src/
  screens/       # Screen components
  components/    # Reusable components
  services/     # API services
  navigation/   # Navigation setup
  hooks/        # Custom hooks
  utils/        # Utility functions
  i18n/         # Internationalization
  stores/        # State management
```

