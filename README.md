# Mahjong Zamrud

Mahjong 13 kartu gaya Hong Kong untuk iPhone (dan browser lain): kamu melawan 3 bot — **Pak Agus** (agresif), **Pak Wawan** (seimbang), dan **Pak Roti** (hati-hati). HTML/CSS/JavaScript biasa, tanpa framework dan tanpa build step. Saldo memakai **Kecik**, mata uang mainan tanpa uang sungguhan.

Main: **https://juliusr5.github.io/mahyong/**

## Cara main singkat

- Tiap pemain memegang 13 kartu (bandar 14). Pada giliranmu ambil 1, buang 1.
- Ketuk kartu sekali untuk memilih (terangkat), ketuk lagi atau tekan **Buang** untuk membuang.
- Tombol **Chi / Pong / Kong / Hu / Lewati** hanya muncul kalau aksinya sah. Chi hanya dari pemain di kiri.
- Menang = 4 set + 1 pasang (atau Seven Pairs / Thirteen Orphans) dengan **minimal 3 fan**.
- Bayar: menang dari buangan → pembuang bayar 2× nilai dasar; zimo → tiap lawan bayar 1×. Tabel dasar: 3 fan = 8, 4 = 16, 5 = 24, 6 = 32, 7 = 48, 8 = 64, 9 = 96, 10 = 128 Kecik (diatur di `js/scoring.js`, `PAY_TABLE`).
- Nyalakan **Petunjuk** di Pengaturan untuk saran buangan, kartu yang ditunggu, dan peringatan kartu berbahaya. Daftar fan lengkap ada di menu **Bantuan**.

## Menjalankan secara lokal

Butuh Node.js 18+.

```powershell
node tools/serve.js
```

Buka http://localhost:8080. (Membuka `index.html` langsung lewat `file://` tidak bisa karena ES modules & Web Worker.)

Tes:

```powershell
node --test
```

Uji kekuatan bot (tanpa tampilan):

```powershell
node tools/sim.js 1000
```

Argumen: `[jumlah ronde] [seed] [iterasi Monte Carlo per keputusan]`.

## Mengaktifkan GitHub Pages

1. Push repo ini ke GitHub.
2. Buka repo → **Settings → Pages**.
3. Di **Branch** pilih `main` dan folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit; game tersedia di `https://<username>.github.io/<nama-repo>/`. Semua path relatif, jadi jalan di subfolder.

Setelah update, GitHub Pages menyimpan cache sampai ±10 menit. Kalau iPhone masih menampilkan versi lama, tutup tab lalu buka lagi beberapa menit kemudian.

## Pasang di iPhone (Add to Home Screen)

1. Buka link game di **Safari**.
2. Tekan tombol **Bagikan** (kotak dengan panah ke atas).
3. Pilih **Add to Home Screen / Tambahkan ke Layar Utama** → **Tambah**.
4. Buka dari ikon di layar utama: game terbuka layar penuh, dan tetap bisa dimainkan **offline** setelah dibuka sekali (service worker `sw.js`).

Catatan: Safari iOS tidak mendukung getar dari web, jadi getar hanya terasa di Android. Suara baru aktif setelah sentuhan pertama (aturan iOS).

## Struktur

```
index.html, style.css, manifest.json, sw.js
icons/        ikon buatan sendiri (tools/make-icons.js)
fonts/        Cormorant Garamond & Inter (lisensi OFL, file lisensi disertakan)
js/tiles.js   definisi kartu, dinding, pengocokan
js/hand.js    dekomposisi menang, shanten, ukeire
js/rules.js   alur ronde (state machine) & pertandingan
js/scoring.js fan & pembayaran (PAY_TABLE)
js/bot/       otak bot (brain.js), model bahaya (danger.js), Web Worker (worker.js)
js/ui.js, js/art.js   tampilan & gambar SVG kartu/avatar/koin
js/sound.js   efek suara Web Audio + getar
js/help.js    halaman bantuan & tutorial
js/storage.js localStorage (dibungkus try/catch)
tests/        tes node --test
tools/        server lokal, simulator bot, pembuat ikon
```

Efek suara dibuat langsung dengan Web Audio di `js/sound.js`, jadi folder `sounds/` tidak diperlukan.

## Otak bot

Bot hanya menerima `view` dari `Round.viewFor(seat)`: tangannya sendiri, semua buangan, set terbuka, bunga, dan sisa dinding. Bot tidak pernah memegang objek ronde, dan di browser berjalan di Web Worker yang hanya menerima data lewat `postMessage`, jadi secara teknis tidak bisa melihat tangan lawan atau urutan dinding.

- **Efisiensi:** shanten cepat (tabel per jenis dengan cache) dan ukeire dari kartu yang belum terlihat.
- **Nilai tangan:** EV per rencana (biasa, campur satu jenis, satu jenis murni, semua pong, Seven Pairs, Thirteen Orphans). Saat tenpai, fan tiap kartu tunggu dihitung tepat; tunggu yang < 3 fan tidak dihitung.
- **Klaim:** chi/pong/kong hanya kalau EV setelah klaim lebih tinggi dari EV tetap tertutup.
- **Membaca lawan:** peluang siap per lawan (jumlah buangan, set terbuka, perubahan pola buangan) dan peluang tiap jenis kartu jadi tunggu (buangan lawan, suji, kartu yang sudah habis terlihat, indikasi satu jenis / semua pong).
- **Serang vs bertahan:** skor = EV serangan − bobot × risiko kena tembak.
- **Monte Carlo (Sulit):** untuk keputusan yang selisihnya tipis, kartu yang belum terlihat diacak ratusan kali dalam batas ±300 ms di Web Worker.
- **Level:** Mudah (efisiensi dasar, sedikit salah acak, jarang bertahan, klaim sembarangan), Sedang (+ mengejar nilai tangan), Sulit (semua fitur).

## Hasil uji kekuatan bot

<!-- HASIL-SIM -->
