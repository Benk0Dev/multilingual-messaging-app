import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SimpleScreenHeaderProps {
    title: string;
}

export function SimpleScreenHeader({ title }: SimpleScreenHeaderProps) {
    const { spacing } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.header,
            {
                paddingHorizontal: spacing.lg,
                paddingTop: insets.top + spacing.sm,
                paddingBottom: spacing.md,
            }
        ]}>
            <Text variant="screenTitle">{title}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        width: "100%",
    },
});