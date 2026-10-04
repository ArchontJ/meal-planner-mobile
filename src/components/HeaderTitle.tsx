import { View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/theme/theme";

/** Stack header title that wraps to two lines instead of cutting long recipe names, with an optional line below. */
export function HeaderTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexShrink: 1, paddingRight: 8 }}>
      <Text variant="titleMedium" numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="labelMedium" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
