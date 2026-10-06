import { CameraView, useCameraPermissions } from "expo-camera";
import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Vibration, View } from "react-native";
import { Button, HelperText, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { isValidEan, normalizeEan } from "../../supabase/functions/_shared/ean";
import { addToMyProducts, fromProductRow, importFromOff, useInvalidateMyProducts, useMyProducts } from "@/features/products/api";
import { ScanResultSheet } from "@/features/products/ScanResultSheet";
import { lookupEan, type ScanResult } from "@/features/products/scanLookup";

/** Same code seen again within this time is ignored (the camera reports it many times a second). */
const REPEAT_MS = 3000;

// The camera picture is always dark, so the controls over it use fixed light colours.
const ON_CAMERA = "#FFFFFF";
const ON_CAMERA_SOFT = "#E1E3E0";
const FRAME = "#D3E8DC";

/** Barcode scanner: looks a product up and adds it to the user's products (from the Zakupy tab). */
export default function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const last = useRef({ code: "", at: 0 });

  const myProducts = useMyProducts();
  const invalidateMine = useInvalidateMyProducts();
  const sheetOpen = busy || result !== null;

  const handleCode = async (raw: string) => {
    const ean = normalizeEan(raw);
    const now = Date.now();
    if (sheetOpen || (ean === last.current.code && now - last.current.at < REPEAT_MS)) return;
    last.current = { code: ean, at: now };
    if (!isValidEan(ean)) return; // misread – keep scanning
    Vibration.vibrate(40);
    setBusy(true);
    setResult(await lookupEan(ean, myProducts.data ?? []));
    setBusy(false);
  };

  const next = () => {
    setResult(null);
    last.current = { code: last.current.code, at: Date.now() };
  };

  const header = <Stack.Screen options={{ headerShown: false }} />;

  if (!permission?.granted) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
        {header}
        <Text variant="titleMedium">{t("mobile.scan.permissionTitle")}</Text>
        <Text variant="bodyMedium">{t("mobile.scan.permissionBody")}</Text>
        <Button mode="contained" onPress={() => void requestPermission()} disabled={permission?.canAskAgain === false}>
          {t("mobile.scan.allowCamera")}
        </Button>
        {permission?.canAskAgain === false && (
          <HelperText type="info" visible>
            {t("mobile.scan.permissionSettings")}
          </HelperText>
        )}
        <Button onPress={() => router.back()}>{t("common.close")}</Button>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {header}
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a"] }}
        onBarcodeScanned={sheetOpen ? undefined : (r) => void handleCode(r.data)}
      />

      {/* Frame and controls over the camera picture. */}
      <SafeAreaView style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="box-none">
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IconButton icon="arrow-left" iconColor={ON_CAMERA} onPress={() => router.back()} accessibilityLabel={t("common.close")} />
          <Text variant="titleMedium" style={{ color: ON_CAMERA, flex: 1 }}>
            {t("mobile.scan.title")}
          </Text>
          <IconButton
            icon={torch ? "flashlight-off" : "flashlight"}
            iconColor={ON_CAMERA}
            onPress={() => setTorch((v) => !v)}
            accessibilityLabel={t("mobile.scan.torch")}
          />
        </View>
        {!sheetOpen && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
            <View style={{ width: "75%", height: 140, borderWidth: 3, borderColor: FRAME, borderRadius: 18 }} />
            <Text style={{ color: ON_CAMERA_SOFT, marginTop: 16 }}>{t("mobile.scan.hint")}</Text>
          </View>
        )}
      </SafeAreaView>

      {sheetOpen && (
        <ScanResultSheet
          result={result}
          busy={busy}
          onAddToMine={async () => {
            if (result?.kind !== "catalog" || !result.product.id) return;
            await addToMyProducts(result.product.id);
            await invalidateMine();
            setResult({ kind: "mine", product: result.product, justAdded: true });
          }}
          onImport={async (categoryKey, name) => {
            if (result?.kind !== "off") return;
            const res = await importFromOff(result.product.ean, categoryKey, name);
            await invalidateMine();
            setResult({ kind: "mine", product: fromProductRow(res.product, result.product.ean), justAdded: true });
          }}
          onNext={next}
        />
      )}
    </View>
  );
}
