// /PediaQuiz/frontend/vite-env.d.ts

/// <reference types="vite/client" />
/// <reference types="node" />    <-- ADDED THIS LINE
// No need for <reference types="firebase" /> as firebase itself provides types

// Extend ImportMetaEnv for Vite's environment variables
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  // add more env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// All your application types are now expected to be imported from @pediaquiz/types
// No need to define them here or import from local src/types.ts

// This file is purely for global declarations for Vite and ambient types.
// Individual components will import types from '@pediaquiz/types'