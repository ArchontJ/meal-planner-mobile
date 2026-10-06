import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Text, TextInput } from "react-native-paper";
import type { SystemCategoryKey } from "../../../supabase/functions/_shared/off";
import { SelectChip } from "@/components/SelectChip";
import { MacroSummary } from "@/features/cooking/CookingView";
import type { ScannedProduct } from "@/features/products/api";
import type { ScanResult } from "@/features/products/scanLookup";
import { productCategoriesOptions, useCategoryInfo } from "@/features/shopping/api";
import { useAuth } from "@/lib/auth";
import { productCategoryLabel } from "@/lib/labels";
import { useAppTheme } from "@/theme/theme";

type Props = {
  result: ScanResult | null;
  busy: boolean;
  onAddToMine: () => Promise<void>;
  onImport: (categoryKey: SystemCategoryKey, name: string) => Promise<void>;
  onNext: () => void;
};

/** Bottom sheet over the camera: what was scanned and how to add it to the user's products. */
export function ScanResultSheet({ result, busy, onAddToMine, onImport, onNext }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: "75%",
        backgroundColor: theme.colors.surfaceContainerHigh,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
      }}
    >
      <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant, alignSelf: "center" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {busy || !result ? (
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 16 }}>
            <ActivityIndicator />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("mobile.scan.looking")}
            </Text>
          </View>
        ) : (
          <Content result={result} onAddToMine={onAddToMine} onImport={onImport} />
        )}
        <Button mode="text" icon="barcode-scan" onPress={onNext}>
          {t("mobile.scan.next")}
        </Button>
      </ScrollView>
    </View>
  );
}

function Content({ result, onAddToMine, onImport }: Omit<Props, "busy" | "onNext"> & { result: ScanResult }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [saving, setSaving] = useState(false);

  if (result.kind === "notFound" || result.kind === "offline" || result.kind === "error") {
    const message =
      result.kind === "offline"
        ? t("mobile.scan.offline")
        : result.kind === "error"
          ? `${t("errors.loadFailed")} ${result.message}`
          : result.incomplete
            ? t("mobile.scan.incomplete")
            : t("mobile.scan.notFound");
    return (
      <View style={{ gap: 6 }}>
        <Text variant="titleMedium">{result.kind === "notFound" ? t("mobile.scan.notFoundTitle") : t("mobile.scan.unavailableTitle")}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {message}
        </Text>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          EAN {result.ean}
        </Text>
      </View>
    );
  }

  const { product } = result;
  return (
    <View style={{ gap: 10 }}>
      <ProductHeader product={product} kind={result.kind} />
      <MacroSummary macros={product} />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: -4 }}>
        {t("products.per100g")}
      </Text>

      {result.kind === "mine" && (
        <Text variant="bodyMedium" style={{ color: result.justAdded ? theme.colors.statusOk : theme.colors.onSurfaceVariant }}>
          {result.justAdded ? t("mobile.scan.added") : t("mobile.scan.alreadyMine")}
        </Text>
      )}
      {result.kind === "catalog" && (
        <Button
          mode="contained"
          icon="plus"
          loading={saving}
          disabled={saving}
          contentStyle={{ height: 48 }}
          onPress={async () => {
            setSaving(true);
            try {
              await onAddToMine();
            } finally {
              setSaving(false);
            }
          }}
        >
          {t("mobile.scan.addToProducts")}
        </Button>
      )}
      {result.kind === "off" && <ImportForm product={product} suggested={result.suggestedCategoryKey} onImport={onImport} />}
    </View>
  );
}

function ProductHeader({ product, kind }: { product: ScannedProduct; kind: "mine" | "catalog" | "off" }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const categories = useCategoryInfo();
  const badge =
    kind === "mine" ? t("mobile.scan.mine") : kind === "catalog" ? t("products.catalog") : t("mobile.scan.newFromOff");
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ flex: 1 }}>
        {kind !== "off" && <Text variant="titleMedium">{product.name}</Text>}
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {[product.producer, product.categoryId ? categories.get(product.categoryId)?.name : null, product.ean]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View
        style={{
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 2,
          backgroundColor: kind === "off" ? theme.colors.tertiaryContainer : theme.colors.secondaryContainer,
        }}
      >
        <Text
          variant="labelSmall"
          style={{ color: kind === "off" ? theme.colors.onTertiaryContainer : theme.colors.onSecondaryContainer }}
        >
          {badge}
        </Text>
      </View>
    </View>
  );
}

/** New product from Open Food Facts: editable name and a required system category, as on the desktop. */
function ImportForm({
  product,
  suggested,
  onImport,
}: {
  product: ScannedProduct;
  suggested: SystemCategoryKey | null;
  onImport: (categoryKey: SystemCategoryKey, name: string) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const userId = useAuth((s) => s.session?.user.id);
  const { data: categories = [] } = useQuery(productCategoriesOptions(userId));
  const system = categories.filter((c) => c.user_id === null && c.key).sort((a, b) => a.position - b.position);
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState<SystemCategoryKey | null>(suggested);
  const [saving, setSaving] = useState(false);

  return (
    <View style={{ gap: 10 }}>
      <TextInput mode="outlined" label={t("products.name")} value={name} onChangeText={setName} dense />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t("products.nameEditNote")}
      </Text>
      <Text variant="labelLarge">{t("mobile.scan.categoryRequired")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {system.map((c) => (
          <SelectChip key={c.id} selected={category === c.key} onPress={() => setCategory(c.key as SystemCategoryKey)}>
            {productCategoryLabel(c, i18n.language)}
          </SelectChip>
        ))}
      </View>
      <Button
        mode="contained"
        icon="plus"
        disabled={!category || !name.trim() || saving}
        loading={saving}
        onPress={async () => {
          if (!category) return;
          setSaving(true);
          try {
            await onImport(category, name.trim());
          } finally {
            setSaving(false);
          }
        }}
        contentStyle={{ height: 48 }}
      >
        {t("mobile.scan.importToProducts")}
      </Button>
    </View>
  );
}
