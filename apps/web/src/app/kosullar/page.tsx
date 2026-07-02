import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "Satıyo kullanım koşulları — platformu kullanırken uymanız gereken kurallar ve tarafların hak ve yükümlülükleri.",
  alternates: { canonical: "/kosullar" },
};

export default function KosullarPage() {
  return (
    <LegalShell title="Kullanım Koşulları" updated="2 Temmuz 2026">
      <p>
        Bu koşullar, Satıyo ("Platform") hizmetlerini kullanımınızı düzenler. Platformu kullanarak bu koşulları kabul etmiş olursunuz.
        Kabul etmiyorsanız lütfen Platformu kullanmayın.
      </p>

      <h2>1. Hesap ve uygunluk</h2>
      <ul>
        <li>Hizmeti kullanmak için 18 yaşında veya daha büyük olmalısınız.</li>
        <li>Kayıt sırasında doğru ve güncel bilgi vermelisiniz. Hesabınızın güvenliğinden siz sorumlusunuz.</li>
        <li>Bir telefon numarası tek hesapla ilişkilendirilir.</li>
      </ul>

      <h2>2. Platformun rolü</h2>
      <p>
        Satıyo, kullanıcıların ikinci-el ürünlerini yayınlayıp iletişime geçtiği bir <strong>ilan ve buluşturma platformudur</strong>.
        Satıcı veya alıcı değiliz; ilan içeriğinin, ürünün ve alışverişin tarafı değiliz. Ürünlerin doğruluğu, kalitesi, yasallığı ve
        alışverişin tamamlanması tamamen kullanıcıların sorumluluğundadır.
      </p>

      <h2>3. İlan kuralları ve yasaklı içerik</h2>
      <ul>
        <li>Yanıltıcı, sahte, mükerrer veya yanlış kategoride ilan yasaktır.</li>
        <li>Yasa dışı ürün/hizmetler; silah, uyuşturucu, çalıntı mal, taklit ürün, canlı hayvan istismarı, yetişkin içerik ve mevzuatça yasak her şey yasaktır.</li>
        <li>Başkasının fikri mülkiyet haklarını ihlal eden içerik yayınlayamazsınız.</li>
        <li>Spam, dolandırıcılık ve platform dışına yönlendiren istismar amaçlı davranış yasaktır.</li>
      </ul>

      <h2>4. Güvenli alışveriş</h2>
      <p>
        <strong>Kapora/ön ödeme göndermeyin.</strong> Alışverişi mümkünse yüz yüze, kalabalık ve güvenli bir yerde yapın. Ürünü görmeden ödeme yapmanız
        önerilmez. Satıyo, kullanıcılar arası uyuşmazlık veya zarardan sorumlu tutulamaz.
      </p>

      <h2>5. Ücretli hizmetler</h2>
      <p>İlan yayınlamak ücretsizdir. Öne çıkarma (boost) ve mağaza/kurumsal üyelik gibi bazı hizmetler ücretlidir; ücretler ödeme adımında açıkça belirtilir.</p>

      <h2>6. Fikri mülkiyet</h2>
      <p>Satıyo adı, logosu, tasarımı ve yazılımı Platform'a aittir. İlan içeriğiniz size ait olup, yayınlamakla Platformda görüntülenmesi için gerekli kullanım hakkını bize verirsiniz.</p>

      <h2>7. Sorumluluğun sınırlanması</h2>
      <p>Platform "olduğu gibi" sunulur. Yürürlükteki hukukun izin verdiği azami ölçüde, kullanıcılar arası işlemlerden, ilan içeriklerinden veya hizmet kesintilerinden doğan dolaylı zararlardan sorumlu değiliz.</p>

      <h2>8. Askıya alma ve fesih</h2>
      <p>Bu koşulları veya yasaları ihlal eden hesapları uyarısız askıya alabilir veya kapatabiliriz. Hesabınızı dilediğiniz zaman kapatabilirsiniz.</p>

      <h2>9. Uygulanacak hukuk</h2>
      <p>Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda Türkiye mahkemeleri ve icra daireleri yetkilidir.</p>

      <h2>10. Değişiklikler</h2>
      <p>Bu koşulları güncelleyebiliriz. Güncel sürüm bu sayfada yayımlanır; kullanmaya devam etmeniz güncel koşulları kabul ettiğiniz anlamına gelir.</p>
    </LegalShell>
  );
}
