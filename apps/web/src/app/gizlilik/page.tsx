import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Satıyo gizlilik politikası — kişisel verilerinizi nasıl topladığımız, kullandığımız ve koruduğumuz.",
  alternates: { canonical: "/gizlilik" },
};

export default function GizlilikPage() {
  return (
    <LegalShell title="Gizlilik Politikası" updated="2 Temmuz 2026">
      <p>
        Satıyo ("Platform", "biz"), <strong>satiyo.app</strong> web sitesi ve Satıyo mobil uygulaması aracılığıyla sunulan
        reklamsız, yerel odaklı ikinci-el ilan ve alışveriş hizmetini işletir. Bu politika; hangi kişisel verileri
        işlediğimizi, hangi amaçlarla ve nasıl koruduğumuzu açıklar. Platformu kullanarak bu politikayı kabul etmiş olursunuz.
      </p>

      <h2>1. İşlediğimiz veriler</h2>
      <ul>
        <li><strong>Hesap verileri:</strong> telefon numarası, görünen ad, profil bilgileri.</li>
        <li><strong>İlan verileri:</strong> yayınladığınız ilan başlığı, açıklama, fiyat, fotoğraflar, kategori ve öznitelikler.</li>
        <li><strong>Konum:</strong> yalnızca şehir/ilçe düzeyinde (ilanları yakınlığa göre göstermek için). Kesin GPS konumu zorunlu değildir.</li>
        <li><strong>Mesajlaşma:</strong> diğer kullanıcılarla yaptığınız yazışmalar ve teklifler.</li>
        <li><strong>Kullanım ve cihaz verileri:</strong> uygulama etkileşimleri, IP adresi, cihaz/tarayıcı türü, çerezler ve benzeri teknolojiler.</li>
      </ul>

      <h2>2. İşleme amaçları</h2>
      <ul>
        <li>Hesabınızı oluşturmak ve telefonla giriş (OTP) doğrulaması yapmak.</li>
        <li>İlanları yayınlamak, aramak, önermek ve alıcı-satıcıyı buluşturmak.</li>
        <li>Mesajlaşma, bildirim ve güvenlik/dolandırıcılık önleme.</li>
        <li>Öne çıkarma (boost) ve mağaza üyeliği gibi ücretli hizmetleri sunmak.</li>
        <li>Hizmeti iyileştirmek ve yasal yükümlülükleri yerine getirmek.</li>
      </ul>

      <h2>3. Hukuki sebepler (KVKK m.5)</h2>
      <p>
        Verileriniz; sözleşmenin kurulması/ifası, meşru menfaat, hukuki yükümlülük ve gerektiğinde açık rızanıza dayanılarak işlenir.
        Detaylı aydınlatma için <a href="/kvkk">KVKK Aydınlatma Metni</a>'ne bakın.
      </p>

      <h2>4. Veri aktarımı</h2>
      <p>Verilerinizi satmayız. Yalnızca hizmeti sunmak için gerekli olduğu ölçüde şu kategorilerle paylaşılabilir:</p>
      <ul>
        <li><strong>Barındırma/altyapı:</strong> Cloudflare (sunucu, veritabanı, depolama).</li>
        <li><strong>SMS sağlayıcı:</strong> OTP doğrulama kodu göndermek için.</li>
        <li><strong>Ödeme sağlayıcı:</strong> boost/mağaza ödemelerini işlemek için (kart verilerini biz saklamayız).</li>
        <li><strong>Yasal merciler:</strong> yürürlükteki mevzuat gerektirdiğinde.</li>
      </ul>
      <p>Bu sağlayıcıların bir kısmı yurt dışında bulunabilir; aktarım KVKK'ya uygun şekilde yapılır.</p>

      <h2>5. Saklama süresi</h2>
      <p>Verilerinizi hesabınız aktif olduğu sürece ve yasal saklama süreleri boyunca tutarız. Hesabınızı sildiğinizde, yasal zorunluluklar dışındaki verileriniz makul süre içinde silinir veya anonimleştirilir.</p>

      <h2>6. Güvenlik</h2>
      <p>Verileri korumak için şifreli bağlantı (HTTPS), erişim kontrolü ve endüstri standardı güvenlik önlemleri uygularız. Hiçbir yöntem %100 güvenli değildir; hesabınızın gizliliğini korumak sizin de sorumluluğunuzdadır.</p>

      <h2>7. Çerezler</h2>
      <p>Oturum yönetimi, tercih hatırlama (tema/dil) ve temel işlevsellik için çerez ve benzeri teknolojiler kullanırız. Tarayıcı ayarlarından çerezleri yönetebilirsiniz.</p>

      <h2>8. Haklarınız</h2>
      <p>KVKK m.11 kapsamında verilerinize erişme, düzeltme, silme ve işlemeye itiraz gibi haklarınız vardır. Talepleriniz için <a href="mailto:destek@satiyo.app">destek@satiyo.app</a> adresine yazabilirsiniz.</p>

      <h2>9. Çocuklar</h2>
      <p>Platform 18 yaş ve üzeri kullanıcılar içindir. 18 yaşından küçüklerden bilerek veri toplamayız.</p>

      <h2>10. Değişiklikler</h2>
      <p>Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde uygulama/web üzerinden bilgilendiririz. Güncel sürüm her zaman bu sayfada yer alır.</p>
    </LegalShell>
  );
}
