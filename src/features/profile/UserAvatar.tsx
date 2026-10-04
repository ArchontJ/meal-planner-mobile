import { Avatar } from "react-native-paper";
import { useProfile } from "@/features/profile/api";
import { useAppTheme } from "@/theme/theme";

/** The Google photo from the profile, or initials while it is missing. */
export function UserAvatar({ size = 36 }: { size?: number }) {
  const { data: profile } = useProfile();
  const theme = useAppTheme();

  if (profile?.avatar_url) return <Avatar.Image size={size} source={{ uri: profile.avatar_url }} />;

  const initials = (profile?.display_name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return initials ? (
    <Avatar.Text
      size={size}
      label={initials}
      color={theme.colors.onPrimaryContainer}
      style={{ backgroundColor: theme.colors.primaryContainer }}
    />
  ) : (
    <Avatar.Icon
      size={size}
      icon="account"
      color={theme.colors.onPrimaryContainer}
      style={{ backgroundColor: theme.colors.primaryContainer }}
    />
  );
}
