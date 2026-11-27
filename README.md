# Mahjong Alung

Mahjong 13 kartu **gaya Singapura** untuk iPhone (dan browser lain): kamu melawan 3 bot — **Pak Agus** (agresif), **Pak Wawan** (seimbang), dan **Pak Roti** (hati-hati). HTML/CSS/JavaScript biasa, tanpa framework dan tanpa build step. Saldo memakai **Kecik**, mata uang mainan tanpa uang sungguhan.

Main: **https://juliusr5.github.io/mahyong/**

## Cara main singkat

- Tiap pemain memegang 13 kartu (bandar 14). Pada giliranmu ambil 1, buang 1.
- Ketuk kartu sekali untuk memilih (terangkat), ketuk lagi atau tekan **Buang** untuk membuang.
- Tombol **Chi / Bong / Kong / Hu / Lewati** hanya muncul kalau aksinya sah. Chi hanya dari pemain di kiri; **Hu boleh dari buangan pemain mana saja** (termasuk yang di kanan).
- Menang = 4 set + 1 pasang (atau Thirteen Orphans), batas 5 tai. Tangan lengkap tanpa tai tetap boleh menang sebagai **Chicken Hand** (dasar 2 Kecik). Seven Pairs tidak berlaku. 144 kartu, tanpa kartu hewan.
- Tai: bong naga / angin kursi / angin putaran 1 per set, bunga sesuai kursi 1 per kartu, semua chi 1, **Ping Hu** (semua chi tanpa bunga, pasangan biasa) 4, semua bong 2, campur satu jenis 2, satu jenis murni 4, tiga naga kecil / empat angin kecil 4, kartu terakhir / pengganti kong / merampok kong 1, tangan batas 5 (tiga naga besar, empat angin besar, semua kehormatan, Thirteen Orphans).
- Bayar: menang dari buangan → pembuang bayar 2× nilai dasar, dua pemain lain 1×; zimo → tiap lawan bayar 2×. Tabel dasar: Chicken Hand = 2, 1 tai = 4, 2 = 8, 3 = 16, 4 = 32, 5 = 64 Kecik (diatur di `js/scoring.js`, `PAY_TABLE`).
- Ketuk kartu mana pun (di tangan atau di meja) untuk melihat namanya. Nyalakan **Petunjuk** di Pengaturan untuk saran buangan, kartu yang ditunggu, dan peringatan kartu berbahaya. Daftar tai lengkap ada di menu **Bantuan**.

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

Argumen: `[jumlah ronde] [seed] [iterasi Monte Carlo per keputusan]`. Env opsional: `LINEUP=sulit,sedang,sulit,sedang` untuk adu langsung, `TUNE='{"sulit":{"defense":0.3}}'` untuk mencoba setelan.

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
js/scoring.js tai & pembayaran (PAY_TABLE)
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
- **Nilai tangan:** EV per rencana (biasa, campur satu jenis, satu jenis murni, semua bong, Thirteen Orphans). Saat tenpai, tai tiap kartu tunggu dihitung tepat; tunggu tanpa tai tidak dihitung.
- **Klaim:** chi/bong/kong hanya kalau EV setelah klaim lebih tinggi dari EV tetap tertutup.
- **Membaca lawan:** peluang siap per lawan (jumlah buangan, set terbuka, perubahan pola buangan) dan peluang tiap jenis kartu jadi tunggu (buangan lawan, suji, kartu yang sudah habis terlihat, indikasi satu jenis / semua bong).
- **Serang vs bertahan:** skor = EV serangan − bobot × risiko kena tembak.
- **Lihat dua langkah (Sulit):** saat kurang satu kartu untuk siap, tiap kartu yang mungkin diambil dicoba, lalu buangan terbaik berikutnya dan tai nyata tiap kartu tunggu dihitung.
- **Monte Carlo (Sulit):** untuk kandidat yang nyaris seimbang, kartu yang belum terlihat diacak ratusan kali dalam batas ±300 ms di Web Worker.
- **Level:** Mudah (efisiensi dasar, sedikit salah acak, jarang bertahan, klaim sembarangan), Sedang (efisiensi + mengejar nilai tangan, tanpa membaca lawan), Sulit (semua fitur).

## Mode Sulit (curang, atas permintaan)

Selain otak bot terkuat, mode Sulit sengaja diberi keunggulan:
- **Bot beruntung:** saat mengambil kartu, tiap bot punya peluang 50% mendapat kartu terbaik dari 8 kartu teratas dinding (`round.luck` di `js/main.js`).
- **Bot pengintip:** tiap ronde satu bot acak tahu tanganmu dan tangan satu bot lain.

Bot tidak bekerja sama satu sama lain. Uji 600 ronde (pemain pengganti vs 3 bot Sulit, `PEEKT=h LUCK=0.5,8 LINEUP=h,sulit,sulit,sulit`): peluang menang pemain turun dari 16,8% ke 9,8%, dan Kecik pemain per ronde dari −7,8 ke −17,4.

## Hasil uji kekuatan bot

Aturan Singapura. Format **duplicate**: tiap dinding dimainkan 4 kali dengan kursi diputar, jadi tiap level mendapat kartu yang sama. Keberuntungan saling meniadakan dan selisih kekuatan terlihat jelas. Angka ± adalah galat baku.

**Meja campuran** — `node tools/sim.js 1000 101` (Sulit / Sedang / Mudah / Sedang), seri 15,8%:

| Level | Tingkat menang | Zimo | Kena tembak | Kecik/ronde | Tai menang rata-rata |
|---|---|---|---|---|---|
| Sulit | 28,6% | 7,4% | 13,3% | **+12,12 ± 2,13** | 2,69 |
| Sedang | 19,4% | 5,5% | 16,4% | −0,08 ± 1,02 | 2,55 |
| Mudah | 16,7% | 5,0% | 14,7% | −11,97 ± 1,28 | 1,76 |

**Adu langsung** (1000 ronde masing-masing):

| Pertandingan | Hasil | Seri |
|---|---|---|
| Sulit vs Sedang (`LINEUP=sulit,sedang,sulit,sedang`) | Sulit **+3,59 ± 1,25** Kecik/ronde; menang 23,6% vs 18,9%; kena tembak 12,9% vs 18,6% | 15,1% |
| Sedang vs Mudah (`LINEUP=sedang,mudah,sedang,mudah`) | Sedang **+6,49 ± 0,83** Kecik/ronde | 18,7% |

Catatan penyetelan:
- Monte Carlo sebagai penentu utama justru merugikan, karena simulasi cepatnya tidak memodelkan klaim lawan. Sekarang MC hanya dipakai untuk memutus pilihan yang nyaris seimbang.
- Keunggulan Sulit datang dari **lihat dua langkah** (nilai tunggu dan tai sungguhan dihitung sebelum siap) dan pertahanan ringan.
- Sedang sengaja tidak membaca lawan, sesuai pembagian level.
