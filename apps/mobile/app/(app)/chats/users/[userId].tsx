import { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ImageView from "react-native-image-viewing";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Avatar } from "@/src/components/ui/Avatar";
import { DetailedScreenHeader as ScreenHeader } from "@/src/components/ui/DetailedScreenHeader";
import { SettingsSection } from "@/src/components/settings/SettingsSection";
import { SettingsRow } from "@/src/components/settings/SettingsRow";
import { useUserStore } from "@/src/store/userStore";
import { LanguageDisplayName } from "@/src/constants/languages";
import { LanguageCode } from "@app/shared-types/enums";
import { formatJoinedDate } from "@/src/utils/dateFormat";

const AVATAR_SIZE = 140;

export default function UserProfileScreen() {
    const { colors, spacing } = useTheme();
    const me = useUserStore((s) => s.me);
    const [viewerVisible, setViewerVisible] = useState(false);

    const params = useLocalSearchParams<{
        userId: string;
        displayName?: string;
        username?: string;
        pictureUrl?: string;
        preferredLang?: string;
        createdAt?: string;
    }>();

    const userId = params.userId;
    const displayName = params.displayName ?? "";
    const username = params.username ?? "";
    const pictureUrl = params.pictureUrl;
    const preferredLang = params.preferredLang as LanguageCode | undefined;
    const createdAt = params.createdAt;

    if (!userId) return null;

    const peerLanguageLabel = preferredLang
        ? LanguageDisplayName[preferredLang] ?? preferredLang
        : "Unknown";

    const myLanguageLabel = me?.preferredLang
        ? LanguageDisplayName[me.preferredLang as LanguageCode] ?? me.preferredLang
        : "Unknown";

    const joinedLabel = createdAt ? formatJoinedDate(createdAt) : null;

    const canOpenViewer = !!pictureUrl;

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
            <ScreenHeader showBack title="" transparent />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
                <View
                    style={[
                        styles.hero,
                        {
                            paddingHorizontal: spacing.lg,
                            paddingBottom: spacing.xl,
                        },
                    ]}
                >
                    <Pressable
                        onPress={() => canOpenViewer && setViewerVisible(true)}
                        disabled={!canOpenViewer}
                        style={({ pressed }) => ({
                            opacity: pressed && canOpenViewer ? 0.85 : 1,
                        })}
                    >
                        <Avatar
                            name={displayName}
                            size={AVATAR_SIZE}
                            imageUrl={pictureUrl}
                            userId={userId}
                        />
                    </Pressable>

                    <Text
                        variant="screenTitle"
                        align="center"
                        style={{ marginTop: spacing.md }}
                        numberOfLines={1}
                    >
                        {displayName}
                    </Text>
                    {username && (
                        <Text
                            variant="secondary"
                            align="center"
                            color={colors.textSecondary}
                            style={{ marginTop: spacing.xs }}
                            numberOfLines={1}
                        >
                            @{username}
                        </Text>
                    )}
                </View>

                <SettingsSection title="Languages">
                    <SettingsRow
                        icon="language-outline"
                        label="Speaks"
                        value={peerLanguageLabel}
                        showChevron={false}
                        firstInGroup
                    />
                    <SettingsRow
                        icon="swap-horizontal-outline"
                        label="Translated to"
                        value={myLanguageLabel}
                        showChevron={false}
                        lastInGroup
                    />
                </SettingsSection>

                {joinedLabel && (
                    <SettingsSection title="About">
                        <SettingsRow
                            icon="calendar-outline"
                            label="Joined"
                            value={joinedLabel}
                            showChevron={false}
                            firstInGroup
                            lastInGroup
                        />
                    </SettingsSection>
                )}
            </ScrollView>

            {canOpenViewer && (
                <ImageView
                    images={[{ uri: pictureUrl! }]}
                    imageIndex={0}
                    visible={viewerVisible}
                    onRequestClose={() => setViewerVisible(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    hero: {
        alignItems: "center",
    },
});
