import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { ReceiptIcon, type ReceiptStatus } from './ReceiptIcon';
import { formatTime } from '@/src/utils/dateFormat';
import { Ionicons } from '@expo/vector-icons';

// Detects RTL scripts (e.g. Arabic, Hebrew, etc.)
const RTL_REGEX = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

function isRtlText(s: string | null | undefined): boolean {
    return !!s && RTL_REGEX.test(s);
}

interface MessageBubbleProps {
    sent: boolean;
    text: string;  // Main body text (translated if available, otherwise original)
    originalText?: string | null;  // Original-language text shown as italic subtext above
    time: Date;
    receiptStatus?: ReceiptStatus;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    isFirstInTimeGroup: boolean;
    isPending?: boolean;
    showOriginal?: boolean;
    onLongPress?: () => void;
}

export function MessageBubble({
    sent,
    text,
    originalText,
    time,
    receiptStatus,
    isFirstInGroup,
    isLastInGroup,
    isFirstInTimeGroup,
    isPending = false,
    showOriginal = true,
    onLongPress,
}: MessageBubbleProps) {
    const { colors, radii, spacing } = useTheme();

    const isMainRtl = isRtlText(text);
    const isOriginalRtl = isRtlText(originalText);

    const lg = radii.bubble;
    const sm = radii.bubbleJoint;

    const borderRadius = sent
        ? {
            borderTopLeftRadius: lg,
            borderTopRightRadius: isFirstInGroup ? lg : sm,
            borderBottomRightRadius: isLastInGroup ? lg : sm,
            borderBottomLeftRadius: lg,
        }
        : {
            borderTopLeftRadius: isFirstInGroup ? lg : sm,
            borderTopRightRadius: lg,
            borderBottomRightRadius: lg,
            borderBottomLeftRadius: isLastInGroup ? lg : sm,
        };

    const bubbleBg = sent ? colors.sentBubble : colors.receivedBubble;
    const bubbleBorder = sent ? undefined : colors.receivedBorder;
    const mainTextColor = sent ? colors.textOnPrimary : colors.textPrimary;
    const subtextColor = sent ? colors.textOnPrimaryMuted : colors.textSecondary;
    const timeColor = sent ? colors.textOnPrimaryMuted : colors.textTertiary;

    const hasTranslation = Boolean(originalText) && showOriginal;

    const spacer = sent && receiptStatus
        ? ' \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'
        : ' \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

    return (
        <Pressable
            onLongPress={onLongPress}
            style={[
                styles.wrapper,
                {
                    alignSelf: sent ? 'flex-end' : 'flex-start',
                    marginTop: isFirstInTimeGroup ? spacing.sm : spacing.xxs,
                    opacity: isPending ? 0.7 : 1,
                },
            ]}
        >
            <View
                style={[
                    styles.bubble,
                    borderRadius,
                    {
                        backgroundColor: bubbleBg,
                        borderWidth: bubbleBorder ? 0.5 : 0,
                        borderColor: bubbleBorder,
                    },
                ]}
            >
                {hasTranslation && (
                    <View style={styles.translation}>
                        <Ionicons name="language" size={11} color={subtextColor} style={{ marginTop: 2 }} />
                        <Text
                            variant="caption"
                            color={subtextColor}
                            style={[
                                { marginBottom: spacing.xs, flex: 1 },
                                isOriginalRtl && styles.rtlText,
                            ]}
                        >
                            {originalText}
                        </Text>
                    </View>
                )}

                <View style={styles.textRow}>
                    <Text
                        variant="body"
                        color={mainTextColor}
                        style={isMainRtl ? styles.rtlText : undefined}
                    >
                        {text}
                        <Text style={{ fontSize: 10, color: 'transparent' }}>
                            {spacer}
                        </Text>
                    </Text>
                    <View style={[styles.meta, isMainRtl && styles.metaRtl]}>
                        <Text variant="caption" color={timeColor}>
                            {formatTime(time)}
                        </Text>
                        {sent && receiptStatus && (
                            <ReceiptIcon status={receiptStatus} />
                        )}
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        maxWidth: '78%',
    },
    bubble: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 9,
    },
    textRow: {
        position: 'relative',
    },
    meta: {
        position: 'absolute',
        bottom: -3,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    metaRtl: {
        right: undefined,
        left: 0,
        flexDirection: 'row-reverse',
    },
    translation: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 3,
        opacity: 0.5,
    },
    rtlText: {
        writingDirection: 'rtl',
        textAlign: 'right',
    },
});