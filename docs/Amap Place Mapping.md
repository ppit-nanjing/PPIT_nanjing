# Amap Place Mapping

Amap menulis nama rumah ibadah di Nanjing dengan ejaannya sendiri, jadi nama di korpus sering tidak ketemu kalau dicari apa adanya. File ini memasangkan tiap tempat di korpus ke POI Amap-nya, satu baris per tempat, urut masjid dulu (yang di dalam kota sebelum yang di luar kota), lalu gereja.

Dua kolom terakhir diisi tangan. Isi `Nama di Amap (isi manual)` dengan nama persis seperti yang muncul di Amap, lalu tempel URL POI-nya di `Link Amap (isi manual)`. Jangan menebak nama dan jangan menyalin tautan pencarian, karena tautan pencarian tidak menyimpan POI.

Korpus tempat ibadah ada di `docs/guidebook/tempat-ibadah-di-nanjing.md`, versi Inggrisnya di `docs/guidebook/en/`, dan isinya masuk ke tabel `help_articles` lewat `src/db/ingest-guide.ts`. Baris yang sudah terisi harus disalin balik ke file topik itu dan di-ingest ulang; tanpa langkah itu jawaban chatbot tetap memakai nama lama.

Jumlah baris: 16 tempat.

| Nama di korpus | Hanzi | Nama Latin | Kategori | Alamat di korpus | Wilayah | Di kota Nanjing? | Link Amap sekarang | Nama di Amap (isi manual) | Link Amap (isi manual) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 净觉寺 Jingjue Mosque | 净觉寺 | Jingjue Mosque | Masjid | Sanshan Street, Baixia District, Nanjing, Jiangsu. | 秦淮区 | ya | https://www.amap.com/place/B00190BC0P | Jingjue temple (soon will be renamed as Jingjue Mosque per my request to AMap team) | https://www.amap.com/place/B00190BC0P |
| 草桥清真寺 Caoqiao Mosque | 草桥清真寺 | Caoqiao Mosque | Masjid | No. 20 Dading Lane, Qinhuai District, Nanjing, Jiangsu. | 秦淮区 | ya | https://www.amap.com/place/B0FFJ4I694 | Mosque (soon will be renamed as Caoqiao Mosque per my request to AMap team) | https://www.amap.com/place/B0FFJ4I694 |
| 吉兆营清真寺 Jizhaoying Mosque | 吉兆营清真寺 | Jizhaoying Mosque | Masjid | 玄武区吉兆营43号 (Jalan Jizhaoying No. 43, Distrik Xuanwu), di sisi timur Jalan Zhongshan. | 玄武区 | ya | https://www.amap.com/place/B001912D3P | Jizhaoying Mosque | https://www.amap.com/place/B0FFGCB60X |
| 凤凰花园清真寺 Fenghuangshan Garden Mosque (Amap: 澄清坊清真寺; sumber lain: 六合长江路寺 / 长江路清真寺) | 凤凰花园清真寺 | Fenghuangshan Garden Mosque | Masjid | Yangtze River Road No. 30, Nanjing, Jiangsu. | 六合区 | tidak | https://www.amap.com/place/B00190AI9M |  | not found yet |
| 六合南门清真寺 Nanmen Mosque (Luhe) | 六合南门清真寺 | Nanmen Mosque (Luhe) | Masjid | 六城镇南门清真街北首, ujung utara Jalan Nanmen Qingzhen, Kota Luhecheng (njislam menulis nama kota, bukan nama distrik), 门前临滁河 atau menghadap Sungai Chuhe. | 六合区 | tidak | https://www.amap.com/place/B0FFMA5PNG | Liuhe South Gate Mosque | https://www.amap.com/place/B0FFMA5PNG |
| 六合竹镇清真寺 Zhuzhen Mosque | 六合竹镇清真寺 | Zhuzhen Mosque | Masjid | Alamat di Kota Zhuzhen, Distrik Luhe | 六合区 | tidak | https://www.amap.com/place/B0FFGILCCX | Zhuzhen Mosque | https://www.amap.com/place/B0FFGILCCX |
| 江宁湖熟清真寺 Hushu Mosque | 江宁湖熟清真寺 | Hushu Mosque | Masjid | 江宁区湖熟镇水北街39号 (Jalan Shuibei No. 39, Kota Hushu, Distrik Jiangning), menurut China Halal Tours. | 江宁区 | tidak | https://www.amap.com/place/B0FFG77EWC | Hushu temple | https://www.amap.com/place/B0FFG77EWC |
| 溧水清真寺 Lishui Mosque | 溧水清真寺 | Lishui Mosque | Masjid | Alamat di kawasan 魏家塘, 小西门 (Weijiatang, Gerbang Barat Kecil), Distrik Lishui | 溧水区 | tidak | https://www.amap.com/place/B0FFH89J7W | Lishui Mosque | https://www.amap.com/place/B0FFH89J7W |
| 浦口星甸清真寺 Xingdian Mosque | 浦口星甸清真寺 | Xingdian Mosque | Masjid | 浦口区星甸 (Xingdian, Distrik Pukou) | 浦口区 | tidak | https://uri.amap.com/search?keyword=%E6%B5%A6%E5%8F%A3%E6%98%9F%E7%94%B8%E6%B8%85%E7%9C%9F%E5%AF%BA&city=%E5%8D%97%E4%BA%AC&src=ppit-nanjing |  | not found yet; belum ada POI, kartu chatbot disembunyikan |
| 浦口江浦清真寺 Jiangpu Mosque | 浦口江浦清真寺 | Jiangpu Mosque | Masjid | 江浦街道 (Subdistrik Jiangpu, Distrik Pukou) | 浦口区 | tidak | https://www.amap.com/place/B0GKS7M9T4 | Jiangpu Mosque | https://www.amap.com/place/B0GKS7M9T4 |
| 一条巷清真寺 Yitiaoxiang Mosque | 一条巷清真寺 | Yitiaoxiang Mosque | Masjid | No. 9 Yitiao Lane, Kota Zhujiang, Distrik Pukou, Nanjing. | 浦口区 | tidak | https://uri.amap.com/search?keyword=%E4%B8%80%E6%9D%A1%E5%B7%B7%E6%B8%85%E7%9C%9F%E5%AF%BA&city=%E5%8D%97%E4%BA%AC&src=ppit-nanjing |  | not found yet; belum ada POI, kartu chatbot disembunyikan |
| Holy World Christian Church 神圣世界的基督教教堂 | 神圣世界的基督教教堂 | Holy World Christian Church | Gereja Kristen | 150 Leshan Road, Nanjing. | tidak disebut | ya | https://www.amap.com/place/B00190CS5M | same | same |
| NICF Christian Church |  | NICF Christian Church | Gereja Kristen | Celebrity City Hotel, No. 30 Zhongshan North Road (Hubei Road), Gulou District, Nanjing, Jiangsu. | 鼓楼区 | ya | https://www.amap.com/place/B00190BBW7 | same | same |
| Jiangsu Road Christian Church |  | Jiangsu Road Christian Church | Gereja Kristen | No. 60-10 Jiangsu Road, Gulou District, Nanjing. | 鼓楼区 | ya | https://www.amap.com/place/B001906PB9 | same | same |
| Tianzhujiao Nanjing Jiaoqu Catholic Church 天主教南京总教区石鼓路主教座堂天主堂 | 天主教南京总教区石鼓路主教座堂天主堂 | Tianzhujiao Nanjing Jiaoqu Catholic Church | Gereja Katolik | No. 112 Shigu Road, Nanjing, Jiangsu. | tidak disebut | ya | https://www.amap.com/place/B00190B7ZF |  | https://www.amap.com/place/B00190B7ZF |

Koreksi 18 Oktober 2026: kolom link manual baris 吉兆营清真寺 tadinya berisi tautan milik baris 凤凰花园清真寺. poiTips Amap untuk `澄清坊清真寺` mengembalikan B00190AI9M sebagai 澄清坊清真寺, 长江路30号, 六合区 (adcode 320116), sekitar 40 km dari 玄武区吉兆营. Id `B001912D3P` yang tadinya dipakai baris 吉兆营清真寺 tidak bisa diverifikasi lewat jalur yang ada: `poiTips?words=B001912D3P` memperlakukan id itu sebagai kata kunci dan mengembalikan POI lain (DRUNK BAKER 醉师傅(南京华贸中心店), 总统府 长江路292号), `/place/B001912D3P` menjawab 302 ke `/__amap_cookie_probe/`, dan tidak ada kunci Amap di `.env.local`. Satu-satunya id yang membawa alamat korpus 玄武区吉兆营43号 adalah B0FFGCB60X (吉兆营清真寺(北门), 新街口街道丹凤街吉兆营43号吉兆营清真寺内(北侧)), jadi kolom link manual baris itu memakai https://www.amap.com/place/B0FFGCB60X. Amap tidak punya POI bernama 凤凰花园清真寺: kata kunci itu mengembalikan 江浦清真寺 B0GKS7M9T4 (浦口区) yang sudah punya baris sendiri, sedangkan POI baris 凤凰花园清真寺 adalah 澄清坊清真寺 B00190AI9M di 长江路30号, 六合区 - itu sebabnya label korpusnya memuat nama 澄清坊.

## Masjid yang disebut sumber tapi belum ada di korpus

Ketiga sumber (dinas agama 3 nama, China Halal Tours 6, asosiasi Islam Nanjing 10) sudah dicek 17 Oktober 2026 dan semua namanya bermuara ke baris yang sudah ada di tabel pertama. Nama panggilan yang dipakai sumber ikut ditulis di barisnya: 长江路清真寺 / 澄清坊清真寺 dan 六合长江路寺 di baris 凤凰花园清真寺, 王家巷清真寺 di 六合竹镇清真寺, 水北清真寺 di 江宁湖熟清真寺, 小西门寺 / 魏家塘寺 di 溧水清真寺.

