import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  init,
  getMealsByDate,
  getTotals,
  addMeal,
  updateMultiplier,
} from './src/db';

/* -- helpers ------------------------------------------------------------- */
const iso = (d: Date) => d.toISOString().split('T')[0];

/* ------------------------------------------------------------------------ */
export default function App() {
  /* -------- state -------- */
  const [date, setDate] = useState<Date>(new Date());
  const [meals, setMeals] = useState<
    { id: number; name: string; protein: number; fat: number; carbs: number; multiplier: number }[]
  >([]);
  const [tot, setTot] = useState({ protein: 0, fat: 0, carbs: 0, kcal: 0 });
  const [showCal, setShowCal] = useState(false);

  /* -------- data refresh -------- */
  const refresh = useCallback(async (currentIso = iso(date)) => {
    const list = await getMealsByDate(currentIso);
    setMeals(list);
    setTot(await getTotals(currentIso));
  }, [date]);

  /* -------- init -------- */
  useEffect(() => {
    init()
      .then(() => refresh())
      .catch(console.warn);
  }, []);

  /* -------- handle add test meal -------- */
  const handleAdd = async () => {
    await addMeal('100 g Rice', 3, 0.1, 27, iso(date));
    refresh();
  };

  /* -------- handle multiplier edit -------- */
  const promptMultiplier = (itemId: number, current: number) => {
    let tmp = current.toString();
    Alert.prompt(
      'Multiplier',
      'Set value 0.0 – 10.0',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: async (value) => {
            const m = parseFloat(value ?? '0');
            if (isNaN(m) || m < 0 || m > 10) return;
            await updateMultiplier(itemId, m);
            refresh();
          },
        },
      ],
      'plain-text',
      tmp,
      'decimal-pad'
    );
  };

  /* -------- row render -------- */
  const Row = ({ item }: { item: typeof meals[0] }) => {
    const P = item.protein * item.multiplier;
    const F = item.fat * item.multiplier;
    const C = item.carbs * item.multiplier;
    const kcal = P * 4 + F * 9 + C * 4;
    return (
      <Pressable style={styles.row} onPress={() => promptMultiplier(item.id, item.multiplier)}>
        <Text style={styles.name}>
          <Text style={styles.mult}>{item.multiplier.toFixed(1)}x </Text>
          {item.name}
        </Text>
        <Text style={styles.macro}>{kcal.toFixed(0)} kcal</Text>
        <Text style={styles.macro}>{P.toFixed(1)} P</Text>
        <Text style={styles.macro}>{F.toFixed(1)} F</Text>
        <Text style={styles.macro}>{C.toFixed(1)} C</Text>
      </Pressable>
    );
  };

  /* -------- calendar change -------- */
  const onChangeDate = (_: any, picked?: Date) => {
    setShowCal(false);
    if (picked) {
      setDate(picked);
      refresh(iso(picked));
    }
  };

  /* -------------------------------- render ------------------------------- */
  return (
    <View style={styles.container}>
      {/* top bar with calendar button */}
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCal(true)}>
        <Ionicons name="calendar-outline" size={20} color="#1e90ff" />
        <Text style={styles.dateTxt}> {iso(date)}</Text>
      </TouchableOpacity>

      {/* list */}
      <FlatList
        data={meals}
        keyExtractor={(i) => i.id.toString()}
        renderItem={Row}
        ListEmptyComponent={<Text style={styles.empty}>Brak pozycji</Text>}
      />

      {/* + button */}
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
        <Text style={styles.addTxt}>＋</Text>
      </TouchableOpacity>

      {/* totals */}
      <View style={styles.totals}>
        <Text style={styles.totalTxt}>Σ {tot.kcal.toFixed(0)} kcal</Text>
        <Text style={styles.totalTxt}>P {tot.protein.toFixed(1)}</Text>
        <Text style={styles.totalTxt}>F {tot.fat.toFixed(1)}</Text>
        <Text style={styles.totalTxt}>C {tot.carbs.toFixed(1)}</Text>
      </View>

      {/* calendar modal */}
      {showCal && (
        <DateTimePicker
          value={date}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
        />
      )}

      <StatusBar style="auto" />
    </View>
  );
}

/* ---------------------------- STYLES ----------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },

  /* row */
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    paddingVertical: 8,
  },
  name: { flex: 1 },
  mult: { fontSize: 12, color: '#555' },
  macro: { width: 70, textAlign: 'right' },

  /* + button */
  addBtn: {
    position: 'absolute',
    right: 24,
    bottom: 96,
    backgroundColor: '#1e90ff',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  addTxt: { color: '#fff', fontSize: 34, lineHeight: 34 },

  /* totals bar */
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  totalTxt: { fontWeight: '600' },

  /* date button */
  dateBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateTxt: { fontSize: 16, color: '#1e90ff' },

  empty: { textAlign: 'center', marginTop: 24, color: '#888' },
});
