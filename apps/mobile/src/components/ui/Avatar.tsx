import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { avatarPalette } from '../../theme';
import { Text } from './Text';
import stringHash from 'string-hash';

interface AvatarProps {
    name: string;
    size?: number;
    imageUrl?: string | null;
    userId?: string;  // used for deterministic color
}

function hashToIndex(str: string, len: number): number {
    return stringHash(str) % len;
}

function getInitial(name: string): string {
    return name
        .trim()
        .slice(0, 1)
        .toUpperCase();
}

export function Avatar({ name, size = 48, imageUrl, userId }: AvatarProps) {
    const colorKey = userId ?? name;
    const bgColor = avatarPalette[hashToIndex(colorKey, avatarPalette.length)];
    const initial = getInitial(name);
    const fontSize = Math.round(size * 0.38);

    if (imageUrl) {
        return (
            <Image
                source={{ uri: imageUrl }}
                style={[
                    styles.image,
                    { width: size, height: size, borderRadius: size / 2 },
                ]}
            />
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: bgColor,
                },
            ]}
        >
            <Text
                variant="body"
                color="#FFFFFF"
                style={{ fontSize, fontWeight: '700', letterSpacing: 0.5 }}
            >
                {initial}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        resizeMode: 'cover',
    },
});
