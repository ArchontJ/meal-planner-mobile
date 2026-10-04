import type { ReactNode } from "react";
import { Chip } from "react-native-paper";
import { useAppTheme } from "@/theme/theme";

/** Filter chip whose selected state is obvious: filled in the primary colour with a check mark. */
export function SelectChip({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Chip
      mode={selected ? "flat" : "outlined"}
      selected={selected}
      showSelectedCheck
      selectedColor={selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
      style={selected ? { backgroundColor: theme.colors.primary } : { backgroundColor: "transparent" }}
      onPress={onPress}
      accessibilityState={{ selected }}
    >
      {children}
    </Chip>
  );
}
