import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import historyIcon from "../../assets/clock-with-circular-arrow.png";
import homeIcon from "../../assets/home.png";
import settingsIcon from "../../assets/setting.png";

export default function HistoryScreen({ navigation }) {
  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [mergedData, setMergedData] = useState([]);
  const [safeRanges, setSafeRanges] = useState(null);
  const [groupedData, setGroupedData] = useState([]);
  const [activeDate, setActiveDate] = useState(null);

  const API_BASE = "http://192.168.1.9:5000";

  // load safe ranges
  useEffect(() => {
    const loadRanges = async () => {
      try {
        const saved = await AsyncStorage.getItem("sensorRanges");
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
        } else {
          setSafeRanges({
            temperature: { min: 28, max: 31 },
            ph: { min: 7.0, max: 8.5 },
            do: { min: 5, max: 7 },
            ammonia: { min: 0, max: 0.02 },
          });
        }
      } catch (err) {
        console.error("Failed to load safe ranges:", err);
      }
    };
    loadRanges();
  }, []);

 
  useEffect(() => {
    if (safeRanges) fetchMerged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRanges]);

  // fetch combined data
  useEffect(() => {
    if (!mergedData) return;

    const groups = {};

    mergedData.forEach((row) => {
      if (row.isSensor) {
        if (!groups[row.date]) groups[row.date] = { sensor: [], feeder: [] };
        groups[row.date].sensor.push(row);
      } else {
        if (!groups[row.date]) groups[row.date] = { sensor: [], feeder: [] };
        groups[row.date].feeder.push(row);
      }
    });


    const finalArr = Object.keys(groups)
      .sort((a,b) => new Date(b) - new Date(a))
      .map(date => ({
        date,
        sensor: groups[date].sensor,
        feeder: groups[date].feeder
      }));

    setGroupedData(finalArr);
  }, [mergedData]);

  const fetchMerged = async () => {
    if (!safeRanges) return;
    try {
      const res = await axios.get(`${API_BASE}/api/full-history`);
      
      const { history = [], activities = [] } = res.data;

      // map history rows robustly (r.date may already be YYYY-MM-DD)
      const sensorRows = history.map((r) => {
  let localDate = "";

  if (r.date) {
    const d = new Date(r.date);

    // Convert properly to Philippines timezone
    localDate = d.toLocaleDateString("en-CA", { 
      timeZone: "Asia/Manila" 
    });
  } else {
    localDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila"
    });
  }

  return {
    date: localDate,
    type: "Sensor Reading",
    avg_temperature: r.avg_temperature,
    avg_ph: r.avg_ph,
    avg_oxygen: r.avg_oxygen,
    avg_ammonia: r.avg_ammonia,
    hour: r.hour,
    isSensor: true,
  };
});


      const activityRows = activities.map((a) => {
        // created_at can be "YYYY-MM-DD HH:MM:SS" or ISO; normalize to YYYY-MM-DD
        let localDate = '';
        if (!a.created_at) {
          localDate = new Date().toISOString().split('T')[0];
        } else if (a.created_at.includes('T')) {
          localDate = a.created_at.split('T')[0];
        } else {
          // 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD'
          localDate = a.created_at.split(' ')[0];
        }

        return {
          date: localDate,
          type:
            a.type === "schedule"
              ? "Scheduled Feed"
              : a.type === "manual_feed"
              ? "Manual Feed"
              : "Other",
          message: a.message,
          rawType: a.type,
          statusText: "Active",
          created_at: a.created_at,
          isSensor: false,
        };
      });

      const merged = [...sensorRows, ...activityRows].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setMergedData(merged);
    } catch (err) {
      console.error("❌ Error fetching history:", err);
    }
  };

  
  const getStatusInfo = (row) => {
    if (!row.isSensor) {
      return { text: row.statusText, color: "#34C759" };
    }

    const { temperature, ph, do: doRange, ammonia } = safeRanges || {};
    let critical = false;
    let warning = false;

    const checkParam = (val, range) => {
      if (val == null) return null;
      if (val < range.min - 0.5 || val > range.max + 0.5) return "critical";
      if (val < range.min || val > range.max) return "warning";
      return "normal";
    };

    const states = [
      checkParam(row.avg_temperature, temperature),
      checkParam(row.avg_ph, ph),
      checkParam(row.avg_oxygen, doRange),
      checkParam(row.avg_ammonia, ammonia),
    ];

    if (states.includes("critical")) critical = true;
    else if (states.includes("warning")) warning = true;

    if (critical)
      return { text: "Critical", color: "#FF3B30" };
    if (warning)
      return { text: "Warning", color: "#FFCC00" };
    return { text: "Normal", color: "#34C759" };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>History</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.downloadButton} onPress={() => alert("Download coming soon!")}>
          <Text style={styles.downloadText}>⬇️ Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortButton} onPress={() => alert("Sort feature coming soon!")}>
          <Text style={styles.sortText}>⇅ Sort</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => alert("Filter feature coming soon!")}>
          <Text style={styles.filterText}>🔍 Filter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 1 }]}>Date</Text>
          <Text style={[styles.headerText, { flex: 1.2 }]}>Activity</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Status</Text>
        </View>

       {groupedData.map((group, i) => {


  let worstColor = "#34C759"; 
  let worstText = "Normal";

  if (group.sensor.length > 0) {
    const statuses = group.sensor.map(r => getStatusInfo(r));
    if (statuses.some(s => s.text === "Critical")) { worstColor="#FF3B30"; worstText="Critical"; }
    else if (statuses.some(s => s.text === "Warning")) { worstColor="#FFCC00"; worstText="Warning"; }
  }

  return (
    <View key={i}>


      {group.sensor.length > 0 && (
        <View style={styles.rowContainer}>
          <View style={styles.tableRow}>
            <Text style={[styles.cellText,{flex:1}]}>{group.date}</Text>
            <Text style={[styles.cellText,{flex:1.2}]}>Sensor Reading</Text>

            <View style={[styles.statusWrapper,{flex:0.6}]}>
              <View style={[styles.statusDot,{backgroundColor:worstColor}]} />
              <Text style={styles.statusText}>{worstText}</Text>
            </View>

            <TouchableOpacity onPress={()=> setActiveDate(activeDate===group.date?null:group.date)}>
              <Text style={styles.moreIcon}>
                {activeDate === group.date ? "△" : "▽"}
              </Text>
            </TouchableOpacity>
          </View>

          
          {activeDate === group.date && (
            <View style={styles.dropdownArea}>
              <Text style={styles.dropdownHeader}>24-Hour Water Quality Data</Text>

              <View style={styles.dataHeader}>
                <Text style={[styles.dataCol,{flex:1}]}>Time</Text>
                <Text style={[styles.dataCol,{flex:1}]}>Temp (°C)</Text>
                <Text style={[styles.dataCol,{flex:1}]}>pH</Text>
                <Text style={[styles.dataCol,{flex:1}]}>O₂ (mg/L)</Text>
                <Text style={[styles.dataCol,{flex:1}]}>Ammonia</Text>
              </View>

              {group.sensor.map((r,j)=>(
                <View
                 key={j}style={[styles.hourRow,j % 2 === 0 ? styles.evenRow : styles.oddRow]}
>
                  <Text style={[styles.dataCell,{flex:1}]}>
                    {r.hour}:00 - {r.hour+1}:00
                  </Text>
                  <Text style={[styles.dataCell,{flex:1}]}>{r.avg_temperature?.toFixed(2) ?? "—"}</Text>
                  <Text style={[styles.dataCell,{flex:1}]}>{r.avg_ph?.toFixed(2) ?? "—"}</Text>
                  <Text style={[styles.dataCell,{flex:1}]}>{r.avg_oxygen?.toFixed(2) ?? "—"}</Text>
                  <Text style={[styles.dataCell,{flex:1}]}>{r.avg_ammonia?.toFixed(2) ?? "—"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      
      {group.feeder.length > 0 && (
  <View style={styles.rowContainer}>
    <View style={styles.tableRow}>
      <Text style={[styles.cellText,{flex:1}]}>{group.date}</Text>
      <Text style={[styles.cellText,{flex:1.2}]}>
 { group.feeder.find(f => f.type !== "Other")?.type || "Other" }

</Text>


      <View style={[styles.statusWrapper,{flex:1}]}>
        <View style={[styles.statusDot,{backgroundColor:"#34C759"}]} />
        <Text style={styles.statusText}>Active</Text>
      </View>
    </View>
  </View>
)}


    </View>
  );
})}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate("History")}>
          <Image source={historyIcon} style={styles.footerIcon} />
          <Text style={styles.footerLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate("Home")}>
          <Image source={homeIcon} style={styles.footerIcon} />
          <Text style={styles.footerLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate("Settings")}>
          <Image source={settingsIcon} style={styles.footerIcon} />
          <Text style={styles.footerLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 40, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  title: { fontSize: 26, fontWeight: "bold", color: "#000" },
  actionRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, justifyContent: "space-between" },
  downloadButton: { backgroundColor: "#2ECC71", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  downloadText: { color: "#fff", fontWeight: "bold" },
  sortButton: { backgroundColor: "#f2f2f2", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  sortText: { color: "#333", fontWeight: "500" },
  filterButton: { backgroundColor: "#f2f2f2", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  filterText: { color: "#333", fontWeight: "500" },
  tableHeader: { flexDirection: "row", backgroundColor: "#E0E0E0", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, marginBottom: 8 },
  headerText: { fontWeight: "bold", color: "#333", fontSize: 13 },
  rowContainer: { backgroundColor: "#F7F7F7", borderRadius: 10, marginVertical: 4, overflow: "hidden" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 10 },
  cellText: { color: "#333", fontSize: 13 },
  statusWrapper: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  statusText: { fontSize: 13, color: "#333" },
  scrollArea: { flex: 1 },
  footer: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", backgroundColor: "#f9f9f9", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#ddd", position: "absolute", bottom: 0, width: Dimensions.get("window").width },
  footerButton: { alignItems: "center", flex: 1 },
  footerIcon: { width: 26, height: 26, marginBottom: 4, resizeMode: "contain" },
  dropdownArea: {backgroundColor: "#fff",borderRadius: 8,marginTop: 4, marginHorizontal: 6, paddingBottom: 8, overflow: "hidden",borderWidth: 1, borderColor: "#E0E0E0",},
  dropdownHeader: {backgroundColor: "#E9E9E9",color: "#333",fontSize: 14,fontWeight: "bold",textAlign: "center",paddingVertical: 8,borderBottomWidth: 1,borderBottomColor: "#D0D0D0",},
  dataHeader: {flexDirection: "row",backgroundColor: "#DADADA",borderBottomWidth: 1,borderBottomColor: "#C0C0C0",paddingVertical: 6,},
  dataCol: {flex: 1,textAlign: "center",fontWeight: "bold",fontSize: 12,color: "#333",},
  hourRow: {flexDirection: "row",alignItems: "center",paddingVertical: 6,borderBottomWidth: 0.5,borderBottomColor: "#EEE",},
  dataCell: {flex: 1,textAlign: "center",color: "#333",fontSize: 12,},
  evenRow: {backgroundColor: "#FAFAFA",},oddRow: {backgroundColor: "#FFFFFF",},
});
