import { useTheme } from "./index";

export function useInputTheme() {
    const { colors } = useTheme();
    return {
        selectionColor: colors.primary,
        cursorColor: colors.primary,
        placeholderTextColor: colors.textTertiary,
    };
}
