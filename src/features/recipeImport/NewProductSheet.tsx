import { onlineManager } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { BottomSheet } from "@/components/BottomSheet";
import { SelectChip } from "@/components/SelectChip";
import { useCreatePrivateProduct, type PickProduct } from "@/features/recipeImport/api";
import { useCategoryInfo } from "@/features/shopping/api";
import { parseDecimal } from "@/lib/format";
import { useAppTheme } from "@/theme/theme";

// Same rules as the desktop product form (ProductFormDialog), without the EAN field.
const MACROS = ["kcal", "protein", "fat", "carbs"] as const;
type Macro = (typeof MACROS)[number];
const MAX: Record<Macro, number> = { kcal: 900, protein: 100, fat: 100, carbs: 100 };

type Form = { name: string; producer: string; categoryId: string | null } & Record<Macro, string>;
type Errors = Partial<Record<keyof Form, string>>;

function validate(form: Form): { errors: Errors; values?: Record<Macro, number> } {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "validation.required";
  else if (form.name.trim().length > 200) errors.name = "validation.max";
  if (form.producer.trim().length > 200) errors.producer = "validation.max";
  if (!form.categoryId) errors.categoryId = "validation.required";
  const values = {} as Record<Macro, number>;
  for (const m of MACROS) {
    const v = parseDecimal(form[m]);
    if (form[m].trim() === "") errors[m] = "validation.required";
    else if (Number.isNaN(v)) errors[m] = "validation.number";
    else if (v < 0) errors[m] = "validation.min";
    else if (v > MAX[m]) errors[m] = "validation.max";
    values[m] = v;
  }
  if (!errors.protein && !errors.fat && !errors.carbs && values.protein + values.fat + values.carbs > 100) {
    errors.carbs = "validation.macrosOver100";
  }
  return Object.keys(errors).length > 0 ? { errors } : { errors, values };
}

const empty = (name: string): Form => ({ name, producer: "", categoryId: null, kcal: "", protein: "", fat: "", carbs: "" });

/** A private product typed in by hand while reviewing an imported recipe; saved right away. */
export function NewProductSheet({
  visible,
  initialName,
  onCreated,
  onClose,
}: {
  visible: boolean;
  initialName: string;
  onCreated: (product: PickProduct) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const categories = [...useCategoryInfo().values()].sort((a, b) => a.order - b.order);
  const create = useCreatePrivateProduct();
  // The parent gives this sheet a key per line, so the form starts empty each time.
  const [form, setForm] = useState<Form>(() => empty(initialName));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const set = (key: keyof Form, value: string | null) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function save() {
    const result = validate(form);
    setErrors(result.errors);
    if (!result.values) return;
    if (!onlineManager.isOnline()) {
      setFailure(t("mobile.recipePhoto.newProduct.offline"));
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const product = await create({
        name: form.name.trim(),
        producer: form.producer.trim() || null,
        category_id: form.categoryId!,
        ...result.values,
      });
      onCreated(product);
    } catch (e) {
      setFailure(t("mobile.recipePhoto.newProduct.failed", { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  }

  const error = (key: keyof Form) =>
    errors[key] ? (
      <HelperText type="error" style={{ marginTop: -6 }}>
        {t(errors[key]!)}
      </HelperText>
    ) : null;

  return (
    <BottomSheet visible={visible} title={t("mobile.recipePhoto.newProduct.title")} onClose={onClose}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t("mobile.recipePhoto.newProduct.note")}
      </Text>
      <TextInput mode="outlined" label={t("products.name")} value={form.name} onChangeText={(v) => set("name", v)} error={!!errors.name} />
      {error("name")}
      <TextInput
        mode="outlined"
        label={t("mobile.recipePhoto.newProduct.producer")}
        value={form.producer}
        onChangeText={(v) => set("producer", v)}
        error={!!errors.producer}
      />
      {error("producer")}
      <Text variant="titleSmall">{t("products.category")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {categories.map((c) => (
          <SelectChip key={c.id} selected={form.categoryId === c.id} onPress={() => set("categoryId", c.id)}>
            {c.name}
          </SelectChip>
        ))}
      </View>
      {error("categoryId")}
      <Text variant="titleSmall">{t("products.per100g")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MACROS.map((m) => (
          <View key={m} style={{ width: "48%" }}>
            <TextInput
              mode="outlined"
              label={m === "kcal" ? t("macros.kcalUnit") : t(`macros.${m}`)}
              value={form[m]}
              onChangeText={(v) => set(m, v)}
              keyboardType="decimal-pad"
              right={m === "kcal" ? undefined : <TextInput.Affix text="g" />}
              error={!!errors[m]}
            />
            {error(m)}
          </View>
        ))}
      </View>
      {failure && <HelperText type="error">{failure}</HelperText>}
      <Button mode="contained" onPress={() => void save()} loading={busy} disabled={busy}>
        {t("mobile.recipePhoto.newProduct.save")}
      </Button>
    </BottomSheet>
  );
}
