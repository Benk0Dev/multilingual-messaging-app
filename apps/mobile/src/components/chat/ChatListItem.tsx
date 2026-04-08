import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';
import { formatChatListDate } from '@/src/utils/dateFormat';

interface ChatListItemProps {
    name: string;
    userId: string;
    imageUrl?: string | null;
    lastMessage: string;
    time: Date | null;
    unreadCount: number;
    onPress: () => void;
}

export function ChatListItem({
    name,
    userId,
    imageUrl,
    lastMessage,
    time,
    unreadCount,
    onPress,
}: ChatListItemProps) {
    const { colors, spacing, avatarSizes } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    paddingHorizontal: spacing.lg,
                    paddingVertical: 10,
                    backgroundColor: pressed ? colors.primarySubtle : 'transparent',
                },
            ]}
        >
        <Avatar name={name} size={avatarSizes.lg} imageUrl={imageUrl} userId={userId} />

        <View style={styles.content}>
            <View style={styles.topRow}>
                <Text variant="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
                    {name}
                </Text>
                {time && (
                    <Text
                    variant="caption"
                    color={unreadCount > 0 ? colors.primary : colors.textTertiary}
                    >
                        {formatChatListDate(time)}
                    </Text>
                )}
            </View>

            <View style={styles.bottomRow}>
                <Text
                    variant="secondary"
                    color={colors.textSecondary}
                    numberOfLines={1}
                    style={{ flex: 1, marginRight: spacing.sm }}
                >
                    {lastMessage}
                </Text>
                {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '700' }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
            </View>
        </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 2,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
