
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './navigation/Navigation';

if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args[0] && args[0].includes && args[0].includes('Boolean')) {
      console.log('BOOLEAN ERROR STACK:', new Error().stack);
    }
    originalConsoleError(...args);
  };
}


export default function App() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#F9FBE5' }}>
        <StatusBar style="dark" />
        <Navigation />
      </View>
    </SafeAreaProvider>
  );
}