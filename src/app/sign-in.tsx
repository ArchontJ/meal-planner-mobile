import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SignInScreen } from "@/features/auth/SignInScreen";
import { useAuth } from "@/lib/auth";

export default function SignInRoute() {
  const status = useAuth((s) => s.status);
  // While the saved session is being restored, don't flash the sign-in button.
  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <SignInScreen />;
}
