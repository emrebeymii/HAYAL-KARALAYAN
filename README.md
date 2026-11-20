# Hayal Karalayan | Dijital Sanat Müzesi

Burcu Arısoy'un 11 çalışmasını sunan, Cloudflare Pages üzerinde yayınlanan sanal sergi.

Canlı sergi: https://hayal-karalayan.pages.dev/

GitHub: https://github.com/emrebeymii/HAYAL-KARALAYAN

GitHub `main` dalına yapılan gönderimler Cloudflare Pages üzerinde otomatik yayınlanır.

## Deneyimler

- 3D müze (Three.js) ve telefonlar için klasik galeri yedeği
- 5 tematik salon: Mitler ve Karanlık, Baskı ve Desen, Çininin İzleri, Sessiz Nesneler, Düşsel Final
- Eser künyesi, açıklaması, büyük görüntü inceleme
- Sessiz rehberli tur: başlat, duraklat, devam et, durdur
- Mobilde azaltılmış render çözünürlüğü ve gölge bütçesi
- Hareket azaltma sistem tercihini destekler

## Yerelde çalıştırma

`python3 -m http.server 8000` ardından `http://localhost:8000/` adresini açın.

3D sürüm `cdn.jsdelivr.net` üzerinden Three.js v0.170.0 kullanır; bağlantı yoksa klasik galeri kullanılabilir. Kaynak kodda servis anahtarı, analitik veya izleme çerezi bulunmaz.

## Telif ve lisans

Kaynak kod MIT lisansı altındadır. **Burcu Arısoy'un eserlerinin görselleri MIT kapsamında değildir.** Görsellerin yeniden yayımlanması veya kullanılması için hak sahiplerinin izni gerekir. Bkz. [ARTWORK_RIGHTS.md](ARTWORK_RIGHTS.md).

## Katkılar ve doğrulama

Güvenlik denetimi: gizli anahtar taraması, JavaScript sözdizimi, URI/bağlantı kontrolleri. Mobil Safari / WebGL davranışı gerçek cihaz üzerinde ayrıca kontrol edilmelidir.
