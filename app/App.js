import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { registerRootComponent } from 'expo';

// Import Screens
import LoginScreen from './screens/Loginscreen';   // ✅ FIXED
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { useEffect } from "react";
import { NativeModules } from "react-native";
const Stack = createNativeStackNavigator();


function App() {

   useEffect(() => {
    if (Platform.OS === "android") {
      NativeModules.FullScreenModule?.enableFullScreen?.();
    }
  }, []);
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>

        {/* FIRST SCREEN */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* MAIN APP */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
         <Stack.Screen 
    name="Settings" 
    component={SettingsScreen} 
    options={{ headerShown: true }}   // ⭐ ADD THIS
  />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
registerRootComponent(App);
