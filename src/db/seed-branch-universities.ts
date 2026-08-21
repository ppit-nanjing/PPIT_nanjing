/**
 * Mengisi `branch_universities` — daftar kampus per cabang PPI Tiongkok yang
 * jadi sumber dropdown bertingkat "Asal Cabang" → "Nama Universitas" di form
 * Sensus (form pusat mengunci field universitas sampai cabang dipilih).
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-branch-universities.ts
 *
 * PENTING — status daftar ini:
 * Ini daftar kampus NYATA di tiap kota cabang (perguruan tinggi yang memang ada
 * di sana), disusun sebagai titik awal yang bisa langsung dipakai — BUKAN salinan
 * daftar resmi dari form PPI Tiongkok pusat, karena isi dropdown mereka tidak
 * dipublikasikan di luar form itu. Sebelum data dari sini direkap dan dikirim ke
 * pusat, cocokkan dulu nama-nama di bawah dengan opsi di dropdown mereka: kalau
 * ejaannya beda ("Nanjing Xiaozhuang University" vs "Nanjing XiaoZhuang
 * University"), data kita tidak akan match saat dimasukkan ke sistem mereka.
 * Sunting berkas ini lalu jalankan ulang — seed-nya idempoten (upsert).
 *
 * Cabang tanpa entri di sini tetap bisa dipilih; pengisi form akan memakai opsi
 * "Lainnya" dan mengetik nama kampusnya sendiri.
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { branchUniversities, regionalBranches } from "./schema";

// Kunci = `cityName` di `regional_branches` (lihat seed-branches.ts).
// Nama kampus dalam Bahasa Inggris — sesuai label field di form pusat
// ("Nama Universitas (Dalam Bahasa Inggris)").
const UNIVERSITIES_BY_BRANCH: Record<string, string[]> = {
  // ---------- Utara ----------
  Beijing: [
    "Peking University",
    "Tsinghua University",
    "Renmin University of China",
    "Beijing Normal University",
    "Beijing Language and Culture University",
    "Beijing Foreign Studies University",
    "University of International Business and Economics",
    "Beihang University",
    "Beijing Institute of Technology",
    "Beijing Jiaotong University",
    "University of Science and Technology Beijing",
    "Beijing University of Posts and Telecommunications",
    "Beijing University of Technology",
    "Beijing University of Chemical Technology",
    "China Agricultural University",
    "Central University of Finance and Economics",
    "China University of Political Science and Law",
    "Communication University of China",
    "Capital Normal University",
    "Capital Medical University",
    "Beijing University of Chinese Medicine",
    "Central Academy of Fine Arts",
    "Minzu University of China",
    "China University of Geosciences (Beijing)",
    "China University of Petroleum (Beijing)",
    "North China Electric Power University",
    "Beijing Forestry University",
    "Beijing Sport University",
  ],
  Changchun: [
    "Jilin University",
    "Northeast Normal University",
    "Changchun University of Science and Technology",
    "Changchun University of Technology",
    "Changchun Normal University",
    "Changchun University of Chinese Medicine",
    "Jilin Agricultural University",
    "Jilin University of Finance and Economics",
    "Jilin International Studies University",
    "Changchun University",
  ],
  Harbin: [
    "Harbin Institute of Technology",
    "Harbin Engineering University",
    "Heilongjiang University",
    "Harbin Medical University",
    "Harbin Normal University",
    "Harbin University of Science and Technology",
    "Harbin University of Commerce",
    "Northeast Agricultural University",
    "Northeast Forestry University",
    "Heilongjiang University of Chinese Medicine",
  ],
  // Cabang tingkat provinsi, jadi kampusnya tersebar di Jinan, Qingdao, Yantai, dst.
  Shandong: [
    "Shandong University",
    "Ocean University of China",
    "China University of Petroleum (East China)",
    "Qingdao University",
    "Qingdao University of Science and Technology",
    "Qingdao Agricultural University",
    "Shandong Normal University",
    "Shandong University of Science and Technology",
    "Shandong University of Technology",
    "Shandong University of Finance and Economics",
    "Shandong Agricultural University",
    "Shandong Jianzhu University",
    "University of Jinan",
    "Qufu Normal University",
    "Yantai University",
    "Ludong University",
    "Shandong University of Traditional Chinese Medicine",
  ],
  Shenyang: [
    "Northeastern University",
    "Liaoning University",
    "China Medical University",
    "Shenyang Agricultural University",
    "Shenyang Normal University",
    "Shenyang University of Technology",
    "Shenyang Jianzhu University",
    "Shenyang Pharmaceutical University",
    "Shenyang University of Chemical Technology",
    "Shenyang Aerospace University",
    "Shenyang Ligong University",
    "Shenyang University",
    "Liaoning University of Traditional Chinese Medicine",
  ],
  // Cabang Shijiazhuang menaungi kampus-kampus di Provinsi Hebei.
  Shijiazhuang: [
    "Hebei Normal University",
    "Hebei Medical University",
    "Hebei University of Science and Technology",
    "Hebei University of Economics and Business",
    "Hebei University of Chinese Medicine",
    "Shijiazhuang Tiedao University",
    "Hebei GEO University",
    "Hebei University",
    "Hebei Agricultural University",
    "Yanshan University",
  ],
  Tianjin: [
    "Nankai University",
    "Tianjin University",
    "Tianjin Normal University",
    "Tianjin University of Technology",
    "Tianjin University of Science and Technology",
    "Tianjin University of Finance and Economics",
    "Tianjin Medical University",
    "Tianjin University of Traditional Chinese Medicine",
    "Tianjin Foreign Studies University",
    "Tiangong University",
    "Civil Aviation University of China",
    "Hebei University of Technology",
    "Tianjin Polytechnic University",
    "Tianjin Chengjian University",
  ],
  "Xi'an": [
    "Xi'an Jiaotong University",
    "Northwestern Polytechnical University",
    "Xidian University",
    "Northwest University",
    "Shaanxi Normal University",
    "Chang'an University",
    "Northwest A&F University",
    "Xi'an University of Technology",
    "Xi'an University of Architecture and Technology",
    "Xi'an University of Science and Technology",
    "Xi'an Shiyou University",
    "Xi'an International Studies University",
    "Xi'an Polytechnic University",
    "Shaanxi University of Science and Technology",
    "Xi'an University of Posts and Telecommunications",
  ],
  Zhengzhou: [
    "Zhengzhou University",
    "Henan University",
    "Henan University of Technology",
    "Henan Agricultural University",
    "Henan Normal University",
    "Henan University of Chinese Medicine",
    "Henan University of Economics and Law",
    "Zhengzhou University of Light Industry",
    "North China University of Water Resources and Electric Power",
    "Zhongyuan University of Technology",
    "Henan University of Science and Technology",
  ],

  // ---------- Timur ----------
  Ningbo: [
    "Ningbo University",
    "University of Nottingham Ningbo China",
    "Ningbo University of Technology",
    "Zhejiang Wanli University",
    "Ningbo University of Finance and Economics",
  ],
  Shanghai: [
    "Fudan University",
    "Shanghai Jiao Tong University",
    "Tongji University",
    "East China Normal University",
    "East China University of Science and Technology",
    "Shanghai University",
    "Donghua University",
    "Shanghai University of Finance and Economics",
    "Shanghai International Studies University",
    "Shanghai Maritime University",
    "Shanghai Ocean University",
    "Shanghai Normal University",
    "University of Shanghai for Science and Technology",
    "Shanghai University of Traditional Chinese Medicine",
    "Shanghai University of Engineering Science",
    "Shanghai University of Political Science and Law",
    "Shanghai Institute of Technology",
    "Shanghai Conservatory of Music",
    "Shanghai Theatre Academy",
    "NYU Shanghai",
    "ShanghaiTech University",
  ],
  Changzhou: [
    "Changzhou University",
    "Jiangsu University of Technology",
    "Hohai University (Changzhou Campus)",
    "Changzhou Institute of Technology",
  ],
  Hangzhou: [
    "Zhejiang University",
    "Hangzhou Dianzi University",
    "Zhejiang University of Technology",
    "Zhejiang Sci-Tech University",
    "Zhejiang Gongshang University",
    "Zhejiang University of Science and Technology",
    "Zhejiang University of Finance and Economics",
    "Zhejiang Chinese Medical University",
    "Zhejiang A&F University",
    "Hangzhou Normal University",
    "China Academy of Art",
    "Westlake University",
  ],
  // Cabang Hefei menaungi kampus-kampus di Provinsi Anhui.
  Hefei: [
    "University of Science and Technology of China",
    "Hefei University of Technology",
    "Anhui University",
    "Anhui Agricultural University",
    "Anhui Medical University",
    "Anhui Jianzhu University",
    "Anhui University of Chinese Medicine",
    "Hefei Normal University",
    "Hefei University",
    "Anhui Normal University",
    "Anhui Polytechnic University",
    "Anhui University of Science and Technology",
    "Anhui University of Finance and Economics",
  ],
  // Cabang Nanchang menaungi kampus-kampus di Provinsi Jiangxi.
  Nanchang: [
    "Nanchang University",
    "Jiangxi Normal University",
    "Jiangxi University of Finance and Economics",
    "East China Jiaotong University",
    "Nanchang Hangkong University",
    "Jiangxi Agricultural University",
    "Jiangxi University of Chinese Medicine",
    "Jiangxi University of Science and Technology",
    "East China University of Technology",
    "Jiangxi University of Technology",
  ],
  // Cabang PPIT Nanjing menaungi 9 kota (lihat coverage_cities): Nanjing,
  // Huai'an, Jurong, Lianyungang, Ma'anshan, Taizhou, Xuzhou, Yancheng,
  // Zhenjiang — jadi daftarnya lintas kota, bukan Nanjing saja.
  Nanjing: [
    "Nanjing University",
    "Southeast University",
    "Nanjing University of Aeronautics and Astronautics",
    "Nanjing University of Science and Technology",
    "Hohai University",
    "Nanjing Agricultural University",
    "Nanjing Normal University",
    "Nanjing University of Posts and Telecommunications",
    "Nanjing Tech University",
    "Nanjing Forestry University",
    "China Pharmaceutical University",
    "Nanjing Medical University",
    "Nanjing University of Chinese Medicine",
    "Nanjing University of Information Science and Technology",
    "Nanjing University of Finance and Economics",
    "Nanjing Audit University",
    "Nanjing Xiaozhuang University",
    "Nanjing Institute of Technology",
    "Nanjing University of the Arts",
    "Nanjing Sport Institute",
    "Jinling Institute of Technology",
    "Nanjing University of Chinese Medicine Hanlin College",
    // Zhenjiang
    "Jiangsu University",
    "Jiangsu University of Science and Technology",
    // Xuzhou
    "China University of Mining and Technology",
    "Jiangsu Normal University",
    "Xuzhou Medical University",
    // Huai'an
    "Huaiyin Institute of Technology",
    "Huaiyin Normal University",
    // Yancheng
    "Yancheng Institute of Technology",
    "Yancheng Teachers University",
    // Lianyungang
    "Jiangsu Ocean University",
    // Taizhou
    "Taizhou University",
    // Ma'anshan
    "Anhui University of Technology",
    // Jurong
    "Jiangsu Polytechnic College of Agriculture and Forestry",
  ],
  Nantong: ["Nantong University", "Nantong Institute of Technology"],
  Suzhou: [
    "Soochow University",
    "Xi'an Jiaotong-Liverpool University",
    "Suzhou University of Science and Technology",
    "Nanjing University (Suzhou Campus)",
    "Duke Kunshan University",
    "Changshu Institute of Technology",
    "Suzhou City University",
  ],
  Wuxi: ["Jiangnan University", "Wuxi University", "Southeast University (Wuxi Campus)"],
  Yangzhou: ["Yangzhou University", "Yangzhou Polytechnic Institute"],

  // ---------- Selatan ----------
  "Hong Kong": [
    "The University of Hong Kong",
    "The Chinese University of Hong Kong",
    "The Hong Kong University of Science and Technology",
    "City University of Hong Kong",
    "The Hong Kong Polytechnic University",
    "Hong Kong Baptist University",
    "Lingnan University",
    "The Education University of Hong Kong",
    "Hong Kong Metropolitan University",
    "Hong Kong Shue Yan University",
  ],
  // Cabang Changsha menaungi kampus-kampus di Provinsi Hunan.
  Changsha: [
    "Central South University",
    "Hunan University",
    "Hunan Normal University",
    "Changsha University of Science and Technology",
    "Hunan Agricultural University",
    "Central South University of Forestry and Technology",
    "Hunan University of Chinese Medicine",
    "Hunan University of Technology and Business",
    "Changsha University",
    "Xiangtan University",
  ],
  Chengdu: [
    "Sichuan University",
    "University of Electronic Science and Technology of China",
    "Southwest Jiaotong University",
    "Southwestern University of Finance and Economics",
    "Sichuan Agricultural University",
    "Chengdu University of Technology",
    "Chengdu University of Traditional Chinese Medicine",
    "Southwest Petroleum University",
    "Sichuan Normal University",
    "Xihua University",
    "Chengdu University",
    "Chengdu Sport University",
  ],
  Chongqing: [
    "Chongqing University",
    "Southwest University",
    "Chongqing Medical University",
    "Chongqing University of Posts and Telecommunications",
    "Chongqing Jiaotong University",
    "Chongqing Technology and Business University",
    "Chongqing Normal University",
    "Chongqing University of Technology",
    "Sichuan International Studies University",
    "Southwest University of Political Science and Law",
  ],
  // Cabang Fuzhou menaungi kampus-kampus di Provinsi Fujian (selain Xiamen).
  Fuzhou: [
    "Fuzhou University",
    "Fujian Normal University",
    "Fujian Agriculture and Forestry University",
    "Fujian Medical University",
    "Fujian University of Technology",
    "Fujian University of Traditional Chinese Medicine",
    "Minjiang University",
    "Fujian Jiangxia University",
  ],
  Guangzhou: [
    "Sun Yat-sen University",
    "South China University of Technology",
    "Jinan University",
    "South China Normal University",
    "South China Agricultural University",
    "Guangdong University of Foreign Studies",
    "Guangdong University of Technology",
    "Guangzhou University",
    "Southern Medical University",
    "Guangzhou Medical University",
    "Guangzhou University of Chinese Medicine",
    "Guangdong University of Finance and Economics",
    "Guangdong Pharmaceutical University",
    "Guangzhou Sport University",
  ],
  Guilin: [
    "Guangxi Normal University",
    "Guilin University of Electronic Technology",
    "Guilin University of Technology",
    "Guilin Medical University",
    "Guilin Tourism University",
  ],
  Liuzhou: ["Guangxi University of Science and Technology", "Liuzhou Institute of Technology"],
  Nanning: [
    "Guangxi University",
    "Guangxi Medical University",
    "Guangxi Minzu University",
    "Guangxi University of Chinese Medicine",
    "Guangxi University of Finance and Economics",
    "Nanning Normal University",
    "Guangxi Arts University",
    "Nanning University",
  ],
  Shenzhen: [
    "Shenzhen University",
    "Southern University of Science and Technology",
    "The Chinese University of Hong Kong, Shenzhen",
    "Harbin Institute of Technology (Shenzhen)",
    "Shenzhen Technology University",
    "Peking University Shenzhen Graduate School",
    "Tsinghua Shenzhen International Graduate School",
    "Shenzhen MSU-BIT University",
  ],
  // Cabang Wuhan menaungi kampus-kampus di Provinsi Hubei.
  Wuhan: [
    "Wuhan University",
    "Huazhong University of Science and Technology",
    "Wuhan University of Technology",
    "China University of Geosciences (Wuhan)",
    "Central China Normal University",
    "Zhongnan University of Economics and Law",
    "Huazhong Agricultural University",
    "South-Central Minzu University",
    "Hubei University",
    "Hubei University of Technology",
    "Hubei University of Chinese Medicine",
    "Wuhan Textile University",
    "Wuhan Institute of Technology",
    "Wuhan Sports University",
    "Jianghan University",
  ],
  Xiamen: [
    "Xiamen University",
    "Huaqiao University",
    "Jimei University",
    "Xiamen University of Technology",
    "Xiamen Institute of Technology",
  ],
};

async function main() {
  const branches = await db
    .select({ id: regionalBranches.id, cityName: regionalBranches.cityName })
    .from(regionalBranches);

  if (branches.length === 0) {
    throw new Error("regional_branches kosong — jalankan src/db/seed-branches.ts dulu.");
  }

  const idByCity = new Map(branches.map((b) => [b.cityName, b.id]));
  const unknown = Object.keys(UNIVERSITIES_BY_BRANCH).filter((city) => !idByCity.has(city));
  if (unknown.length > 0) {
    // Salah ketik nama kota = kampusnya diam-diam tidak masuk, jadi digagalkan
    // di sini alih-alih menghasilkan dropdown yang kosong tanpa penjelasan.
    throw new Error(`Cabang tidak dikenal di UNIVERSITIES_BY_BRANCH: ${unknown.join(", ")}`);
  }

  let total = 0;
  for (const [city, names] of Object.entries(UNIVERSITIES_BY_BRANCH)) {
    const branchId = idByCity.get(city)!;
    // Ganti isi per cabang, bukan hapus seluruh tabel: cabang yang belum
    // terdaftar di berkas ini tetap aman kalau seed dijalankan sebagian.
    await db.delete(branchUniversities).where(eq(branchUniversities.branchId, branchId));
    await db.insert(branchUniversities).values(
      names.map((name, i) => ({ branchId, name, orderIndex: i }))
    );
    total += names.length;
  }

  const without = branches.filter((b) => !UNIVERSITIES_BY_BRANCH[b.cityName]).map((b) => b.cityName);
  console.log(`Seeded ${total} kampus untuk ${Object.keys(UNIVERSITIES_BY_BRANCH).length} cabang.`);
  if (without.length > 0) {
    console.log(`Cabang belum punya daftar kampus (pengisi form pakai "Lainnya"): ${without.join(", ")}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
