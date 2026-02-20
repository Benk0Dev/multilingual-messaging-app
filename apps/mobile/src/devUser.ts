import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "DEV_USER_ID";

export async function getDevUserId() {
    return AsyncStorage.getItem(KEY);
}

export async function setDevUserId(userId: string) {
    await AsyncStorage.setItem(KEY, userId);
}

export async function clearDevUserId() {
    await AsyncStorage.removeItem(KEY);
}