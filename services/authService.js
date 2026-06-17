import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import apiRequest from './api';

const GOOGLE_WEB_CLIENT_ID =
  '379506085504-01lmsr30ftsm280pimj4odbi8o4qa2bj.apps.googleusercontent.com';

const formatAuthError = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;

  const parts = [];
  if (error.code) parts.push(error.code);
  if (error.message) parts.push(error.message);

  if (!parts.length && error.toString) {
    const text = error.toString();
    if (text && text !== '[object Object]') {
      parts.push(text);
    }
  }

  if (!parts.length) {
    try {
      return JSON.stringify(error);
    } catch (_jsonError) {
      return 'Unknown error';
    }
  }

  return parts.join(': ');
};

const debugAuthError = (scope, error) => {
  const details = {
    name: error?.name,
    code: error?.code,
    message: error?.message,
    stack: error?.stack,
  };

  console.error(`[authService] ${scope}`, details);
  return details;
};

// Google Sign-In requires the native module to be present in the Android build.
let GoogleSignin = null;
let googleSigninInitError = null;

try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
  console.log('[authService] Google Sign-In native module loaded');
} catch (error) {
  googleSigninInitError = error;
  debugAuthError('Google Sign-In native module failed to load', error);
}

// Register with Email & Password
export const registerWithEmail = async (fullName, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: fullName });

    await sendEmailVerification(user);

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: fullName,
      email: user.email,
      createdAt: serverTimestamp(),
      emailVerified: false,
      gender: null,
      age: null,
      height: null,
      weight: null,
      goalType: null,
      activityLevel: null,
      dailyCalorieTarget: null,
      onboardingDone: false,
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, message: getErrorMessage(error.code) };
  }
};

// Login with Email & Password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: getErrorMessage(error.code) };
  }
};

// Google Sign-In
export const loginWithGoogle = async () => {
  if (!GoogleSignin) {
    const initDetails = debugAuthError(
      'Google Sign-In unavailable during login',
      googleSigninInitError
    );

    return {
      success: false,
      message: `Google Sign-In native module failed to load: ${formatAuthError(
        googleSigninInitError
      )}`,
      debug: initDetails,
    };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult.data?.idToken || signInResult.idToken;

    if (!idToken) {
      throw new Error('Google Sign-In completed but no ID token was returned.');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName || '',
        email: user.email,
        createdAt: serverTimestamp(),
        gender: null,
        age: null,
        height: null,
        weight: null,
        goalType: null,
        activityLevel: null,
        dailyCalorieTarget: null,
        onboardingDone: false,
      });
    }

    return { success: true, user, isNewUser: !userDoc.exists() };
  } catch (error) {
    const debugDetails = debugAuthError('Google Sign-In failed', error);

    return {
      success: false,
      message: formatAuthError(error),
      debug: debugDetails,
    };
  }
};

// Sync user with backend
export const syncUserWithBackend = async (firebaseUser) => {
  try {
    const token = await firebaseUser.getIdToken();
    const result = await apiRequest(
      '/users/sync',
      'POST',
      {
        name: firebaseUser.displayName || '',
        email: firebaseUser.email,
      },
      token
    );
    return result;
  } catch (error) {
    console.log('Backend sync error:', error.message);
    return { success: false };
  }
};

// Logout
export const logout = async () => {
  try {
    if (GoogleSignin) {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) await GoogleSignin.signOut();
    }
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Get user profile from Firestore
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, profile: userDoc.data() };
    }
    return { success: false, message: 'User not found' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Check if onboarding is complete
export const checkOnboardingStatus = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data()?.onboardingDone === true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Firebase error messages
const getErrorMessage = (code) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
};
