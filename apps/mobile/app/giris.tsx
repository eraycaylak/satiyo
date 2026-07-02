import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { Badge, Button } from "@/components/ui";

export default function LoginScreen() {
  const t = useTheme();
  const router = useRouter();
  const { setSession } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const full = "+90" + phone.replace(/\D/g, "").slice(0, 10);
  const input = { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 13, color: t.text, fontSize: 16 };

  async function requestCode() {
    setError(null);
    if (phone.replace(/\D/g, "").length !== 10) return setError("10 haneli numara gir (5XX…)");
    setBusy(true);
    try { const r = await api.requestOtp(full); setDevCode(r.devCode ?? null); setStep("code"); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function verify() {
    setError(null); setBusy(true);
    try { const s = await api.verifyOtp(full, code.replace(/\D/g, "")); await setSession(s.token, s.user); router.back(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function devLogin() {
    setError(null); setBusy(true);
    try { const s = await api.devLogin(); await setSession(s.token, s.user); router.back(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: space.lg, gap: space.md }}>
      <Text style={{ fontSize: 26, fontWeight: "900", color: t.text }}>Satıyo'ya giriş</Text>
      <Text style={{ color: t.muted }}>Telefonunla saniyeler içinde giriş yap.</Text>

      {step === "phone" ? (
        <>
          <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Telefon (+90)</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="number-pad" placeholder="5XX XXX XX XX" placeholderTextColor={t.muted} style={input} />
          {error && <Text style={{ color: t.danger }}>{error}</Text>}
          <Button title="Kod gönder" onPress={requestCode} loading={busy} />
          {__DEV__ && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                <Text style={{ color: t.muted, fontSize: 12 }}>veya</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              </View>
              <Button title="🛠️ Numarasız dev giriş" variant="ghost" onPress={devLogin} loading={busy} />
              <Text style={{ color: t.muted, fontSize: 11, textAlign: "center" }}>Sadece geliştirmede görünür.</Text>
            </>
          )}
        </>
      ) : (
        <>
          <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>{full} numarasına gelen kod</Text>
          <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="••••••" placeholderTextColor={t.muted} style={[input, { letterSpacing: 8, textAlign: "center", fontSize: 22 }]} />
          {devCode && <Badge label={`Geliştirme kodu: ${devCode}`} tone="brand" />}
          {error && <Text style={{ color: t.danger }}>{error}</Text>}
          <Button title="Giriş yap" onPress={verify} loading={busy} disabled={code.replace(/\D/g, "").length < 6} />
          <Button title="← Numarayı değiştir" variant="ghost" onPress={() => setStep("phone")} />
        </>
      )}
    </View>
  );
}
