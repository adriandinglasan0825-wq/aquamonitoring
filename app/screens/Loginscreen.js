import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>

      {/* Center Card */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Home")}
        style={styles.card}
        activeOpacity={0.8}
      >
        <Image
          source={require("../../assets/Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Aquamonitor System</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    justifyContent: "center",
    alignItems: "center",
  },


  card: {
    width: 140,
    height: 140,
    backgroundColor: "#fff",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12, // Android shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },

  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },

  title: {
    
    marginTop: 20,
    fontSize: 22,
    fontWeight: "600",
    color: "#444",
    textAlign: "center",
  },
});
