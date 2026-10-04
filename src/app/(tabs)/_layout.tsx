import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} color={color} size={size} />;

// Three tabs; profile and settings open from the avatar in the header.
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{ header: ({ options }) => <AppHeader title={options.title ?? ""} /> }}
      tabBar={({ navigation, state, descriptors, insets }) => (
        <BottomNavigation.Bar
          navigationState={state}
          safeAreaInsets={insets}
          onTabPress={({ route, preventDefault }) => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) preventDefault();
            else navigation.navigate(route.name, route.params);
          }}
          renderIcon={({ route, focused, color }) =>
            descriptors[route.key]?.options.tabBarIcon?.({ focused, color, size: 24 }) ?? null
          }
          getLabelText={({ route }) => descriptors[route.key]?.options.title}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: t("mobile.tabs.plan"), tabBarIcon: tabIcon("calendar-today"), headerShown: false }} />
      <Tabs.Screen
        name="recipes"
        options={{ title: t("mobile.tabs.recipes"), tabBarIcon: tabIcon("book-open-variant") }}
      />
      <Tabs.Screen name="shopping" options={{ title: t("mobile.tabs.shopping"), tabBarIcon: tabIcon("cart-outline") }} />
    </Tabs>
  );
}
