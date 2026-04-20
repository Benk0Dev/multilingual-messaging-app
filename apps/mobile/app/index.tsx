import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/src/theme";

export default function IndexScreen() {
    const { colors } = useTheme();

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}
