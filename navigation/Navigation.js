import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import GenderScreen from '../screens/onboarding/GenderScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import AgeScreen from '../screens/onboarding/AgeScreen';
import MainAppScreen from '../screens/main/MainAppScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import HeightScreen from '../screens/onboarding/HeightScreen';
import WeightScreen from '../screens/onboarding/WeightScreen';
import GoalScreen from '../screens/onboarding/GoalScreen';
import ActivityScreen from '../screens/onboarding/ActivityScreen';
import CalcScreen from '../screens/onboarding/CalcScreen';
import MotivationScreen from '../screens/onboarding/MotivationScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import AddRecipeScreen from '../screens/main/nutrition/AddRecipeScreen';
import RecipeDetailScreen from '../screens/main/nutrition/RecipeDetailScreen';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </Stack.Navigator>
  );
}

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="Age" component={AgeScreen} />
      <Stack.Screen name="Height" component={HeightScreen} />
      <Stack.Screen name="Weight" component={WeightScreen} />
      <Stack.Screen name="Goal" component={GoalScreen} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="Calc" component={CalcScreen} />
      <Stack.Screen name="Motivation" component={MotivationScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainApp" component={MainAppScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [onboardingDone, setOnboardingDone] = useState(null); // null = not yet fetched

  useEffect(() => {
    let unsubFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Start listening to this user's Firestore doc for onboardingDone
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubFirestore = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setOnboardingDone(snap.data()?.onboardingDone === true);
          } else {
            // Doc doesn't exist yet (edge case), treat as not done
            setOnboardingDone(false);
          }
        });
      } else {
        // Logged out — clean up Firestore listener and reset state
        setUser(null);
        setOnboardingDone(null);
        if (unsubFirestore) {
          unsubFirestore();
          unsubFirestore = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  console.log('NAV STATE:', { 
  user: user?.email, 
  onboardingDone 
});

  // Case 1: Auth state not resolved yet → show splash
  if (user === undefined) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Case 2: Logged in but Firestore hasn't responded yet → show splash
  if (user && onboardingDone === null) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : !onboardingDone ? (
        <OnboardingStack />
      ) : (
        <AppStack />
      )}
    </NavigationContainer>
  );
}