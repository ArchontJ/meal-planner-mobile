import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";
import { Button, Chip, Dialog, Icon, IconButton, Portal, Text, TextInput } from "react-native-paper";
import { SelectChip } from "@/components/SelectChip";
import { MacroSummary, PortionStepper } from "@/features/cooking/CookingView";
import type { PickProduct } from "@/features/recipeImport/api";
import { choose, lineStatus, MAX_SERVINGS, skip, type Draft, type Line, type LineStatus } from "@/features/recipeImport/draft";
import { IngredientSheet } from "@/features/recipeImport/IngredientSheet";
import { NewProductSheet } from "@/features/recipeImport/NewProductSheet";
import { buildIngredients, linePortionGrams, MAX_TAG_LENGTH, portionGramsValid } from "@/features/recipes/import/build";
import { formatGramsLabel } from "@/lib/format";
import { mealSlotLabel } from "@/lib/labels";
import { recipePortionMacros } from "@/lib/nutrition";
import type { Tables } from "@/types/database";
import { useAppTheme, type AppTheme } from "@/theme/theme";

const STATUS_ICON: Record<LineStatus, string> = {
  chosen: "check",
  suggested: "lightbulb-outline",
  open: "alert-outline",
  pending: "clock-outline",
  noGrams: "scale",
};

const statusColor = (status: LineStatus, theme: AppTheme) =>
  status === "chosen" ? theme.colors.primary : status === "open" || status === "noGrams" ? theme.colors.error : theme.colors.onSurfaceVariant;

type Props = {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  slots: Tables<"meal_slots">[];
  myProducts: PickProduct[];
  saving: boolean;
  onSave: () => void;
};

/** The read recipe, editable before saving: details, ingredients matched to products, steps. */
export function ReviewForm({ draft, setDraft, slots, myProducts, saving, onSave }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [newProductFor, setNewProductFor] = useState<Line | null>(null);
  const [editStep, setEditStep] = useState<{ index: number; text: string } | null>(null);
  const [tagText, setTagText] = useState<string | null>(null);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateLine = (key: string, change: (l: Line) => Line) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? change(l) : l)) }));
  const openLine = draft.lines.find((l) => l.key === openKey) ?? null;

  const active = draft.lines.filter((l) => !l.toTaste);
  const toTaste = draft.lines.filter((l) => l.toTaste);
  const openCount = active.filter((l) => l.choice.kind === "open").length;
  const { ingredients } = buildIngredients(draft.lines, draft.servings);
  const macros = recipePortionMacros({ ingredients: ingredients.filter((i) => portionGramsValid(i.grams)) });

  const toggleSlot = (id: string) =>
    update({ slotIds: draft.slotIds.includes(id) ? draft.slotIds.filter((s) => s !== id) : [...draft.slotIds, id] });
  const addTag = () => {
    const tag = (tagText ?? "").trim().toLocaleLowerCase("pl").slice(0, MAX_TAG_LENGTH);
    if (tag && !draft.tags.includes(tag)) update({ tags: [...draft.tags, tag] });
    setTagText(null);
  };
  const saveStep = () => {
    if (!editStep) return;
    const text = editStep.text.trim();
    setDraft((d) => {
      const steps = [...d.steps];
      if (editStep.index >= steps.length) {
        if (text) steps.push(text);
      } else if (text) steps[editStep.index] = text;
      else steps.splice(editStep.index, 1);
      return { ...d, steps };
    });
    setEditStep(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <TextInput mode="outlined" label={t("mobile.recipePhoto.name")} value={draft.name} onChangeText={(name) => update({ name })} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text variant="titleSmall" style={{ flex: 1 }}>
            {t("mobile.recipePhoto.servings")}
          </Text>
          <PortionStepper value={draft.servings} onChange={(servings) => update({ servings })} step={1} min={1} max={MAX_SERVINGS} />
        </View>
        <TextInput
          mode="outlined"
          label={t("mobile.recipePhoto.source")}
          placeholder={t("mobile.recipePhoto.sourcePlaceholder")}
          value={draft.source}
          onChangeText={(source) => update({ source })}
        />

        <Text variant="titleSmall">{t("mobile.recipePhoto.meals")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {slots.map((s) => (
            <SelectChip key={s.id} selected={draft.slotIds.includes(s.id)} onPress={() => toggleSlot(s.id)}>
              {mealSlotLabel(s, t)}
            </SelectChip>
          ))}
        </View>

        <Text variant="titleSmall">{t("mobile.recipePhoto.tags")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {draft.tags.map((tag) => (
            <Chip
              key={tag}
              onClose={() => update({ tags: draft.tags.filter((x) => x !== tag) })}
              closeIconAccessibilityLabel={t("mobile.recipePhoto.removeTag", { tag })}
            >
              {tag}
            </Chip>
          ))}
          <Chip icon="plus" mode="outlined" onPress={() => setTagText("")}>
            {t("mobile.recipePhoto.addTag")}
          </Chip>
        </View>

        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 8 }}>
          <Text variant="titleMedium" style={{ flex: 1 }}>
            {t("mobile.recipePhoto.ingredients")}
          </Text>
          {openCount > 0 && (
            <Text variant="labelLarge" style={{ color: theme.colors.error }}>
              {t("mobile.recipePhoto.openCount", { count: openCount })}
            </Text>
          )}
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -8 }}>
          {t("mobile.recipePhoto.gramsHint")}
        </Text>
        <View>
          {active.map((line) => (
            <IngredientRow key={line.key} line={line} servings={draft.servings} onPress={() => setOpenKey(line.key)} />
          ))}
        </View>
        {toTaste.length > 0 && (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("mobile.recipePhoto.toTaste", { names: toTaste.map((l) => l.source.name).join(", ") })}
          </Text>
        )}

        <Text variant="titleMedium" style={{ marginTop: 8 }}>
          {t("mobile.recipePhoto.steps")}
        </Text>
        <View>
          {draft.steps.map((step, i) => (
            <Pressable
              key={i}
              onPress={() => setEditStep({ index: i, text: step })}
              style={{ flexDirection: "row", gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: theme.colors.outlineVariant }}
              accessibilityRole="button"
              accessibilityHint={t("common.edit")}
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.primary, minWidth: 20 }}>
                {i + 1}.
              </Text>
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                {step}
              </Text>
              <IconButton icon="pencil-outline" size={18} style={{ margin: 0 }} onPress={() => setEditStep({ index: i, text: step })} />
            </Pressable>
          ))}
        </View>
        <Button mode="text" icon="plus" onPress={() => setEditStep({ index: draft.steps.length, text: "" })} style={{ alignSelf: "flex-start" }}>
          {t("mobile.recipePhoto.addStep")}
        </Button>
      </ScrollView>

      <View
        style={{
          gap: 8,
          padding: 12,
          borderTopWidth: 1,
          borderColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.surface,
        }}
      >
        <MacroSummary macros={macros} />
        <Button mode="contained" onPress={onSave} loading={saving} disabled={saving}>
          {t("mobile.recipePhoto.save")}
        </Button>
      </View>

      <IngredientSheet
        key={openKey ?? "closed"}
        line={openLine}
        servings={draft.servings}
        myProducts={myProducts}
        onChoose={(p) => {
          if (openLine) updateLine(openLine.key, (l) => choose(l, p));
          setOpenKey(null);
        }}
        onGrams={(grams) => openLine && updateLine(openLine.key, (l) => ({ ...l, portionGrams: grams }))}
        onNewProduct={() => {
          setNewProductFor(openLine);
          setOpenKey(null);
        }}
        onLeavePending={() => {
          if (openLine) updateLine(openLine.key, skip);
          setOpenKey(null);
        }}
        onRemove={() => {
          if (openLine) setDraft((d) => ({ ...d, lines: d.lines.filter((l) => l.key !== openLine.key) }));
          setOpenKey(null);
        }}
        onClose={() => setOpenKey(null)}
      />
      <NewProductSheet
        key={newProductFor?.key ?? "closed"}
        visible={newProductFor !== null}
        initialName={newProductFor ? capitalize(newProductFor.source.name) : ""}
        onCreated={(p) => {
          if (newProductFor) updateLine(newProductFor.key, (l) => choose(l, p));
          setNewProductFor(null);
        }}
        onClose={() => setNewProductFor(null)}
      />

      <Portal>
        <Dialog visible={editStep !== null} onDismiss={() => setEditStep(null)}>
          <Dialog.Title>
            {editStep && editStep.index < draft.steps.length
              ? t("mobile.recipePhoto.editStep", { n: editStep.index + 1 })
              : t("mobile.recipePhoto.newStep")}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              multiline
              autoFocus
              value={editStep?.text ?? ""}
              onChangeText={(text) => setEditStep((s) => s && { ...s, text })}
              style={{ maxHeight: 240 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            {editStep && editStep.index < draft.steps.length && (
              <Button textColor={theme.colors.error} onPress={() => setEditStep((s) => s && { ...s, text: "" })}>
                {t("mobile.recipePhoto.deleteStep")}
              </Button>
            )}
            <Button onPress={() => setEditStep(null)}>{t("common.cancel")}</Button>
            <Button onPress={saveStep}>{t("common.save")}</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={tagText !== null} onDismiss={() => setTagText(null)}>
          <Dialog.Title>{t("mobile.recipePhoto.addTag")}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              autoFocus
              placeholder={t("mobile.recipePhoto.tagPlaceholder")}
              value={tagText ?? ""}
              onChangeText={setTagText}
              onSubmitEditing={addTag}
              maxLength={MAX_TAG_LENGTH}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTagText(null)}>{t("common.cancel")}</Button>
            <Button onPress={addTag}>{t("common.add")}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function IngredientRow({ line, servings, onPress }: { line: Line; servings: number; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const status = lineStatus(line, servings);
  const grams = linePortionGrams(line, servings);
  const product = line.choice.kind === "product" ? line.choice.product : null;
  const color = statusColor(status, theme);
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: theme.colors.outlineVariant }}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge">
          {product ? product.name : line.source.name}
          {product ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {"  "}
              {product.isCatalog ? t("mobile.recipePhoto.catalog") : t("mobile.recipePhoto.mine")}
            </Text>
          ) : null}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
          {line.source.original}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text variant="bodyLarge">{grams === null ? "? g" : formatGramsLabel(grams, i18n.language)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Icon source={STATUS_ICON[status]} size={14} color={color} />
          <Text variant="labelSmall" style={{ color }}>
            {t(`mobile.recipePhoto.status.${status}`)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase("pl") + s.slice(1);
