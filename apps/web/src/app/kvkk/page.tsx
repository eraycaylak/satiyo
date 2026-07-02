import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "6698 sayılı KVKK kapsamında Satıyo kişisel verilerin işlenmesine ilişkin aydınlatma metni.",
  alternates: { canonical: "/kvkk" },
};

export default function KvkkPage() {
  return (
    <LegalShell title="KVKK Aydınlatma Metni" updated="2 Temmuz 2026">
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla Satıyo tarafından kişisel
        verilerinizin işlenmesine ilişkin olarak sizi aydınlatmak isteriz.
      </p>

      <h2>1. Veri sorumlusu</h2>
      <p>Satıyo (satiyo.app). İletişim: <a href="mailto:destek@satiyo.app">destek@satiyo.app</a></p>

      <h2>2. İşlenen kişisel veriler ve amaçları</h2>
      <ul>
        <li><strong>Kimlik/iletişim (telefon, ad):</strong> hesap oluşturma ve OTP ile kimlik doğrulama.</li>
        <li><strong>İlan ve işlem verileri:</strong> ilan yayınlama, arama, öneri ve alıcı-satıcı buluşturma.</li>
        <li><strong>Konum (şehir/ilçe):</strong> yakın ilanları göstermek.</li>
        <li><strong>Mesaj içerikleri:</strong> kullanıcılar arası iletişim ve güvenlik.</li>
        <li><strong>İşlem güvenliği/log verileri:</strong> dolandırıcılık önleme, güvenlik ve yasal yükümlülük.</li>
      </ul>

      <h2>3. İşlemenin hukuki sebepleri</h2>
      <p>Verileriniz KVKK m.5 uyarınca; bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması, hukuki yükümlülüğün yerine getirilmesi, temel hak ve özgürlüklerinize zarar vermemek kaydıyla meşru menfaat ve gereken hâllerde açık rıza hukuki sebeplerine dayanılarak işlenir.</p>

      <h2>4. Aktarım</h2>
      <p>Verileriniz; barındırma/altyapı (Cloudflare), SMS ve ödeme hizmet sağlayıcıları ile yalnızca hizmetin sunulması amacıyla ve yasal olarak yetkili kamu kurum/kuruluşlarıyla mevzuatın gerektirdiği ölçüde paylaşılabilir. Sağlayıcıların bir kısmı yurt dışında olabilir; aktarımlar KVKK'ya uygun yürütülür.</p>

      <h2>5. Toplama yöntemi</h2>
      <p>Kişisel verileriniz; web sitesi ve mobil uygulama üzerinden elektronik ortamda, sizin beyanınız ve platform kullanımınız aracılığıyla toplanır.</p>

      <h2>6. Haklarınız (KVKK m.11)</h2>
      <p>Kişisel verilerinizin işlenip işlenmediğini öğrenme; işlenmişse buna ilişkin bilgi talep etme; işleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme; eksik/yanlış işlenmişse düzeltilmesini; şartları oluştuğunda silinmesini/yok edilmesini; işlemenin hukuka aykırılığı hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.</p>
      <p>Taleplerinizi <a href="mailto:destek@satiyo.app">destek@satiyo.app</a> adresine iletebilirsiniz. Başvurularınız KVKK'da öngörülen sürede sonuçlandırılır.</p>
    </LegalShell>
  );
}
