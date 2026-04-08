import React, { useEffect, useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const SEND_BTN_SIZE = 36;

interface MessageInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    isSending?: boolean;
}

export function MessageInput({
    value,
    onChangeText,
    onSend,
    isSending = false,
}: MessageInputProps) {
    const { colors, radii, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const canSend = value.trim().length > 0 && !isSending;

    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: canSend ? 1 : 0,
            useNativeDriver: false,
            friction: 8,
            tension: 160,
        }).start();
    }, [canSend]);

    const inputMarginRight = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SEND_BTN_SIZE + spacing.sm],
    });

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.bg,
                    paddingBottom: insets.bottom || 8,
                },
            ]}
        >
            <Animated.View style={{ flex: 1, marginRight: inputMarginRight }}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                            borderRadius: radii.pill,
                            color: colors.textPrimary,
                        },
                    ]}
                    selectionColor={colors.primary}
                />
            </Animated.View>
            <Animated.View
                style={[
                    styles.sendButtonWrap,
                    {
                        transform: [{ scale: anim }],
                        opacity: anim,
                        bottom: (insets.bottom || 8) + 1,
                    },
                ]}
                pointerEvents={canSend ? 'auto' : 'none'}
            >
                <Pressable
                    onPress={onSend}
                    style={({ pressed }) => [
                        styles.sendButton,
                        {
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.85 : 1,
                        },
                    ]}
                >
                    <Feather name="send" size={18} color="#FFFFFF" />
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 10,
        paddingTop: 6,
    },
    input: {
        minHeight: 36,
        maxHeight: 120,
        borderWidth: 0.5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 15,
        lineHeight: 22,
    },
    sendButtonWrap: {
        position: 'absolute',
        right: 10,
    },
    sendButton: {
        width: SEND_BTN_SIZE,
        height: SEND_BTN_SIZE,
        borderRadius: SEND_BTN_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
