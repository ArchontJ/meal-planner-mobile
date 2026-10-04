import { Stack, useLocalSearchParams } from "expo-router";
import { ComingSoon } from "@/components/ComingSoon";

// Cooking view of a planned meal – built in M3.
export default function MealScreen() {
  const { label } = useLocalSearchParams<{ id: string; label?: string; date?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: label ?? "" }} />
      <ComingSoon />
    </>
  );
}
