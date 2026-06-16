import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import apiRequest from './api';

// ─── Google Sign-In (only works in dev build, not Expo Go) ───
let GoogleSignin = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: '379506085504-01lmsr30ftsm280pimj4odbi8o4qa2bj.apps.googleusercontent.com',
  });
} catch (e) {
  console.log('Google Sign-In not available in Expo Go');
}

// ─── Register with Email & Password ──────────────────────────
export const registerWithEmail = async (fullName, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: fullName });

    // Send verification email
    await sendEmailVerification(user);

    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid:                user.uid,
      name:               fullName,
      email:              user.email,
      createdAt:          serverTimestamp(),
      emailVerified:      false,
      gender:             null,
      age:                null,
      height:             null,
      weight:             null,
      goalType:           null,
      activityLevel:      null,
      dailyCalorieTarget: null,
      onboardingDone:     false,
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, message: getErrorMessage(error.code) };
  }
};

// ─── Login with Email & Password ─────────────────────────────
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: getErrorMessage(error.code) };
  }
};

// ─── Google Sign-In ───────────────────────────────────────────
export const loginWithGoogle = async () => {
  if (!GoogleSignin) {
    return {
      success: false,
      message: 'Google Sign-In requires a dev build. Email login works in Expo Go.',
    };
  }
  try {
    await GoogleSignin.hasPlayServices();
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult.data?.idToken || signInResult.idToken;
    if (!idToken) throw new Error('No ID token returned from Google');

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid:                user.uid,
        name:               user.displayName || '',
        email:              user.email,
        createdAt:          serverTimestamp(),
        gender:             null,
        age:                null,
        height:             null,
        weight:             null,
        goalType:           null,
        activityLevel:      null,
        dailyCalorieTarget: null,
        onboardingDone:     false,
      });
    }

    return { success: true, user, isNewUser: !userDoc.exists() };
  } catch (error) {
    console.log('Google Sign-In error:', error);
    return { success: false, message: 'Google Sign-In failed. Please try again.' };
  }
};

// ─── Sync user with backend ───────────────────────────────────
export const syncUserWithBackend = async (firebaseUser) => {
  try {
    const token = await firebaseUser.getIdToken();
    const result = await apiRequest('/users/sync', 'POST', {
      name:  firebaseUser.displayName || '',
      email: firebaseUser.email,
    }, token);
    return result;
  } catch (error) {
    console.log('Backend sync error:', error.message);
    return { success: false };
  }
};

// ─── Logout ───────────────────────────────────────────────────
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

// ─── Get user profile from Firestore ─────────────────────────
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

// ─── Check if onboarding is complete ─────────────────────────
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

// ─── Firebase error messages ──────────────────────────────────
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