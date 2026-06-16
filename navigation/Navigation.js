import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
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
      <Stack.Screen name="Gender" component={GenderScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Age" component={AgeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Height" component={HeightScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Weight" component={WeightScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Goal" component={GoalScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Calc" component={CalcScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Motivation" component={MotivationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainApp" component={MainAppScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const [user, setUser] = useState(auth.currentUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer key={user ? 'authenticated' : 'unauthenticated'}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
