import { marked, type Token, type Tokens } from "marked";
import { Fragment, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/theme/theme";

/**
 * Recipe instructions with simple Markdown (bold, italic, lists, headings), like the desktop.
 * Only the parser of `marked` is used; we render native text, so raw HTML is never shown
 * and links and images appear as plain text.
 */
export function MarkdownText({ text }: { text: string }) {
  const tokens = useMemo(() => marked.lexer(text), [text]);
  return <View style={{ gap: 10 }}>{tokens.map((t, i) => <Block key={i} token={t} />)}</View>;
}

function Block({ token }: { token: Token }) {
  const theme = useAppTheme();
  switch (token.type) {
    case "heading": {
      const t = token as Tokens.Heading;
      return (
        <Text variant={t.depth <= 2 ? "titleMedium" : "titleSmall"} style={{ marginTop: 4 }}>
          <Inline tokens={t.tokens} />
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text variant="bodyLarge" style={{ lineHeight: 24 }}>
          <Inline tokens={(token as Tokens.Paragraph).tokens} />
        </Text>
      );
    case "list": {
      const t = token as Tokens.List;
      const start = typeof t.start === "number" ? t.start : 1;
      return (
        <View style={{ gap: 8 }}>
          {t.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8 }}>
              <Text variant="bodyLarge" style={{ minWidth: 22, color: theme.colors.primary, fontWeight: "600" }}>
                {t.ordered ? `${start + i}.` : "•"}
              </Text>
              <View style={{ flex: 1, gap: 6 }}>
                {item.tokens.map((child, j) =>
                  child.type === "text" ? (
                    <Text key={j} variant="bodyLarge" style={{ lineHeight: 24 }}>
                      <Inline tokens={(child as Tokens.Text).tokens ?? [child]} />
                    </Text>
                  ) : (
                    <Block key={j} token={child} />
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case "blockquote":
      return (
        <View style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.outlineVariant, paddingLeft: 10, gap: 6 }}>
          {(token as Tokens.Blockquote).tokens.map((t, i) => (
            <Block key={i} token={t} />
          ))}
        </View>
      );
    case "code":
      return (
        <Text variant="bodyMedium" style={{ fontFamily: "monospace" }}>
          {(token as Tokens.Code).text}
        </Text>
      );
    case "text":
      return (
        <Text variant="bodyLarge" style={{ lineHeight: 24 }}>
          <Inline tokens={(token as Tokens.Text).tokens ?? [token]} />
        </Text>
      );
    default:
      return null; // space, hr, html, tables: not used in recipes
  }
}

function Inline({ tokens }: { tokens: Token[] | undefined }): ReactNode {
  if (!tokens) return null;
  return tokens.map((t, i) => <Fragment key={i}>{inline(t)}</Fragment>);
}

function inline(t: Token): ReactNode {
  switch (t.type) {
    case "strong":
      return (
        <Text style={{ fontWeight: "700" }}>
          <Inline tokens={(t as Tokens.Strong).tokens} />
        </Text>
      );
    case "em":
      return (
        <Text style={{ fontStyle: "italic" }}>
          <Inline tokens={(t as Tokens.Em).tokens} />
        </Text>
      );
    case "del":
      return (
        <Text style={{ textDecorationLine: "line-through" }}>
          <Inline tokens={(t as Tokens.Del).tokens} />
        </Text>
      );
    case "link":
      return <Inline tokens={(t as Tokens.Link).tokens} />;
    case "image":
      return (t as Tokens.Image).text;
    case "codespan":
      return <Text style={{ fontFamily: "monospace" }}>{(t as Tokens.Codespan).text}</Text>;
    case "br":
      return "\n";
    case "text": {
      const tt = t as Tokens.Text;
      return tt.tokens ? <Inline tokens={tt.tokens} /> : decode(tt.text);
    }
    case "escape":
      return (t as Tokens.Escape).text;
    default:
      return "raw" in t ? decode(String(t.raw)) : null;
  }
}

// marked escapes these in text tokens; show the characters themselves.
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
