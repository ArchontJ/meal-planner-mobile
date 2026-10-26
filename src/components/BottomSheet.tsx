import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/theme/theme";

/** Modal sheet from the bottom edge; tapping outside or Back closes it. */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: theme.colors.backdrop }} onPress={onClose} accessibilityLabel={t("common.close")} />
        <View
          style={{
            maxHeight: "85%",
            backgroundColor: theme.colors.surfaceContainerLow,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingBottom: insets.bottom,
          }}
        >
          <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant, alignSelf: "center" }} />
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
            {title ? <Text variant="titleLarge">{title}</Text> : null}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
