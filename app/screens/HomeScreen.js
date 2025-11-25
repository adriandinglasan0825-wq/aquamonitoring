// /mnt/data/HomeScreen.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView,
  Dimensions, ScrollView, Modal, Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import historyIcon from '../../assets/clock-with-circular-arrow.png';
import homeIcon from '../../assets/home.png';
import settingsIcon from '../../assets/setting.png';

export default function HomeScreen({ navigation }) {
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [feedTime, setFeedTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [feedQuantity, setFeedQuantity] = useState('');
  const fadeSavedAnim = useRef(new Animated.Value(0)).current;
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const [safeRanges, setSafeRanges] = useState({
    temperature: { min: 28, max: 31 },
    ph: { min: 7.0, max: 8.5 },
    do: { min: 5, max: 7 },
    ammonia: { min: 0, max: 0.02 }
  });

  const [waterData, setWaterData] = useState({
    temperature: 30.0,
    ph: 7.5,
    do: 6.2,
    ammonia: 0.01,
  });

  // --- Chart: state for selectable tabs & data
  const PARAMS = [ 
    { key: 'temperature', label: 'Temperature', field: 'avg_temperature', suffix: '°C' },
    { key: 'ph', label: 'pH', field: 'avg_ph', suffix: '' },
    { key: 'do', label: 'Oxygen', field: 'avg_oxygen', suffix: ' mg/L' },
    { key: 'ammonia', label: 'Ammonia', field: 'avg_ammonia', suffix: ' ppm' },
  ];

  const [selectedParam, setSelectedParam] = useState('temperature');
  const [chartData, setChartData] = useState({
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{ data: Array(24).fill(0) }],
  });
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartLoadingText, setChartLoadingText] = useState('Loading history...');

  const [autoFed, setAutoFed] = useState(false);

  const API_BASE = 'http://192.168.1.9:5000';

  // --- Live box data (unchanged)
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/live`);
        if (res.data) {
          setWaterData(prev => ({
            temperature: res.data.temperature ?? prev.temperature,
            ph: res.data.ph ?? prev.ph,
            do: res.data.oxygen ?? prev.do,
            ammonia: res.data.ammonia ?? prev.ammonia,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch live data', err.message);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 1000);
    return () => clearInterval(interval);
  }, []);

  // load safe ranges when screen focused
  useFocusEffect(
    useCallback(() => {
      const loadRanges = async () => {
        try {
          const saved = await AsyncStorage.getItem('sensorRanges');
          if (saved) {
            const parsed = JSON.parse(saved);
            const normalized = {};
            for (const key in parsed) {
              normalized[key] = {};
              for (const bound in parsed[key]) {
                normalized[key][bound] = parseFloat(parsed[key][bound]);
              }
            }
            setSafeRanges(normalized);
          }
        } catch (e) {
          console.error('Failed to load sensor ranges', e);
        }
      };
      loadRanges();
    }, [])
  );

  // --- Fetch full-history and build today's 24-hour arrays
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

  const buildDailyChart = (historyRows, paramKey, selectedDateStr = null) => {

  if (!historyRows || historyRows.length === 0) {
    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      data: Array(24).fill(null)
    };
  }

  // If no date selected, use latest date from DB
  const latestDate = historyRows
    .map(r => new Date(r.date))
    .sort((a, b) => b - a)[0]
    .toISOString()
    .split("T")[0];

  const targetDate = selectedDateStr || latestDate;

  console.log("📅 Chart using date:", targetDate);

  const values = Array(24).fill(null);

  historyRows.forEach((r) => {

    const rowDate = new Date(r.date)
      .toISOString()
      .split("T")[0];

    if (rowDate !== targetDate) return;

    const hour = Number(r.hour);
    if (hour < 0 || hour > 23) return;

    let value = null;

    if (paramKey === "temperature") value = r.avg_temperature;
    if (paramKey === "ph") value = r.avg_ph;
    if (paramKey === "do") value = r.avg_oxygen;
    if (paramKey === "ammonia") value = r.avg_ammonia;

    if (value !== null && !isNaN(value)) {
      values[hour] = Number(value.toFixed(2));
    }
  });

  const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  return { labels, data: values };
};



      const fetchHistory = async () => {
        setChartLoaded(false);
        setChartLoadingText('Loading history...');
        try {
          const res = await axios.get(`${API_BASE}/api/full-history`);
          const { history = [] } = res.data || {};
          if (cancelled) return;

          // build for current selected param
          const built = buildDailyChart(history, selectedParam, selectedDate);

          setChartData({ labels: built.labels, datasets: [{ data: built.data }] });
          setChartLoaded(true);
        } catch (err) {
          console.error('Failed to fetch full-history:', err);
          setChartLoadingText('Failed to load history');
          setChartLoaded(false);
        }
      };

      fetchHistory();

      return () => { cancelled = true; };
    }, [selectedParam])
  );

  // Manual refresh helper (if you want a button)
  const refreshHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/full-history`);
      const { history = [] } = res.data || {};

      // local today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const paramInfo = PARAMS.find(p => p.key === selectedParam);
      const values = Array.from({ length: 24 }, () => 0);
      const counts = Array.from({ length: 24 }, () => 0);

      history.forEach((r) => {
        let rowDate = '';
        if (r.date) {
          rowDate = (typeof r.date === 'string' && r.date.includes('T'))
            ? r.date.split('T')[0]
            : String(r.date).split(' ')[0];
        } else {
          rowDate = todayStr;
        }
        if (rowDate !== todayStr) return;
        const hour = Number(r.hour);
        if (Number.isNaN(hour) || hour < 0 || hour > 23) return;
        const val = r[paramInfo.field];
        if (val == null || Number.isNaN(Number(val))) return;
        values[hour] = values[hour] + Number(val);
        counts[hour] = counts[hour] + 1;
      });

      const averaged = values.map((sum, idx) => counts[idx] > 0 ? +(sum / counts[idx]) : 0);
      const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      setChartData({ labels, datasets: [{ data: averaged }] });
      setChartLoaded(true);
    } catch (err) {
      console.error(err);
      setChartLoaded(false);
    }
  };

  // --- Feed schedule / manual feed logic (unchanged, but kept here)
  const handleSave = async () => {
    try {
      if (!feedTime || !feedQuantity) {
        alert('Please set both time and quantity.');
        return;
      }

      function convertTo24HourTime(timeStr) {
        if (!timeStr) return null;
        const [time, modifier] = timeStr.split(" ");
        let [hours, minutes] = time.split(":");
        hours = parseInt(hours, 10);
        if (modifier === "PM" && hours !== 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;
        return `${String(hours).padStart(2, "0")}:${minutes}:00`;
      }

      const formattedTime = convertTo24HourTime(feedTime);

      await axios.post(`${API_BASE}/api/feed-schedule`, {
        time: formattedTime,
        amount: parseFloat(feedQuantity),
        repeat_daily: 1
      });

      setShowFeedModal(false);
      setShowSavedPopup(true);
      Animated.timing(fadeSavedAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      setTimeout(() => {
        Animated.timing(fadeSavedAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setShowSavedPopup(false));
      }, 2000);
    } catch (err) {
      console.error('Failed to save feed schedule:', err);
      alert('Error saving feed schedule.');
    }
  };

  // --- Auto-feed logic (unchanged)
  useEffect(() => {
    if (!safeRanges) return;
    if (typeof waterData.ammonia !== 'number') return;

    if (waterData.ammonia > safeRanges.ammonia.max && !autoFed) {
      axios.post(`${API_BASE}/api/feed/manual`, { amount: Number(feedQuantity) || 0 })
        .then(() => {
          console.log('Auto-feed command sent due to high ammonia:', waterData.ammonia);
        })
        .catch((err) => {
          console.error('Failed to trigger auto-feed:', err);
        });

      setAutoFed(true);
      const t = setTimeout(() => setAutoFed(false), 60000);
      return () => clearTimeout(t);
    }
  }, [waterData.ammonia, safeRanges, autoFed]);

  // helper for chart suffix
  const getSuffixForParam = (key) => {
    const p = PARAMS.find(x => x.key === key);
    return p ? p.suffix : '';
  };

  // helper for value color (unchanged)
  const getValueColor = (type, value) => {
    const range = safeRanges[type];
    if (!range) return '#000';
    switch (type) {
      case 'ammonia':
        return value <= range.max ? '#32CD32' : '#FF4C4C';
      default:
        return value >= range.min && value <= range.max ? '#32CD32' : '#FF4C4C';
    }
  };

  const alerts = [];
  if (waterData.temperature > safeRanges.temperature.max) alerts.push('🌡️ Water temperature is too high.');
  else if (waterData.temperature < safeRanges.temperature.min) alerts.push('🌡️ Water temperature is too low.');
  if (waterData.ph > safeRanges.ph.max) alerts.push('🧪 pH level is too high.');
  else if (waterData.ph < safeRanges.ph.min) alerts.push('🧪 pH level is too low.');
  if (waterData.do > safeRanges.do.max) alerts.push('💨 Dissolved oxygen is too high.');
  else if (waterData.do < safeRanges.do.min) alerts.push('💨 Dissolved oxygen is too low.');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.homeTitle}>Home</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => setShowNotificationModal(true)}>
          <Text style={{ fontSize: 24 }}>🔔</Text>
          {alerts.length > 0 && <View style={styles.notificationBadge} />}
        </TouchableOpacity>
      </View>

      {showSavedPopup && (
        <Animated.View style={[styles.popup, { opacity: fadeSavedAnim }]}>
          <Text style={styles.popupText}>💾 Saved!</Text>
        </Animated.View>
      )}

      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mainContent}>
            <View style={styles.row}>
              <TouchableOpacity 
  onPress={() => setSelectedParam('temperature')}
  style={[
    styles.dataBox,
    { borderColor: '#FFD700' },
    selectedParam === 'temperature' && styles.activeBox
  ]}
>


                <Text style={styles.label}>🌡 Water Temp </Text>
                <Text style={[styles.value, { color: getValueColor('temperature', waterData.temperature) }]}>
                  {Number(waterData.temperature).toFixed(1)}°C
                </Text>
                <Text style={styles.safeRange}>
                  Safe: {safeRanges.temperature.min}°C - {safeRanges.temperature.max}°C
                </Text>
              </TouchableOpacity>

<TouchableOpacity 
  onPress={() => setSelectedParam('ph')}
  style={[
    styles.dataBox,
    { borderColor: '#FF4C4C' },
    selectedParam === 'ph' && styles.activeBox
  ]}
>


                <Text style={styles.label}>🔴 pH Level</Text>
                <Text style={[styles.value, { color: getValueColor('ph', waterData.ph) }]}>
                  {Number(waterData.ph).toFixed(2)}
                </Text>
                <Text style={styles.safeRange}>
                  Safe: {safeRanges.ph.min} - {safeRanges.ph.max}
                </Text>
           </TouchableOpacity>

            </View>

            <View style={styles.row}>
              <TouchableOpacity 
  onPress={() => setSelectedParam('do')}
  style={[
    styles.dataBox,
    { borderColor: '#32CD32' },
    selectedParam === 'do' && styles.activeBox
  ]}
>
                <Text style={styles.label}>🟢 Dissolved O₂</Text>
                <Text style={[styles.value, { color: getValueColor('do', waterData.do) }]}>
                  {Number(waterData.do).toFixed(1)} mg/L
                </Text>
                <Text style={styles.safeRange}>
                  Safe: {safeRanges.do.min} - {safeRanges.do.max} mg/L
                </Text>
             </TouchableOpacity>
             <TouchableOpacity 
  onPress={() => setSelectedParam('ammonia')}
  style={[
    styles.dataBox,
    { borderColor: '#32CD32' },
    selectedParam === 'ammonia' && styles.activeBox
  ]}
>


                <Text style={styles.label}>🟢 Ammonia</Text>
                <Text style={[styles.value, { color: getValueColor('ammonia', waterData.ammonia) }]}>
                  {Number(waterData.ammonia).toFixed(3)} ppm
                </Text>
                <Text style={styles.safeRange}>
                  Safe: {safeRanges.ammonia.min} - {safeRanges.ammonia.max} ppm
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.feedButton} onPress={() => setShowFeedModal(true)}>
              <Text style={styles.feedButtonText}>Feed Fish</Text>
            </TouchableOpacity>

       

            <View style={styles.chartContainer}>
  {!chartLoaded ? (
    <Text style={{ marginVertical: 20 }}>{chartLoadingText}</Text>
  ) : (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 30 }}
    >
      <LineChart
        data={{
          labels: chartData.labels,
          datasets: chartData.datasets
        }}
        width={Dimensions.get('window').width * 2.5}
        height={200}
        yAxisSuffix={getSuffixForParam(selectedParam)}
        chartConfig={{
          backgroundGradientFrom: '#2a5298',
          backgroundGradientTo: '#1e3c72',
          color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
          labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
          decimalPlaces: selectedParam === 'ph' ? 2 : 1,
          propsForDots: { r: '3', strokeWidth: '1' }
        }}
        bezier
        style={styles.chart}
        withVerticalLines={true}
        withHorizontalLines={true}
        fromZero={false}
      />
    </ScrollView>
  )}

  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
    <Text style={{ fontSize: 12, color: '#666' }}>Today — 24 hours</Text>
    <TouchableOpacity onPress={refreshHistory}>
      <Text style={{ fontSize: 12, color: '#254a70ff' }}>Refresh</Text>
    </TouchableOpacity>
  </View>
</View>


          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate('History')}>
          <Image source={historyIcon} style={styles.footerIcon} />
          <Text style={styles.footerLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate('Home')}>
          <Image source={homeIcon} style={styles.footerIcon} />
          <Text style={styles.footerLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate('Settings')}>
          <Image source={settingsIcon} style={styles.footerIcon} />
          <Text style={styles.footerLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Feed Modal */}
      <Modal animationType="slide" transparent={true} visible={showFeedModal}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Feed Fish</Text>

            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={{ color: feedTime ? "#000" : "#888" }}>
                {feedTime ? feedTime : "Select Feed Time"}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={(event, selectedDate) => {
                  setShowTimePicker(false);
                  if (selectedDate) {
                    const hours = selectedDate.getHours();
                    const minutes = selectedDate.getMinutes();
                    const formattedTime = `${String(hours % 12 || 12).padStart(
                      2,
                      "0"
                    )}:${String(minutes).padStart(2, "0")} ${
                      hours >= 12 ? "PM" : "AM"
                    }`;
                    setFeedTime(formattedTime);
                  }
                }}
              />
            )}

            <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Select Quantity (grams)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              {[5, 10, 20, 30, 50].map((qty) => (
                <TouchableOpacity
                  key={qty}
                  style={[
                    styles.qtyButton,
                    feedQuantity == qty.toString() && { backgroundColor: '#32CD32' },
                  ]}
                  onPress={() => setFeedQuantity(qty.toString())}
                >
                  <Text
                    style={[
                      styles.qtyButtonText,
                      feedQuantity == qty.toString() && { color: '#fff' },
                    ]}
                  >
                    {qty}g
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#1e90ff", marginTop: 10 }]}
              onPress={async () => {
                try {
                  if (!feedQuantity) {
                    alert("Select a quantity first!");
                    return;
                  }

                  await axios.post(`${API_BASE}/api/feed/manual`, {
                    amount: parseFloat(feedQuantity),
                  });

                  alert(`🐟 Fish fed manually (${feedQuantity}g)!`);
                } catch (err) {
                  alert("Manual feed failed.");
                  console.error(err);
                }
              }}
            >
              <Text style={styles.saveButtonText}>Feed Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#ccc", marginTop: 10 }]}
              onPress={() => setShowFeedModal(false)}
            >
              <Text style={[styles.saveButtonText, { color: "#333" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showNotificationModal}
        onRequestClose={() => setShowNotificationModal(false)}>
        <View style={styles.modalBackground}>
          <View style={[styles.modalContainer, { width: '80%' }]}>
            <Text style={styles.modalTitle}>Notifications</Text>

            {alerts.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 20, fontSize: 16 }}>
                ✅ All readings are normal.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
                {alerts.map((alert, idx) => (
                  <Text key={idx} style={styles.alertText}>• {alert}</Text>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#254a70', marginTop: 20 }]}
              onPress={() => setShowNotificationModal(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 50,
  },
  homeTitle: { fontSize: 30, fontWeight: 'bold', color: '#000000ff' },
  notificationButton: { padding: 6, borderRadius: 20, backgroundColor: 'transparent', position: 'relative' },
  notificationBadge: {
    position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4C4C', borderWidth: 1, borderColor: '#fff',
  },
  alertText: { fontSize: 16, color: '#333', marginBottom: 8, paddingLeft: 10 },
  saveButton: {
    backgroundColor: '#32CD32', paddingVertical: 12, borderRadius: 10, width: '100%', marginTop: 10, alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  scrollContent: { paddingBottom: 20, alignItems: 'center' },
  mainContent: { marginTop: 20, alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8 },
  dataBox: {
    backgroundColor: '#fff', width: 140, height: 90, borderRadius: 25, marginHorizontal: 8, alignItems: 'center', justifyContent: 'space-around',
    borderWidth: 2.5, elevation: 3, paddingVertical: 10,
  },
  label: { fontSize: 11, color: '#333', textAlign: 'center' },
  value: { fontSize: 20, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  safeRange: { fontSize: 9, color: '#666', textAlign: 'center' },
  feedButton: {
    backgroundColor: '#254a70ff', paddingVertical: 12, width: Dimensions.get('window').width - 40, borderRadius: 10, marginVertical: 15,
  },
  feedButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  chartContainer: { alignItems: 'center', marginTop: 10, marginBottom: 10, width: '100%', paddingHorizontal: 20 },
  chart: { borderRadius: 10, paddingRight: 0 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f9f9f9', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#ddd', position: 'absolute', bottom: 0, width: Dimensions.get('window').width,
  },
  footerButton: { alignItems: 'center', flex: 1 },
  footerIcon: { width: 26, height: 26, marginBottom: 4, resizeMode: 'contain' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#ffffffff', borderRadius: 15, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: '100%', marginVertical: 5 },
  popup: { position: 'absolute', top: 70, backgroundColor: '#87919bff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 100 },
  popupText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  qtyButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: 4 },
  qtyButtonText: { color: '#333', fontWeight: 'bold' },

  // chart tabs
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 10, marginTop: 10 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f0f0f0' },
  tabButtonActive: { backgroundColor: '#254a70ff' },
  tabText: { color: '#333', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  activeBox: {
  shadowColor: '#00c3ff',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 10,
  elevation: 10,
  transform: [{ scale: 1.03 }],
}

});
