import type { Env } from "../env.js";

/** SMS sağlayıcı (NetGSM) yapılandırılmış mı? */
export function smsConfigured(env: Env): boolean {
  return Boolean(env.NETGSM_USERNAME && env.NETGSM_PASSWORD && env.NETGSM_HEADER);
}

/**
 * NetGSM REST v2 ile tek SMS gönderir. Sağlayıcı yapılandırılmamışsa false döner
 * (çağıran taraf dev kodu fallback'ine düşer). Ağ/hata durumunda da false.
 */
export async function sendSms(env: Env, phone: string, message: string): Promise<boolean> {
  if (!smsConfigured(env)) return false;
  const no = phone.replace(/^\+/, ""); // NetGSM 90XXXXXXXXXX bekler
  const auth = btoa(`${env.NETGSM_USERNAME}:${env.NETGSM_PASSWORD}`);
  try {
    const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({
        msgheader: env.NETGSM_HEADER,
        encoding: "TR",
        messages: [{ msg: message, no }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({}))) as { code?: string };
    // 00: gönderildi, 01/02: kuyruğa alındı → başarı say.
    return data.code === "00" || data.code === "01" || data.code === "02";
  } catch {
    return false;
  }
}
