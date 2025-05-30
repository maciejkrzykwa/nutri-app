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
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
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
    const handleDelete = async () => {
      await db.deleteMeal(item.id);
      refresh();
    };

    const renderLeft = () => (
      <View style={styles.deleteBox}>
        <Ionicons name="trash-outline" size={26} color="#fff" />
      </View>
    );

    const P = item.protein * item.multiplier;
    const F = item.fat * item.multiplier;
    const C = item.carbs * item.multiplier;
    const kcal = P * 4 + F * 9 + C * 4;

    return (
    <Swipeable
      renderLeftActions={renderLeft}  
      onSwipeableOpen={() => handleDelete()}
      overshootLeft={false}
    >
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
      </Swipeable>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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

          {/* --- DAILY TOTALS BAR ------------------------------------ */}
          <View style={styles.totalsBar}>
            <Text style={styles.totalsTitle}>Daily Totals</Text>

            <View style={styles.totalsRow}>
              <View style={styles.totalsBox}>
                <Text style={[styles.totalsVal, styles.proteinClr]}>
                  {tot.protein.toFixed(1)}g
                </Text>
                <Text style={styles.totalsLbl}>Protein</Text>
              </View>

              <View style={styles.totalsBox}>
                <Text style={[styles.totalsVal, styles.fatClr]}>
                  {tot.fat.toFixed(1)}g
                </Text>
                <Text style={styles.totalsLbl}>Fat</Text>
              </View>

              <View style={styles.totalsBox}>
                <Text style={[styles.totalsVal, styles.carbsClr]}>
                  {tot.carbs.toFixed(1)}g
                </Text>
                <Text style={styles.totalsLbl}>Carbs</Text>
              </View>

              <View style={styles.totalsBox}>
                <Text style={styles.totalsVal}>
                  {tot.kcal.toFixed(0)}
                </Text>
                <Text style={styles.totalsLbl}>kcal</Text>
              </View>
            </View>
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
    </GestureHandlerRootView>
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
    right: 16,
    bottom: 126,
    backgroundColor: '#1e90ff',
    width: 72,
    height: 72,
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

  /* === DAILY TOTALS === */
  totalsBar: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#d0d7de',
    paddingBottom: 12,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 0,
  },
  totalsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalsBox: { alignItems: 'center', minWidth: 64 },
  totalsVal: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  totalsLbl: { fontSize: 11, color: '#64748b', marginTop: 2 },

  /* kolorystyka makro-składników */
  proteinClr: { color: '#0ea5e9' },  /* secondary */
  fatClr:     { color: '#f59e0b' },  /* accent    */
  carbsClr:   { color: '#10b981' },  /* primary   */

  deleteBox: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#ff3b30',
    paddingHorizontal: 20,
    marginVertical: 6,
    borderRadius: 10,
  },
});
