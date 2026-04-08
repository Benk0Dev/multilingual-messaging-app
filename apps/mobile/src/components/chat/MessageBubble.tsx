import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { ReceiptIcon, type ReceiptStatus } from './ReceiptIcon';
import { formatTime } from '@/src/utils/dateFormat';
import { Ionicons } from '@expo/vector-icons';

const TAIL_W = 10;
const TAIL_H = 14;

function BubbleTail({
    color,
    sent,
    borderColor,
    borderWidth = 0,
}: {
    color: string;
    sent: boolean;
    borderColor?: string;
    borderWidth?: number;
}) {
    return (
        <View
            style={[
                styles.tailWrap,
                sent
                    ? { right: -TAIL_W }
                    : { left: -TAIL_W, bottom: -borderWidth },
            ]}
        >
            <Svg
                width={TAIL_W}
                height={TAIL_H}
                viewBox="0 0 10 14"
                style={sent ? undefined : { transform: [{ scaleX: -1 }] }}
            >
                <Path d="M0 0H10V14H0V0ZM0 0C0.15 4.8 2.1 8.9 10 14V0H0Z" fill={color} />
                {borderColor && borderWidth > 0 && (
                    <>
                        <Path
                            d="M0 0C0.15 4.8 2.1 8.9 10 14"
                            fill="none"
                            stroke={borderColor}
                            strokeWidth={borderWidth * 1.25}
                            strokeLinejoin="round"
                        />
                        <Line
                            x1="0"
                            y1="14"
                            x2="10"
                            y2="14"
                            stroke={borderColor}
                            strokeWidth={borderWidth * 2.25}
                            strokeLinecap="round"
                        />
                    </>
                )}
            </Svg>
        </View>
    );
}


interface MessageBubbleProps {
    sent: boolean;
    text: string;  // Main body text (translated if available, otherwise original)
    originalText?: string | null;  // Original-language text shown as italic subtext above
    time: Date;
    receiptStatus?: ReceiptStatus;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
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
    isPending = false,
    showOriginal = true,
    onLongPress,
}: MessageBubbleProps) {
    const { colors, radii, spacing } = useTheme();

    const r = radii.bubble;
    const showTail = isLastInGroup;

    const borderRadius = sent
        ? {
            borderTopLeftRadius: r,
            borderTopRightRadius: r,
            borderBottomRightRadius: showTail ? 0 : r,
            borderBottomLeftRadius: r,
        }
        : {
            borderTopLeftRadius: r,
            borderTopRightRadius: r,
            borderBottomRightRadius: r,
            borderBottomLeftRadius: showTail ? 0 : r,
        };

    const bubbleBg = sent ? colors.sentBubble : colors.receivedBubble;
    const bubbleBorder = sent ? undefined : colors.receivedBorder;
    const mainTextColor = sent ? colors.textOnPrimary : colors.textPrimary;
    const subtextColor = sent ? colors.textOnPrimaryMuted : colors.textTertiary;
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
                    marginTop: isFirstInGroup ? spacing.sm : spacing.xxs,
                    opacity: isPending ? 0.7 : 1,
                    // Reserve space for the tail
                    paddingRight: sent ? TAIL_W : 0,
                    paddingLeft: !sent ? TAIL_W : 0,
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
                {showTail && (
                    <BubbleTail
                        color={bubbleBg}
                        sent={sent}
                        borderColor={bubbleBorder}
                        borderWidth={bubbleBorder ? 0.5 : 0}
                    />
                )}

                {hasTranslation && (
                    <View style={styles.translation}>
                        <Ionicons name="language" size={11} color={subtextColor} style={{ marginTop: 2 }} />
                        <Text
                            variant="caption"
                            color={subtextColor}
                            style={{ marginBottom: spacing.xs }}
                        >
                            {originalText}
                        </Text>
                    </View>
                )}

                <View style={styles.textRow}>
                    <Text variant="body" color={mainTextColor}>
                        {text}
                        <Text style={{ fontSize: 10, color: 'transparent' }}>
                            {spacer}
                        </Text>
                    </Text>
                    <View style={styles.meta}>
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
        position: 'relative',
    },
    tailWrap: {
        position: 'absolute',
        bottom: 0,
        zIndex: 1,
    },
    bubble: {
        paddingHorizontal: 10,
        paddingTop: 6,
        paddingBottom: 8,
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
    translation: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 3,
    },
});
