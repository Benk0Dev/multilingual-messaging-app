import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { signUp, startSignIn, finishSignIn, finishFirstSignIn, logout } from "../../../src/auth/authService";
import { getMe } from "../../../src/api/users";
import { Language } from "@app/shared-types/enums";

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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontWeight: "600" }}>Dev Auth Test</Text>

      <TextInput placeholder="email" value={email} onChangeText={setEmail} autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />

      <TextInput placeholder="username" value={username} onChangeText={setUsername} autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />

      <TextInput placeholder="displayName" value={displayName} onChangeText={setDisplayName}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />

      <TextInput placeholder="preferredLang (en)" value={preferredLang} onChangeText={setPreferredLang} autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />

      <Pressable
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        onPress={async () => {
          try {
            await signUp({ email, username });
            setOut("User signed up");
          } catch (e: any) {
            setOut(String(e.message ?? e));
          }
        }}
      >
        <Text>Sign Up and Create User</Text>
      </Pressable>

      <Pressable
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        onPress={async () => {
          try {
            const res = await startSignIn({ identifier: username });
            setSession(res.session ?? "");
            setOut(JSON.stringify(res, null, 2));
          } catch (e: any) {
            setOut(String(e.message ?? e));
          }
        }}
      >
        <Text>Start Sign-in (send OTP)</Text>
      </Pressable>

      <TextInput placeholder="code (OTP)" value={code} onChangeText={setCode} autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />

      <Pressable
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        onPress={async () => {
          try {
            await finishSignIn({ identifier: username, session, code });
            setOut("User signed in");
          } catch (e: any) {
            setOut(String(e.message ?? e));
          }
        }}
      >
        <Text>Finish Sign-in</Text>
      </Pressable>

      <Pressable
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        onPress={async () => {
          try {
            await finishFirstSignIn({ identifier: username, session, code, displayName, preferredLang: preferredLang as Language });
            setOut("User signed in and created");
          } catch (e: any) {
            setOut(String(e.message ?? e));
          }
        }}
      >
        <Text>Finish First Sign-in</Text>
      </Pressable>

      <Pressable
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        onPress={async () => {
          await logout();
          setOut("Logged out");
            }}
        >
            <Text>Logout</Text>
        </Pressable>

        <Pressable
          style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
          onPress={async () => {
            const me = await getMe();
            setOut(JSON.stringify(me, null, 2));
          }}
        >
          <Text>Get Me</Text>
        </Pressable>
        <Text style={{ marginTop: 10, fontFamily: "Courier" }}>{out}</Text>
      </ScrollView>
    </View>
  );
}