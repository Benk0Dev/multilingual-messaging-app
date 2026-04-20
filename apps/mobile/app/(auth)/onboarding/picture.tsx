import { useState } from "react";
import {
    View,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { ProgressBar } from "@/src/components/onboarding/ProgressBar";
import { OnboardingScreen } from "@/src/components/onboarding/OnboardingScreen";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { getProfilePictureUploadUrl } from "@/src/api/users";
import { completeOnboarding } from "@/src/auth/authService";
import { Header } from "@/src/components/onboarding/Header";

type SupportedExtension = "jpg" | "jpeg" | "png" | "webp";

function extensionFromUri(uri: string): SupportedExtension | null {
    const match = uri.split(".").pop()?.toLowerCase();
    if (!match) return null;
    if (match === "jpg" || match === "jpeg" || match === "png" || match === "webp") {
        return match;
    }
    return null;
}

function contentTypeForExtension(ext: SupportedExtension): string {
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    return "image/webp";
}

const PICKER_SIZE_EMPTY = 140;
const PICKER_SIZE_SELECTED = 220;

export default function PictureStep() {
    const { colors, spacing } = useTheme();
    const preferredLang = useOnboardingStore((s) => s.preferredLang);
    const username = useOnboardingStore((s) => s.username);
    const displayName = useOnboardingStore((s) => s.displayName);
    const pictureLocalUri = useOnboardingStore((s) => s.pictureLocalUri);
    const setPictureLocalUri = useOnboardingStore((s) => s.setPictureLocalUri);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasPicture = !!pictureLocalUri;
    const pickerSize = hasPicture ? PICKER_SIZE_SELECTED : PICKER_SIZE_EMPTY;

    async function onPickImage() {
        setError(null);

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setError("We need permission to access your photos");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;
        setPictureLocalUri(result.assets[0].uri);
    }

    function onRemovePicture() {
        if (submitting) return;
        setPictureLocalUri(null);
        setError(null);
    }

    async function uploadPicture(localUri: string): Promise<string> {
        const ext = extensionFromUri(localUri);
        if (!ext) {
            throw new Error("Unsupported image format");
        }

        const { uploadUrl, publicUrl } = await getProfilePictureUploadUrl(ext);

        const fileRes = await fetch(localUri);
        const blob = await fileRes.blob();

        const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentTypeForExtension(ext) },
            body: blob,
        });

        if (!putRes.ok) {
            throw new Error(`Upload failed: ${putRes.status}`);
        }

        return publicUrl;
    }

    async function onFinish(skipPicture: boolean) {
        if (!preferredLang || !username || !displayName) {
            setError("Missing onboarding data - please restart");
            return;
        }
        if (submitting) return;

        setSubmitting(true);
        setError(null);

        try {
            let pictureUrl: string | undefined;
            if (!skipPicture && pictureLocalUri) {
                pictureUrl = await uploadPicture(pictureLocalUri);
            }

            await completeOnboarding({
                username,
                displayName,
                preferredLang,
                pictureUrl,
            });
        } catch (e: any) {
            console.error(e);
            const message = (e?.message ?? "").toLowerCase();
            if (message.includes("username")) {
                setError("That username was just taken - please go back and pick another");
            } else {
                setError("Something went wrong - please try again");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <OnboardingScreen>
            <ProgressBar step={4} totalSteps={4} />

            <Header
                title="Add a profile picture"
                subtitle="This will be the picture shown in chats and your profile"
                showBack={true}
            />

            <View style={[styles.content, { paddingHorizontal: spacing.lg, marginTop: spacing.xs }]}>
                <View style={styles.center}>
                    <Pressable
                        onPress={onPickImage}
                        disabled={submitting}
                        style={[
                            styles.picker,
                            {
                                width: pickerSize,
                                height: pickerSize,
                                borderRadius: pickerSize / 2,
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                                borderWidth: hasPicture ? 0 : 2,
                            },
                        ]}
                    >
                        {pictureLocalUri ? (
                            <Image
                                source={{ uri: pictureLocalUri }}
                                style={styles.pickerImage}
                                contentFit="cover"
                            />
                        ) : (
                            <Ionicons name="camera-outline" size={44} color={colors.textTertiary} />
                        )}
                    </Pressable>

                    <Pressable
                        onPress={onPickImage}
                        disabled={submitting}
                        style={{ marginTop: spacing.lg }}
                    >
                        <Text variant="bodyBold" color={colors.primary}>
                            {hasPicture ? "Change photo" : "Choose photo"}
                        </Text>
                    </Pressable>

                    {hasPicture && (
                        <Pressable
                            onPress={onRemovePicture}
                            disabled={submitting}
                            style={{ marginTop: spacing.sm }}
                            hitSlop={8}
                        >
                            <Text variant="caption" color={colors.textTertiary}>
                                Remove photo
                            </Text>
                        </Pressable>
                    )}
                </View>

                {error && (
                    <Text
                        variant="caption"
                        color={colors.error}
                        align="center"
                        style={{ marginBottom: spacing.md }}
                    >
                        {error}
                    </Text>
                )}

                <View style={{ gap: spacing.sm }}>
                    <Button
                        label={submitting ? "Finishing..." : "Finish"}
                        onPress={() => onFinish(false)}
                        disabled={submitting}
                    />
                    {!hasPicture && (
                        <Pressable
                            onPress={() => onFinish(true)}
                            disabled={submitting}
                            style={{ paddingVertical: 12, alignItems: "center" }}
                        >
                            <Text variant="bodyBold" color={colors.textSecondary}>
                                Skip for now
                            </Text>
                        </Pressable>
                    )}
                </View>

                {submitting && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}
            </View>
        </OnboardingScreen>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    picker: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    pickerImage: {
        width: "100%",
        height: "100%",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
});