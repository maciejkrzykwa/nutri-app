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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as db from './src/db';

/* utils */
const iso = (d: Date) => d.toISOString().split('T')[0];

/* ------------------------------------------------------------------- */
export default function App() {
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState<
    { id: number; name: string; protein: number; fat: number; carbs: number; multiplier: number }[]
  >([]);
  const [tot, setTot]   = useState({ protein: 0, fat: 0, carbs: 0, kcal: 0 });
  const [showCal, setShowCal] = useState(false);

  /* refresh ---------------------------------------------------------------- */
  const refresh = useCallback(async (day = iso(date)) => {
    setMeals(await db.getMealsByDate(day));
    setTot((await db.getTotals(day)) ?? { protein: 0, fat: 0, carbs: 0, kcal: 0 });
  }, [date]);

  useEffect(() => {
    db.init().then(refresh).catch(console.warn);
  }, []);

  /* add test product ------------------------------------------------------- */
  const handleAdd = async () => {
    await db.addMeal('100 g Rice', 3, 0.1, 27, iso(date));
    refresh();
  };

  /* multiplier edit -------------------------------------------------------- */
  const promptMul = (id: number, cur: number) => {
    Alert.prompt(
      'Multiplier',
      '0.0 – 10.0',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (v) => {
            const m = parseFloat(v ?? '1');
            if (isNaN(m) || m < 0 || m > 10) return;
            await db.updateMultiplier(id, m);
            refresh();
          },
        },
      ],
      'plain-text',
      cur.toString(),
      'decimal-pad'
    );
  };

  /* single row ------------------------------------------------------------- */
  const Row = ({ item }: { item: typeof meals[0] }) => {
    const P = item.protein * item.multiplier;
    const F = item.fat * item.multiplier;
    const C = item.carbs * item.multiplier;
    const kcal = P * 4 + F * 9 + C * 4;
    return (
      <Pressable style={styles.card} onPress={() => promptMul(item.id, item.multiplier)}>
        <View style={styles.cardLeft}>
          <Text style={styles.mult}>{item.multiplier.toFixed(1)}×</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <View style={styles.macros}>
          <Text style={styles.kcal}>{kcal.toFixed(0)} kcal</Text>
          <Text style={styles.macro}>{P.toFixed(1)} P</Text>
          <Text style={styles.macro}>{F.toFixed(1)} F</Text>
          <Text style={styles.macro}>{C.toFixed(1)} C</Text>
        </View>
      </Pressable>
    );
  };

  /* calendar pick ---------------------------------------------------------- */
  const onChangeDate = (_: any, picked?: Date) => {
    setShowCal(false);
    if (picked) {
      setDate(picked);
      refresh(iso(picked));
    }
  };

  /* render ----------------------------------------------------------------- */
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />

        {/* header */}
        <TouchableOpacity style={styles.header} onPress={() => setShowCal(true)}>
          <Ionicons name="calendar-outline" size={18} color="#1e90ff" />
          <Text style={styles.headerTxt}> {iso(date)}</Text>
        </TouchableOpacity>

        {/* list */}
        <FlatList
          data={meals}
          keyExtractor={(i) => i.id.toString()}
          renderItem={Row}
          contentContainerStyle={meals.length === 0 && { flex: 1, justifyContent: 'center' }}
          ListEmptyComponent={<Text style={styles.empty}>Brak pozycji</Text>}
        />

        {/* floating + */}
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        {/* totals bar */}
        <View style={styles.totals}>
          <Text style={styles.totalTxt}>{tot.kcal.toFixed(0)} kcal</Text>
          <Text style={styles.totalTxt}>P {tot.protein.toFixed(1)}</Text>
          <Text style={styles.totalTxt}>F {tot.fat.toFixed(1)}</Text>
          <Text style={styles.totalTxt}>C {tot.carbs.toFixed(1)}</Text>
        </View>

        {/* calendar native modal */}
        {showCal && (
          <DateTimePicker
            value={date}
            mode="date"
            display="calendar"
            onChange={onChangeDate}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/* --------------------------- styles ------------------------------------ */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  headerTxt: { fontSize: 18, fontWeight: '600', color: '#1e90ff' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  mult: { fontSize: 13, color: '#777', marginRight: 4 },
  name: { fontSize: 15 },

  macros: { alignItems: 'flex-end' },
  kcal: { fontSize: 13, marginBottom: 2, color: '#333' },
  macro: { fontSize: 12, color: '#666' },

  empty: { textAlign: 'center', color: '#888' },

  addBtn: {
    position: 'absolute',
    right: 24,
    bottom: 96,
    backgroundColor: '#1e90ff',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },

  totals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  totalTxt: { fontWeight: '600' },
});
