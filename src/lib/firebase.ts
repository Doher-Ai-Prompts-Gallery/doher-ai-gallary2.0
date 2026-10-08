import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork,
  Firestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAyYQmIgxc_J7fx2NhqVPy2Qglaymi_Ao8",
  authDomain: "imageprompt-b02db.firebaseapp.com",
  projectId: "imageprompt-b02db",
  storageBucket: "imageprompt-b02db.firebasestorage.app",
  messagingSenderId: "300331399547",
  appId: "1:300331399547:web:0edeaf64bb1d841f0a65de",
  measurementId: "G-RPC7WK050S"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
} as any);

export const auth = getAuth(app);
export const storage = getStorage(app);

export const reconnectFirestore = async () => {
  try {
    await enableNetwork(db);
    console.log("Firestore network enabled");
  } catch (error) {
    console.error("Failed to enable Firestore network:", error);
  }
};

export const disconnectFirestore = async () => {
  try {
    await disableNetwork(db);
    console.log("Firestore network disabled");
  } catch (error) {
    console.error("Failed to disable Firestore network:", error);
  }
};

// Exponential backoff retry logic
export const retryFirebaseOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts = 4,
  baseDelay = 1000
): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // If we're offline, try to enable network before retrying
      if (error?.message?.includes('offline') || error?.code === 'unavailable') {
        await reconnectFirestore().catch(() => {});
      }

      if (attempt === maxAttempts) break;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Firebase operation failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Monitor online/offline status
window.addEventListener('online', () => {
  console.log("Browser back online, reconnecting Firestore...");
  reconnectFirestore();
});

window.addEventListener('offline', () => {
  console.log("Browser offline, Firestore will operate in offline mode automatically.");
});

