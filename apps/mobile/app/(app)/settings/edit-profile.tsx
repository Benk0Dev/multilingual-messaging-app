import { useEffect, useRef, useState } from "react";
import {
    View,
    StyleSheet,
    Pressable,
    ScrollView,
    Alert,
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { usernameSchema } from "@app/shared-types/schemas";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { TextInputField } from "@/src/components/ui/TextInputField";
import { DetailedScreenHeader as ScreenHeader } from "@/src/components/ui/DetailedScreenHeader";
import { Avatar } from "@/src/components/ui/Avatar";
import { useUserStore } from "@/src/store/userStore";
import {
    checkUsernameAvailable,
    getProfilePictureUploadUrl,
    updateMe,
} from "@/src/api/users";

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

const AVATAR_SIZE = 140;
const AVAILABILITY_DEBOUNCE_MS = 400;

type PictureState =
    | { kind: "unchanged" }
    | { kind: "new"; localUri: string }
    | { kind: "removed" };

type UsernameAvailability =
    | { status: "idle" } // matches current username, no check needed
    | { status: "checking" }
    | { status: "available" }
    | { status: "taken" }
    | { status: "invalid"; message: string }
    | { status: "error" };

export default function EditProfile() {
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const me = useUserStore((s) => s.me);
    const setMe = useUserStore((s) => s.setMe);

    const [displayName, setDisplayName] = useState(me?.displayName ?? "");
    const [username, setUsername] = useState(me?.username ?? "");
    const [picture, setPicture] = useState<PictureState>({ kind: "unchanged" });
    const [availability, setAvailability] = useState<UsernameAvailability>({ status: "idle" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        if (!me) return;
        const trimmed = username.trim();

        if (trimmed === me.username) {
            setAvailability({ status: "idle" });
            return;
        }

        if (trimmed.length === 0) {
            setAvailability({
                status: "invalid",
                message: "Username can't be empty",
            });
            return;
        }

        const parsed = usernameSchema.safeParse(trimmed);
        if (!parsed.success) {
            setAvailability({
                status: "invalid",
                message: "4 to 15 characters, letters, numbers and underscores only",
            });
            return;
        }

        setAvailability({ status: "checking" });
        const myRequestId = ++requestIdRef.current;

        const handle = setTimeout(async () => {
            try {
                const { available } = await checkUsernameAvailable(trimmed);
                if (myRequestId !== requestIdRef.current) return;
                setAvailability({ status: available ? "available" : "taken" });
            } catch (e) {
                if (myRequestId !== requestIdRef.current) return;
                console.error(e);
                setAvailability({ status: "error" });
            }
        }, AVAILABILITY_DEBOUNCE_MS);

        return () => clearTimeout(handle);
    }, [username, me]);

    const trimmedName = displayName.trim();
    const trimmedUsername = username.trim();

    const displayNameChanged = me != null && trimmedName !== me.displayName;
    const usernameChanged = me != null && trimmedUsername !== me.username;
    const pictureChanged = picture.kind !== "unchanged";

    const hasChanges = displayNameChanged || usernameChanged || pictureChanged;

    usePreventRemove(hasChanges && !saving, ({ data }: { data: { action: any } }) => {
        Alert.alert(
            "Discard changes?",
            "Your changes haven't been saved yet.",
            [
                { text: "Keep editing", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => navigation.dispatch(data.action),
                },
            ]
        );
    });

    if (!me) return null;

    const displayNameValid = trimmedName.length >= 1 && trimmedName.length <= 255;
    const usernameValid =
        !usernameChanged || availability.status === "available";
    const isUsernameChecking = availability.status === "checking";

    const canSave = hasChanges && displayNameValid && usernameValid && !isUsernameChecking && !saving;

    const previewPictureUrl =
        picture.kind === "new"
            ? picture.localUri
            : picture.kind === "removed"
            ? null
            : me.pictureUrl ?? null;

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
        setPicture({ kind: "new", localUri: result.assets[0].uri });
    }

    function onRemovePicture() {
        if (saving) return;
        setPicture({ kind: "removed" });
    }

    async function uploadPicture(localUri: string): Promise<string> {
        const ext = extensionFromUri(localUri);
        if (!ext) throw new Error("Unsupported image format");

        const { uploadUrl, publicUrl } = await getProfilePictureUploadUrl(ext);
        const fileRes = await fetch(localUri);
        const blob = await fileRes.blob();

        const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentTypeForExtension(ext) },
            body: blob,
        });

        if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
        return publicUrl;
    }

    async function onSave() {
        if (!canSave) return;
        setSaving(true);
        setError(null);

        try {
            const updates: {
                username?: string;
                displayName?: string;
                pictureUrl?: string | null;
            } = {};

            if (displayNameChanged) updates.displayName = trimmedName;
            if (usernameChanged) updates.username = trimmedUsername;
            if (picture.kind === "new") {
                updates.pictureUrl = await uploadPicture(picture.localUri);
            } else if (picture.kind === "removed") {
                updates.pictureUrl = null;
            }

            const { user } = await updateMe(updates);
            setMe(user);
            setPicture({ kind: "unchanged" });
            router.back();
        } catch (e: any) {
            console.error(e);
            const msg = (e?.message ?? "").toLowerCase();
            if (msg.includes("username")) {
                setError("That username was just taken - please try another");
                setAvailability({ status: "taken" });
            } else {
                setError("Something went wrong - please try again");
            }
        } finally {
            setSaving(false);
        }
    }

    const showPictureRemove =
        (picture.kind === "unchanged" && me.pictureUrl) || picture.kind === "new";

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={-(insets.bottom + spacing.lg)}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View 
                   style={[
                        styles.container,
                        {
                            paddingBottom: insets.bottom + spacing.lg,
                        },
                    ]}
                >
                    <ScreenHeader
                        title="Edit profile"
                        showBack
                    />

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[
                            styles.content,
                            { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.lg },
                        ]}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.avatarWrap}>
                            <Pressable
                                onPress={onPickImage}
                                disabled={saving}
                                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                            >
                                <Avatar
                                    name={displayName || me.displayName}
                                    size={AVATAR_SIZE}
                                    imageUrl={previewPictureUrl}
                                    userId={me.id}
                                />
                            </Pressable>

                            <Pressable onPress={onPickImage} disabled={saving} style={{ marginTop: spacing.md }}>
                                <Text variant="bodyBold" color={colors.primary}>
                                    Change photo
                                </Text>
                            </Pressable>

                            {showPictureRemove && (
                                <Pressable
                                    onPress={onRemovePicture}
                                    disabled={saving}
                                    style={{ marginTop: spacing.xs }}
                                    hitSlop={8}
                                >
                                    <Text variant="caption" color={colors.textTertiary}>
                                        Remove photo
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        <View style={{ marginTop: spacing.xl }}>
                            <TextInputField
                                label="Display name"
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Your name"
                                autoCapitalize="words"
                                autoCorrect={false}
                                maxLength={255}
                                returnKeyType="next"
                                error={displayName.length > 0 && !displayNameValid}
                            />
                        </View>

                        <View style={{ marginTop: spacing.lg }}>
                            <TextInputField
                                value={username}
                                label="Username"
                                onChangeText={setUsername}
                                placeholder="username"
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={15}
                                returnKeyType="done"
                                error={
                                    usernameChanged &&
                                    (availability.status === "taken" ||
                                        availability.status === "invalid" ||
                                        availability.status === "error")
                                }
                                success={availability.status === "available"}
                                leftAdornment={
                                    <Text variant="body" color={colors.textTertiary} style={styles.at}>
                                        @
                                    </Text>
                                }
                                rightAdornment={
                                    <UsernameIcon availability={availability} colors={colors} />
                                }
                            />
                            <View style={{ minHeight: 20, marginTop: spacing.xs }}>
                                <UsernameMessage availability={availability} colors={colors} />
                            </View>
                        </View>

                        {error && (
                            <Text
                                variant="caption"
                                color={colors.error}
                                align="center"
                                style={{ marginTop: spacing.md }}
                            >
                                {error}
                            </Text>
                        )}
                    </ScrollView>

                    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
                        <Button
                            label={saving ? "Saving..." : "Save changes"}
                            onPress={onSave}
                            disabled={!canSave}
                        />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

function UsernameIcon({
    availability,
    colors,
}: {
    availability: UsernameAvailability;
    colors: any;
}) {
    if (availability.status === "checking") {
        return <Ionicons name="ellipsis-horizontal" size={20} color={colors.secondary} />;
    }
    if (availability.status === "available") {
        return <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />;
    }
    if (availability.status === "taken" || availability.status === "invalid") {
        return <Ionicons name="close-circle" size={20} color={colors.error} />;
    }
    return null;
}

function UsernameMessage({
    availability,
    colors,
}: {
    availability: UsernameAvailability;
    colors: any;
}) {
    switch (availability.status) {
        case "available":
            return (
                <Text variant="caption" color={colors.secondary}>
                    Available
                </Text>
            );
        case "taken":
            return (
                <Text variant="caption" color={colors.error}>
                    That username is already taken
                </Text>
            );
        case "invalid":
            return (
                <Text variant="caption" color={colors.error}>
                    {availability.message}
                </Text>
            );
        case "error":
            return (
                <Text variant="caption" color={colors.error}>
                    Couldn't check availability
                </Text>
            );
        case "checking":
            return (
                <Text variant="caption" color={colors.textTertiary}>
                    Checking...
                </Text>
            );
        default:
            return null;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingTop: 0,
    },
    avatarWrap: {
        alignItems: "center",
        marginTop: 16,
    },
    at: {
        fontSize: 16,
        fontWeight: "600",
    },
});
