import { useMemo, useState } from "react";
import { View, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { LanguageCode } from "@app/shared-types/enums";
import { LanguageDisplayName, LanguageFlag } from "@/src/constants/languages";
import { useTheme, useInputTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Divider } from "@/src/components/ui/Divider";
import { DetailedScreenHeader as ScreenHeader } from "@/src/components/ui/DetailedScreenHeader";
import { useUserStore } from "@/src/store/userStore";
import { updateMe } from "@/src/api/users";
import { useChatStore } from "@/src/store/chatStore";
import { getChats } from "@/src/api/chats";

type LanguageOption = {
    code: LanguageCode;
    name: string;
    flag: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = Object.values(LanguageCode)
    .map((code) => ({ code, name: LanguageDisplayName[code], flag: LanguageFlag[code] }))
    .sort((a, b) => a.name.localeCompare(b.name));

export default function LanguageSettings() {
    const { colors, spacing, radii } = useTheme();
    const inputTheme = useInputTheme();
    const me = useUserStore((s) => s.me);
    const setMe = useUserStore((s) => s.setMe);
    const clearAll = useChatStore((s) => s.clearAll);
    const setChats = useChatStore((s) => s.setChats);
    const [query, setQuery] = useState("");
    const [savingCode, setSavingCode] = useState<LanguageCode | null>(null);
    const [errorCode, setErrorCode] = useState<LanguageCode | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return LANGUAGE_OPTIONS;
        return LANGUAGE_OPTIONS.filter(
            (opt) =>
                opt.name.toLowerCase().includes(q) ||
                opt.code.toLowerCase().includes(q)
        );
    }, [query]);

    const selected = (me?.preferredLang as LanguageCode) ?? null;
    const hasQuery = query.trim().length > 0;

    async function onSelect(code: LanguageCode) {
        if (savingCode || code === selected) return;

        setSavingCode(code);
        setErrorCode(null);

        try {
            const { user } = await updateMe({ preferredLang: code });
            setMe(user);
            clearAll();
            const chats = await getChats();
            setChats(chats);
        } catch (e) {
            console.error(e);
            setErrorCode(code);
        } finally {
            setSavingCode(null);
        }
    }

    if (!me) return null;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View
                    style={styles.container}
                >
                    <ScreenHeader title="Language Settings" showBack />

                    <View style={[styles.searchWrap, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
                        <View
                            style={[
                                styles.searchBar,
                                {
                                    backgroundColor: colors.searchBarBg,
                                    borderColor: colors.border,
                                    borderRadius: radii.search,
                                },
                            ]}
                        >
                            <Ionicons
                                name="search"
                                size={16}
                                color={hasQuery ? colors.primary : colors.textTertiary}
                            />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search languages..."
                                {...inputTheme}
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={[styles.searchInput, { color: colors.textPrimary, lineHeight: 19 }]}
                            />
                            {hasQuery && (
                                <Pressable onPress={() => setQuery("")}>
                                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.code}
                        keyboardShouldPersistTaps="handled"
                        ItemSeparatorComponent={() => <Divider indent={spacing.lg} />}
                        renderItem={({ item }) => {
                            const isSelected = selected === item.code;
                            const isSaving = savingCode === item.code;
                            const hasError = errorCode === item.code;
                            return (
                                <Pressable
                                    onPress={() => onSelect(item.code)}
                                    disabled={!!savingCode}
                                    style={({ pressed }) => [
                                        styles.row,
                                        {
                                            paddingHorizontal: spacing.lg,
                                            backgroundColor: isSelected
                                                ? colors.primarySubtle
                                                : pressed
                                                ? colors.primarySubtle
                                                : "transparent",
                                            opacity: savingCode && !isSaving ? 0.5 : 1,
                                        },
                                    ]}
                                >
                                    <Text variant="body" style={styles.flag}>
                                        {item.flag}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <Text variant="body">{item.name}</Text>
                                        {hasError && (
                                            <Text
                                                variant="caption"
                                                color={colors.error}
                                                style={{ marginTop: 2 }}
                                            >
                                                Couldn't save - tap to retry
                                            </Text>
                                        )}
                                    </View>
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : isSelected ? (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    ) : null}
                                </Pressable>
                            );
                        }}
                    />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchWrap: {
        width: "100%",
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 0.5,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: 12,
    },
    flag: {
        fontSize: 22,
    },
});
