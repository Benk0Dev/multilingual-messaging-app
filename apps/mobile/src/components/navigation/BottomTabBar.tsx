import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';

type Tab = 'chats' | 'settings';

interface BottomTabBarProps {
    active: Tab;
    onTabPress: (tab: Tab) => void;
    userDisplayName?: string;
    userImageUrl?: string | null;
    userId?: string;
}

export function BottomTabBar({
    active,
    onTabPress,
    userDisplayName = '?',
    userImageUrl,
    userId,
}: BottomTabBarProps) {
    const { colors, avatarSizes } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
        style={[
            styles.bar,
            {
                backgroundColor: colors.navBg,
                borderTopColor: colors.navBorder,
                paddingBottom: Math.max(insets.bottom, 4),
            },
        ]}
        >
        <Pressable
            onPress={() => onTabPress('chats')}
            style={styles.tab}
        >
            <Ionicons
                name={active === 'chats' ? 'chatbubbles' : 'chatbubbles-outline'}
                size={22}
                color={active === 'chats' ? colors.primary : colors.textSecondary}
            />
            <Text
                variant="navLabel"
                color={active === 'chats' ? colors.primary : colors.textSecondary}
            >
                Chats
            </Text>
        </Pressable>

        <Pressable
            onPress={() => onTabPress('settings')}
            style={styles.tab}
        >
            <View
                style={[
                    styles.avatarRing,
                    {
                        borderColor: active === 'settings' ? colors.primary : 'transparent',
                    },
                ]}
            >
            <Avatar
                name={userDisplayName}
                size={avatarSizes.xs}
                imageUrl={userImageUrl}
                userId={userId}
            />
            </View>
            <Text
                variant="navLabel"
                color={active === 'settings' ? colors.primary : colors.textSecondary}
            >
                Settings
            </Text>
        </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        borderTopWidth: 0.5,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 4,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flex: 1,
    },
    avatarRing: {
        borderWidth: 2,
        borderRadius: 14,
        padding: 1,
    },
});
