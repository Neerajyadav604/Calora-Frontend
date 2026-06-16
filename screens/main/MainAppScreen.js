

import HomeScreen      from './HomeScreen';
import RecipesScreen   from './RecipesScreen';
import NutritionScreen from './NutritionScreen';
import AnalyticsScreen from './AnalyticsScreen';
import ProfileScreen   from './ProfileScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
const Tab = createBottomTabNavigator();


// ── Custom Tab Bar ────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: 'Home',      icon: 'home',            iconLib: 'Ionicons'  },
    { name: 'Recipes',  icon: 'nutrition-outline',  iconLib: 'Ionicons'  },
    { name: 'Nutrition', icon: 'restaurant-outline',iconLib: 'Ionicons'  },
    { name: 'Analytics', icon: 'bar-chart-outline', iconLib: 'Ionicons'  },
    { name: 'Profile',   icon: 'person-outline',    iconLib: 'Ionicons'  },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = tabs[index];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.name}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            {/* Active pill background */}
            {isFocused && route.name === 'Nutrition' ? (
              <View style={styles.activePill}>
                <Ionicons name="restaurant" size={22} color="#1A1D10" />
                <Text style={styles.activePillText}>Nutrition</Text>
              </View>
            ) : (
              <>
                <Ionicons
                  name={
                    isFocused
                      ? tab.icon.replace('-outline', '')
                      : tab.icon
                  }
                  size={24}
                  color={isFocused ? '#1A1D10' : '#9AA08A'}
                />
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {route.name}
                </Text>
                {isFocused && <View style={styles.activeDot} />}
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main Navigator ────────────────────────────────────────────
export default function MainApp() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"      component={HomeScreen}      />
      <Tab.Screen name="Recipes"  component={RecipesScreen}  />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen}   />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9AA08A',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#1A1D10',
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCFF00',
    marginTop: 2,
  },
  // Special pill for center "Nutrition" tab when active
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFF00',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  activePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1D10',
    letterSpacing: 0.2,
  },
});