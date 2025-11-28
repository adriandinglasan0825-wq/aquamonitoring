import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Dimensions, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const defaultRanges = {
  temperature: { min: '28', max: '31' },
  ph: { min: '7.0', max: '8.5' },
  do: { min: '5', max: '7' },
  ammonia: { min: '0', max: '0.02' },
};

export default function SettingsScreen({ navigation }) {
  const [ranges, setRanges] = useState(defaultRanges);
  const API_BASE = 'http://192.168.4.10:5000';

  useEffect(() => {
    const loadRanges = async () => {
      try {
        const saved = await AsyncStorage.getItem('sensorRanges');
        if (saved) setRanges(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load ranges:', e);
      }
    };
    loadRanges();
  }, []);

  const saveRanges = async () => {
    try {
      const payload = {
        temperature: { min: Number(ranges.temperature.min), max: Number(ranges.temperature.max) },
        ph: { min: Number(ranges.ph.min), max: Number(ranges.ph.max) },
        do: { min: Number(ranges.do.min), max: Number(ranges.do.max) },
        ammonia: { min: Number(ranges.ammonia.min), max: Number(ranges.ammonia.max) }
      };

      await AsyncStorage.setItem('sensorRanges', JSON.stringify(ranges));

      const res = await fetch(`${API_BASE}/api/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Server returned error');

      Alert.alert('✅ Success', 'Sensor ranges saved to server');
    } catch (e) {
      console.error('Failed to save ranges:', e);
      Alert.alert('❌ Error', 'Could not save ranges');
    }
  };

  const updateRange = (type, field, value) => {
    setRanges(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Temperature */}
        <View style={[styles.card, { borderColor: '#FFD700' }]}>
          <Text style={styles.label}>Temperature Range (°C)</Text>
          <View style={styles.rangeRow}>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.temperature.min} onChangeText={val => updateRange('temperature','min',val)} placeholder="Min" />
            <Text style={styles.to}>to</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.temperature.max} onChangeText={val => updateRange('temperature','max',val)} placeholder="Max" />
          </View>
        </View>

        {/* pH */}
        <View style={[styles.card, { borderColor: '#FF4C4C' }]}>
          <Text style={styles.label}>pH Range</Text>
          <View style={styles.rangeRow}>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.ph.min} onChangeText={val => updateRange('ph','min',val)} placeholder="Min" />
            <Text style={styles.to}>to</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.ph.max} onChangeText={val => updateRange('ph','max',val)} placeholder="Max" />
          </View>
        </View>

        {/* Dissolved Oxygen */}
        <View style={[styles.card, { borderColor: '#32CD32' }]}>
          <Text style={styles.label}>Dissolved O₂ (mg/L)</Text>
          <View style={styles.rangeRow}>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.do.min} onChangeText={val => updateRange('do','min',val)} placeholder="Min" />
            <Text style={styles.to}>to</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.do.max} onChangeText={val => updateRange('do','max',val)} placeholder="Max" />
          </View>
        </View>

        {/* Ammonia */}
        <View style={[styles.card, { borderColor: '#32CD32' }]}>
          <Text style={styles.label}>Ammonia (ppm)</Text>
          <View style={styles.rangeRow}>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.ammonia.min} onChangeText={val => updateRange('ammonia','min',val)} placeholder="Min" />
            <Text style={styles.to}>to</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={ranges.ammonia.max} onChangeText={val => updateRange('ammonia','max',val)} placeholder="Max" />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveRanges}>
          <Text style={styles.saveButtonText}>Save Ranges</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', },
  scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  card: { backgroundColor: '#fff', width: Dimensions.get('window').width - 40, borderRadius: 20, borderWidth: 2.5, padding: 15, marginBottom: 15, elevation: 3 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  rangeRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, marginHorizontal: 5, textAlign: 'center' },
  to: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  saveButton: { marginTop: 20, backgroundColor: '#254a70ff', paddingVertical: 15, borderRadius: 10, width: '100%' },
  saveButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' }
});
