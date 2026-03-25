import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { signUp, startSignIn, finishSignIn, finishFirstSignIn, logout } from "../../../src/auth/authService";
import { getMe } from "../../../src/api/users";
import { LanguageCode } from "@app/shared-types/enums";

const fieldStyle = { borderWidth: 1, padding: 10, borderRadius: 8 };
const labelStyle = { fontSize: 12, fontWeight: "600" as const, marginBottom: 4, color: "#374151" };

function Field({ label, value, onChangeText, ...rest }: { label: string; value: string; onChangeText: (t: string) => void } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={labelStyle}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={fieldStyle} {...rest} />
    </View>
  );
}

function Btn({ title, onPress, color }: { title: string; onPress: () => void; color: string }) {
  const isLight = color === "#6b7280" || color === "#9ca3af";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: color,
        padding: 12,
        borderRadius: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: isLight ? "#111" : "#fff", fontWeight: "600", textAlign: "center" }}>{title}</Text>
    </Pressable>
  );
}

export default function DevAuthTest() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [preferredLang, setPreferredLang] = useState("");
  const [session, setSession] = useState("");
  const [code, setCode] = useState("");
  const [out, setOut] = useState("");

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Field label="Username (required for sign in)" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Field label="Display name" value={displayName} onChangeText={setDisplayName} />
        <Field label="Preferred language (e.g. en)" value={preferredLang} onChangeText={setPreferredLang} autoCapitalize="none" />
        <Field label="Code (OTP)" value={code} onChangeText={setCode} autoCapitalize="none" />

        <View style={{ marginTop: 8, gap: 10 }}>
          <Btn
            title="Sign up and create user"
            color="#22c55e"
            onPress={async () => {
              try {
                await signUp({ email, username });
                setOut("User signed up");
              } catch (e: any) {
                setOut(String(e.message ?? e));
              }
            }}
          />
          <Btn
            title="Finish first signin"
            color="#22c55e"
            onPress={async () => {
              try {
                await finishFirstSignIn({ identifier: username, session, code, displayName, preferredLang: preferredLang as LanguageCode });
                setOut("User signed in and created");
              } catch (e: any) {
                setOut(String(e.message ?? e));
              }
            }}
          />

          <Btn
            title="Start sign in (send OTP)"
            color="#3b82f6"
            onPress={async () => {
              try {
                const res = await startSignIn({ identifier: username });
                setSession(res.session ?? "");
                setOut(JSON.stringify(res, null, 2));
              } catch (e: any) {
                setOut(String(e.message ?? e));
              }
            }}
          />
          <Btn
            title="Finish sign in"
            color="#3b82f6"
            onPress={async () => {
              try {
                await finishSignIn({ identifier: username, session, code });
                setOut("User signed in");
              } catch (e: any) {
                setOut(String(e.message ?? e));
              }
            }}
          />

          <Btn
            title="Logout"
            color="#ef4444"
            onPress={async () => {
              await logout();
              setOut("Logged out");
            }}
          />

          <Btn
            title="Get me"
            color="#9ca3af"
            onPress={async () => {
              const me = await getMe();
              setOut(JSON.stringify(me, null, 2));
            }}
          />
          <Btn title="Go to chats" color="#9ca3af" onPress={() => router.replace("/(app)/chats")} />
        </View>

        {out ? <Text style={{ marginTop: 20, fontFamily: "Courier", fontSize: 12 }}>{out}</Text> : null}
      </ScrollView>
    </View>
  );
}
