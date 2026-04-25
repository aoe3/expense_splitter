import { Text, StyleSheet, ScrollView } from "react-native";

const participants = [
  "TEST_USER_1",
  "TEST_USER_2",
  "TEST_USER_3",
  "TEST_GUEST_1",
];

const invoices = [
  { name: "TEST_USER_2", amount: "$19.33" },
  { name: "TEST_USER_3", amount: "$23.20" },
  { name: "TEST_GUEST_1", amount: "$11.59" },
];

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>TEST_TRIP_GROUP_1</Text>

      <Text style={styles.sectionHeader}>Participants</Text>

      {participants.map((p, index) => (
        <Text key={index} style={styles.item}>
          • {p}
        </Text>
      ))}

      <Text style={styles.sectionHeader}>Invoices</Text>

      {invoices.map((inv, index) => (
        <Text key={index} style={styles.item}>
          {inv.name} → {inv.amount}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    padding: 20,
    paddingTop: 80,
  },
  title: {
    color: "#111111",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  sectionHeader: {
    color: "#111111",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  item: {
    color: "#111111",
    fontSize: 16,
    marginBottom: 6,
  },
});
