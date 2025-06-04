import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as db from "./src/db";
/* imports – dodajemy Icons */
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

/* enum tabów, na górze pliku */
type Tab = "daily" | "products";

/* utils */
const iso = (d: Date) => {
  const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ------------------------------------------------------------------- */
export default function App() {
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState<
    {
      id: number;
      name: string;
      protein: number;
      fat: number;
      carbs: number;
      multiplier: number;
    }[]
  >([]);
  const [tot, setTot] = useState({ protein: 0, fat: 0, carbs: 0, kcal: 0 });
  const [showCal, setShowCal] = useState(false);

  /* refresh ---------------------------------------------------------------- */
  const refresh = useCallback(
    async (day = iso(date)) => {
      setMeals(await db.getMealsByDate(day));
      setTot(
        (await db.getTotals(day)) ?? { protein: 0, fat: 0, carbs: 0, kcal: 0 }
      );
    },
    [date]
  );

  const [tab, setTab] = useState<Tab>("daily");

  /* ---------- PRODUCT PICKER (Daily) ---------- */
  const [showPicker, setShowPicker] = useState(false);
  const [allProducts, setAllProducts] = useState<
    { id: number; name: string; protein: number; fat: number; carbs: number }[]
  >([]);

  const openPicker = async () => {
    setAllProducts(await db.getAllProducts());
    setShowPicker(true);
  };
  const closePicker = () => setShowPicker(false);

  const [needScroll, setNeedScroll] = useState(false);
  const listRef = useRef<FlatList<any>>(null);

  /* ---------- EDIT MULTIPLIER MODAL ---------- */
  const [showMul, setShowMul] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mulVal, setMulVal] = useState("");
  const openMul = (id: number, cur: number) => {
    setSelectedId(id);
    setMulVal(cur.toString());
    setShowMul(true);
  };
  const closeMul = () => setShowMul(false);

  /* ---------- DAILY GOAL ---------- */
  const [goal, setGoal] = useState<{
    weight: number;
    p: number;
    f: number;
    c: number;
  } | null>(null);
  const [showGoal, setShowGoal] = useState(false);

  /* ---------- COPY-DAY PICKER ---------- */
  const [showCopy, setShowCopy] = useState(false);
  const copyMealsFrom = async (srcIso: string) => {
    const srcMeals = await db.getMealsRaw(srcIso);
    for (const m of srcMeals) {
      await db.addMeal(
        m.name,
        m.protein,
        m.fat,
        m.carbs,
        iso(date),
        m.multiplier
      );
    }
    refresh();
  };

  useEffect(() => {
    db.init().then(refresh).catch(console.warn);
    db.getGoal().then((g) => {
      if (g) setGoal({ weight: g.weight, p: g.p_kg, f: g.f_kg, c: g.c_kg });
    });
  }, []);

  /* ------------------------------------------------------------------ */
  /*                       PRODUCTS  –  drugi ekran                     */
  /* ------------------------------------------------------------------ */
  const ProductsScreen: React.FC = () => {
    const [products, setProductsProductsView] = useState<
      {
        id: number;
        name: string;
        protein: number;
        fat: number;
        carbs: number;
      }[]
    >([]);
    const loadProductsView = useCallback(
      async () => setProductsProductsView(await db.getAllProducts()),
      []
    );
    useEffect(() => {
      loadProductsView();
    }, []);

    /* -------- modal state -------- */
    const [show, setShowProductsView] = useState(false);
    const [name, setNameProductsView] = useState("");
    const [protein, setProteinProductsView] = useState("");
    const [fat, setFatProductsView] = useState("");
    const [carbs, setCarbsProductsView] = useState("");

    const resetFormProductsView = () => {
      setNameProductsView("");
      setProteinProductsView("");
      setFatProductsView("");
      setCarbsProductsView("");
    };
    const openProductsView = () => {
      resetFormProductsView();
      setShowProductsView(true);
    };
    const closeProductsView = () => setShowProductsView(false);

    const handleSaveProductsView = async () => {
      const p = parseFloat(protein),
        f = parseFloat(fat),
        c = parseFloat(carbs);
      if (!name.trim() || isNaN(p) || isNaN(f) || isNaN(c)) return;
      await db.addProduct(name.trim(), p, f, c);
      closeProductsView();
      loadProductsView();
    };

    const handleDeleteProduct = async (id: number) => {
      await db.deleteProduct(id);
      loadProductsView();
    };

    /* ----------- COMPONENT: pojedynczy wiersz produktu ----------- */
    const ProductRow = ({
      item,
      onDelete,
    }: {
      item: (typeof products)[0];
      onDelete: (id: number) => void;
    }) => {
      const opacity = React.useRef(new Animated.Value(1)).current;

      const fadeOutAndDelete = () =>
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => onDelete(item.id));

      const renderLeft = () => (
        <View style={styles.deleteBox}>
          <Ionicons name="trash-outline" size={26} color="#fff" />
        </View>
      );

      return (
        <Swipeable
          renderLeftActions={renderLeft}
          onSwipeableOpen={fadeOutAndDelete}
          overshootLeft={false}
        >
          <Animated.View style={{ opacity }}>
            <View style={styles.prodRow}>
              <Text style={styles.prodName}>{item.name}</Text>
              <Text style={styles.macroText}>
                <Text style={[styles.macroVal, styles.proteinClr]}>
                  {item.protein.toFixed(1)}g{" "}
                </Text>
                protein
              </Text>
              <Text style={styles.macroText}>
                <Text style={[styles.macroVal, styles.fatClr]}>
                  {item.fat.toFixed(1)}g{" "}
                </Text>
                fat
              </Text>
              <Text style={styles.macroText}>
                <Text style={[styles.macroVal, styles.carbsClr]}>
                  {item.carbs.toFixed(1)}g{" "}
                </Text>
                carbs
              </Text>
              <Text style={styles.kcal}>
                {(item.protein * 4 + item.carbs * 4 + item.fat * 9).toFixed(0)}{" "}
                kcal
              </Text>
            </View>
          </Animated.View>
        </Swipeable>
      );
    };

    return (
      <>
        <FlatList
          data={products}
          keyExtractor={(i) => i.id.toString()}
          renderItem={({ item }) => (
            <ProductRow item={item} onDelete={handleDeleteProduct} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", marginTop: 32, color: "#64748b" }}
            >
              No products yet
            </Text>
          }
        />

        {/* floating + */}
        <TouchableOpacity style={styles.addBtn} onPress={openProductsView}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        {/* ---------- MODAL ---------- */}
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>New product</Text>

              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  value={name}
                  onChangeText={setNameProductsView}
                />
                <Text style={styles.ghostHint}>name</Text>
              </View>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Protein"
                  keyboardType="decimal-pad"
                  value={protein}
                  onChangeText={setProteinProductsView}
                />
                <Text style={styles.ghostHint}>protein</Text>
              </View>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Fat"
                  keyboardType="decimal-pad"
                  value={fat}
                  onChangeText={setFatProductsView}
                />
                <Text style={styles.ghostHint}>fat</Text>
              </View>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Carbs"
                  keyboardType="decimal-pad"
                  value={carbs}
                  onChangeText={setCarbsProductsView}
                />
                <Text style={styles.ghostHint}>carbs</Text>
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={closeProductsView}
                >
                  <Text style={styles.btnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSave}
                  onPress={handleSaveProductsView}
                >
                  <Text style={[styles.btnTxt, { color: "#fff" }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  /* ----------- COMPONENT: pojedynczy wiersz posiłku ----------- */
  const MealRow = ({ item }: { item: (typeof meals)[0] }) => {
    const opacity = React.useRef(new Animated.Value(1)).current;
    const [shadowOff, setShadowOff] = useState(false);

    const fadeOutAndDelete = () => {
      setShadowOff(true);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(async () => {
        await db.deleteMeal(item.id);
        refresh();
      });
    };

    const P = item.protein * item.multiplier;
    const F = item.fat * item.multiplier;
    const C = item.carbs * item.multiplier;
    const kcal = P * 4 + F * 9 + C * 4;

    const renderLeft = () => (
      <View style={styles.deleteBox}>
        <Ionicons name="trash-outline" size={26} color="#fff" />
      </View>
    );

    return (
      <Swipeable
        renderLeftActions={renderLeft}
        onSwipeableOpen={fadeOutAndDelete}
        overshootLeft={false}
      >
        <Animated.View style={{ opacity }}>
          <Pressable
            style={[
              styles.card,
              shadowOff && { elevation: 0, shadowOpacity: 0 },
            ]}
            onPress={() => openMul(item.id, item.multiplier)}
          >
            {/* górna linia: multiplier + nazwa + kcal */}
            <View style={styles.rowTop}>
              <View style={styles.rowLeft}>
                <Text style={styles.mult}>{item.multiplier.toFixed(1)}x</Text>
                <Text style={styles.rowName}>{item.name}</Text>
              </View>
              <Text style={styles.kcal}>{kcal.toFixed(0)} kcal</Text>
            </View>

            {/* dolna linia: makro-składniki */}
            <View style={styles.rowBottom}>
              <Text style={styles.macroText}>
                <Text style={[styles.macroVal, styles.proteinClr]}>
                  {P.toFixed(1)}g{" "}
                </Text>
                protein
              </Text>
              <Text style={styles.macroText}>
                <Text style={[styles.macroVal, styles.fatClr]}>
                  {F.toFixed(1)}g{" "}
                </Text>
                fat
              </Text>
              <Text style={styles.macroText}>
                <Text style={[styles.macroVal, styles.carbsClr]}>
                  {C.toFixed(1)}g{" "}
                </Text>
                carbs
              </Text>
            </View>

            {/* ikonka „grip” po prawej */}
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color="#94a3b8"
              style={styles.grip}
            />
          </Pressable>
        </Animated.View>
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

  /* ile zjedzono na 1 kg wagi docelowej */
  const perKg = goal
    ? {
        p: tot.protein / goal.weight,
        f: tot.fat / goal.weight,
        c: tot.carbs / goal.weight,
      }
    : { p: tot.protein, f: tot.fat, c: tot.carbs }; // fallback, gdy brak celu

  /* render ----------------------------------------------------------------- */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe}>
          <StatusBar style="dark" />

          {/* ---------- DATE PICKER BUTTON (Tylko gdy Daily) -------- */}
          {tab === "daily" ? (
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowCal(true)}
            >
              <Text style={styles.dateTxt}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />{" "}
                {iso(date)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.dateBtn}></TouchableOpacity>
          )}

          {/* ---------- TABS ----------------------------------------- */}
          <View style={styles.tabsWrap}>
            <Pressable
              style={[styles.tabBtn, tab === "daily" && styles.tabActive]}
              onPress={() => setTab("daily")}
            >
              <FontAwesome5
                name="utensils"
                size={16}
                color={tab === "daily" ? "#2563eb" : "#475569"}
              />
              <Text
                style={[styles.tabTxt, tab === "daily" && styles.tabTxtActive]}
              >
                {" "}
                Daily Tracking
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, tab === "products" && styles.tabActive]}
              onPress={() => setTab("products")}
            >
              <Ionicons
                name="server-outline"
                size={18}
                color={tab === "products" ? "#2563eb" : "#475569"}
              />
              <Text
                style={[
                  styles.tabTxt,
                  tab === "products" && styles.tabTxtActive,
                ]}
              >
                {" "}
                Products
              </Text>
            </Pressable>
          </View>

          {/* -------- SWITCH SCREEN ---------------------------------- */}
          {tab === "daily" ? (
            <>
              {/* list */}
              <FlatList
                ref={listRef}
                data={meals}
                keyExtractor={(i) => i.id.toString()}
                renderItem={({ item }) => <MealRow item={item} />}
                onContentSizeChange={() => {
                  if (needScroll) {
                    listRef.current?.scrollToEnd({ animated: true });
                    setNeedScroll(false);
                  }
                }}
                contentContainerStyle={
                  meals.length === 0 && { flex: 1, justifyContent: "center" }
                }
                ListEmptyComponent={
                  <Pressable
                    style={{ flex: 1, justifyContent: "center" }}
                    onPress={() => setShowCopy(true)}
                  >
                    <Text style={styles.empty}>
                      +Tap to copy one of the previous days
                    </Text>
                  </Pressable>
                }
              />

              {/* floating + */}
              <TouchableOpacity style={styles.addBtn} onPress={openPicker}>
                <Ionicons name="add" size={30} color="#fff" />
              </TouchableOpacity>

              {/* --- DAILY TOTALS BAR ------------------------------------ */}
              <TouchableOpacity
                style={styles.totalsBar}
                onPress={() => setShowGoal(true)}
              >
                <Text style={styles.totalsTitle}>Daily Totals</Text>

                <View style={styles.totalsRow}>
                  <View style={styles.totalsBox}>
                    <Text style={[styles.totalsVal, styles.proteinClr]}>
                      {perKg.p.toFixed(2)}{" "}
                      <Text style={styles.gperkg}>g/kg</Text>
                    </Text>
                    <Text style={styles.totalsLbl}>Protein</Text>
                  </View>

                  <View style={styles.totalsBox}>
                    <Text style={[styles.totalsVal, styles.fatClr]}>
                      {perKg.f.toFixed(2)}{" "}
                      <Text style={styles.gperkg}>g/kg</Text>
                    </Text>
                    <Text style={styles.totalsLbl}>Fat</Text>
                  </View>

                  <View style={styles.totalsBox}>
                    <Text style={[styles.totalsVal, styles.carbsClr]}>
                      {perKg.c.toFixed(2)}{" "}
                      <Text style={styles.gperkg}>g/kg</Text>
                    </Text>
                    <Text style={styles.totalsLbl}>Carbs</Text>
                  </View>

                  <View style={styles.totalsBox}>
                    <Text style={styles.totalsVal}>{tot.kcal.toFixed(0)}</Text>
                    <Text style={styles.totalsLbl}>kcal</Text>
                  </View>
                </View>

                {goal && (
                  <View style={styles.goalTotalsView}>
                    <Text style={styles.goalTotals}>
                      <Text style={styles.totalsTitle}>Goal </Text>
                      <Text style={styles.goalTotals}>{goal.weight} kg</Text>
                      <Text style={[styles.proteinClr]}>
                        {" "}
                        {Number(goal.p).toFixed(1)}
                      </Text>
                      <Text style={styles.spacerVertical}> | </Text>
                      <Text style={[styles.fatClr]}>
                        {Number(goal.f).toFixed(1)}
                      </Text>
                      <Text style={styles.spacerVertical}> | </Text>
                      <Text style={[styles.carbsClr]}>
                        {Number(goal.c).toFixed(1)}{" "}
                      </Text>
                      <Text>
                        {Math.round(
                          goal.weight * (goal.p * 4 + goal.f * 9 + goal.c * 4)
                        )}{" "}
                        kcal
                      </Text>
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* calendar native modal */}
              {showCal && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="calendar"
                  onChange={onChangeDate}
                />
              )}
            </>
          ) : (
            <ProductsScreen />
          )}

          {/* ---------- PRODUCT PICKER MODAL ---------- */}
          <Modal visible={showPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalBox, { maxHeight: "70%" }]}>
                <Text style={styles.modalTitle}>Choose product</Text>

                <FlatList
                  data={allProducts}
                  keyExtractor={(i) => i.id.toString()}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.prodRow}
                      onPress={async () => {
                        await db.addMeal(
                          item.name,
                          item.protein,
                          item.fat,
                          item.carbs,
                          iso(date)
                        );
                        setNeedScroll(true);
                        closePicker();
                        refresh();
                      }}
                    >
                      <Text style={styles.prodName}>{item.name}</Text>
                      <Text style={styles.proteinClr}>
                        {item.protein.toFixed(1)} P
                      </Text>
                      <Text style={styles.spacerVertical}> | </Text>
                      <Text style={styles.fatClr}>{item.fat.toFixed(1)} F</Text>
                      <Text style={styles.spacerVertical}> | </Text>
                      <Text style={styles.carbsClr}>
                        {item.carbs.toFixed(1)} C
                      </Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", marginTop: 20 }}>
                      No products
                    </Text>
                  }
                />

                {/* przycisk Zamknij */}
                <TouchableOpacity
                  style={[styles.btnCancel, { alignSelf: "flex-end" }]}
                  onPress={closePicker}
                >
                  <Text style={styles.btnTxt}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ---------- MULTIPLIER MODAL ---------- */}
          <Modal visible={showMul} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Multiplier (0 – 10)</Text>

                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={mulVal}
                  onChangeText={setMulVal}
                  autoFocus
                />

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.btnCancel} onPress={closeMul}>
                    <Text style={styles.btnTxt}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnSave}
                    onPress={async () => {
                      const m = parseFloat(mulVal);
                      if (isNaN(m) || m < 0 || m > 10 || selectedId === null)
                        return;
                      await db.updateMultiplier(selectedId, m);
                      closeMul();
                      refresh(); /* odświeża wiersz + totals */
                    }}
                  >
                    <Text style={[styles.btnTxt, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ---------- GOAL MODAL ---------- */}
          <Modal visible={showGoal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Set your goal</Text>

                <View style={{ position: "relative" }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Target weight (kg)"
                    keyboardType="decimal-pad"
                    value={goal?.weight.toString() ?? ""}
                    onChangeText={(v) =>
                      setGoal((g) =>
                        g ? { ...g, weight: v.replace(",", ".") } : null
                      )
                    }
                  />
                  <Text style={styles.ghostHint}>
                    target&nbsp;weight&nbsp;(kg)
                  </Text>
                </View>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Protein g per kg"
                    keyboardType="decimal-pad"
                    value={goal?.p.toString() ?? ""}
                    onChangeText={(v) =>
                      setGoal((g) =>
                        g ? { ...g, p: v.replace(",", ".") } : null
                      )
                    }
                  />
                  <Text style={styles.ghostHint}>
                    protein g&nbsp;per&nbsp;kg
                  </Text>
                </View>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Fat g per kg"
                    keyboardType="decimal-pad"
                    value={goal?.f.toString() ?? ""}
                    onChangeText={(v) =>
                      setGoal((g) =>
                        g ? { ...g, f: v.replace(",", ".") } : null
                      )
                    }
                  />
                  <Text style={styles.ghostHint}>fat g&nbsp;per&nbsp;kg</Text>
                </View>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Carbs g per kg"
                    keyboardType="decimal-pad"
                    value={goal?.c.toString() ?? ""}
                    onChangeText={(v) =>
                      setGoal((g) =>
                        g ? { ...g, c: v.replace(",", ".") } : null
                      )
                    }
                  />
                  <Text style={styles.ghostHint}>carbs g&nbsp;per&nbsp;kg</Text>
                </View>

                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => setShowGoal(false)}
                  >
                    <Text style={styles.btnTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnSave}
                    onPress={async () => {
                      if (!goal) return;
                      const w = parseFloat(
                          goal.weight.toString().replace(",", ".")
                        ),
                        p = parseFloat(goal.p.toString().replace(",", ".")),
                        f = parseFloat(goal.f.toString().replace(",", ".")),
                        c = parseFloat(goal.c.toString().replace(",", "."));
                      if (isNaN(w) || isNaN(p) || isNaN(f) || isNaN(c)) return;
                      await db.upsertGoal(w, p, f, c);
                      setShowGoal(false);
                    }}
                  >
                    <Text style={[styles.btnTxt, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ---------- COPY-DAY DATE PICKER ---------- */}
          {showCopy && (
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              onChange={async (_evt, picked) => {
                setShowCopy(false);
                if (picked) {
                  const srcIso = iso(picked);
                  if (srcIso !== iso(date)) {
                    await copyMealsFrom(srcIso);
                  }
                }
              }}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/* --------------------------- styles ------------------------------------ */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  headerTxt: { fontSize: 18, fontWeight: "600", color: "#1e90ff" },

  /* karta wiersza */
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    elevation: 2,
  },

  /* górna i dolna część wiersza */
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowBottom: { flexDirection: "row", marginTop: 4 },

  /* teksty */
  mult: { fontSize: 13, color: "#64748b", marginRight: 4, fontWeight: "500" },
  rowName: { fontSize: 15, color: "#0f172a", fontWeight: "500" },
  kcal: { fontSize: 13, color: "#0f172a", marginRight: 25, fontWeight: "600" },

  macroText: { fontSize: 11, color: "#475569", marginRight: 16 },
  macroVal: { fontWeight: "600" },

  /* ikona grip */
  grip: { position: "absolute", right: 12, top: 28 },

  empty: { textAlign: "center", color: "#888" },

  btnTxt: { fontSize: 15, color: "#0f172a", fontWeight: "500" },

  addBtn: {
    position: "absolute",
    right: 16,
    bottom: 172,
    backgroundColor: "#1e90ff",
    width: 72,
    height: 72,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  totals: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  totalTxt: { fontWeight: "600" },

  /* === DAILY TOTALS === */
  totalsBar: {
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#d0d7de",
    paddingBottom: 14,
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 0,
  },
  totalsTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 12,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalsBox: { alignItems: "center", minWidth: 64 },
  totalsVal: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
  totalsLbl: { fontSize: 11, color: "#64748b", marginTop: 2 },

  /* kolorystyka makro-składników */
  proteinClr: { color: "#0ea5e9" } /* secondary */,
  fatClr: { color: "#f59e0b" } /* accent    */,
  carbsClr: { color: "#10b981" } /* primary   */,

  goalTotals: { fontSize: 11, color: "#64748b", marginTop: 0 },
  goalTotalsView: {
    alignContent: "center",
    textAlign: "center",
    margin: "auto",
    paddingTop: 13,
    marginBottom: 0,
  },

  gperkg: { fontSize: 9 },

  deleteBox: {
    justifyContent: "center",
    alignItems: "flex-start",
    backgroundColor: "#ff3b30",
    paddingHorizontal: 20,
    marginVertical: 6,
    borderRadius: 10,
  },

  /* przycisk z datą */
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
    backgroundColor: "#2563eb",
    alignSelf: "center",
    width: "100%",
    textAlign: "center",
    alignContent: "center",
    height: 70,
  },
  dateTxt: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "500",
    alignSelf: "center",
    width: "100%",
    textAlign: "center",
    alignContent: "center",
  },

  /* ---------- TABS ---------- */
  tabsWrap: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
    marginBottom: 12,
  },

  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },

  /* kolor podkreślenia + jaśniejsze tło dla aktywnej karty */
  tabActive: {
    backgroundColor: "#eff6ff",
    borderBottomWidth: 2,
    borderColor: "#2563eb",
  },

  tabTxt: {
    fontSize: 15,
    color: "#475569", // Slate-600
    fontWeight: "500",
  },

  tabTxtActive: {
    color: "#2563eb", // Indigo-600
  },

  /* --- products row --- */
  prodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  prodName: { flex: 1, fontSize: 15, color: "#0f172a" },
  prodMacro: { width: 50, textAlign: "right", fontSize: 12, color: "#475569" },

  /* --- modal --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
    color: "#0f172a",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  btnCancel: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnSave: {
    marginLeft: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },

  spacerVertical: { fontSize: 15, color: "#ddd" },

  ghostHint: {
    position: "absolute",
    right: 10,
    top: 10, // dopasuj do paddingVertical w .input
    fontSize: 12,
    color: "#94a3b8", // szary
  },
});
