import { pinyin } from "pinyin-pro";

// Hanzi berturut-turut (CJK Unified Ideographs). Dipakai untuk menempelkan
// pinyin di kanan tiap bentukan hanzi, contoh 你好 (nǐ hǎo), di jawaban chatbot
// dan isi artikel /help. Pinyin pakai tanda nada (toneType symbol), dan tiap
// suku kata dipisah spasi supaya tetap terbaca.
const HANZI_RUN = /[\u4e00-\u9fff]+/g;
// Sumber sudah sering menulis hanzi di dalam tanda kurung sendiri,
// "(江苏)" atau "（江苏）". Kurung itu dilepas dulu supaya hasilnya tidak
// dobel: "((江苏 - jiāng sū))". Isi kurung yang bercampur kata lain
// (mis. "（三件套 or 四件套）") tidak cocok dan dibiarkan.
const HANZI_PAREN = /[(（]\s*([\u4e00-\u9fff]+(?:\s+[\u4e00-\u9fff]+)*)\s*[)）]/g;

/**
 * Tempelkan pinyin di belakang tiap run hanzi dengan bentuk "({hanzi} - {pinyin})":
 * "微信" -> "(微信 - wēi xìn)". Hanzi-nya ikut dibawa ke dalam tanda kurung
 * supaya maba bisa menunjuk tulisannya ke orang lain, dan pinyinnya tetap
 * kebaca. Teks non-hanzi dibiarkan apa adanya. Dipanggil di jalur render
 * (Server Action chat + halaman artikel), bukan di cache jawaban, supaya
 * jawaban yang tersimpan tetap teks bersih dan bisa dirender ulang tanpa
 * pinyin ganda.
 */
export function annotateHanziPinyin(text: string): string {
  if (!text || !HANZI_RUN.test(text)) return text;
  HANZI_RUN.lastIndex = 0;
  const bare = text.replace(HANZI_PAREN, "$1");
  return bare.replace(HANZI_RUN, (run) => `(${run} - ${pinyin(run, { toneType: "symbol", nonZh: "consecutive" })})`);
}
