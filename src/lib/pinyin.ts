import { pinyin } from "pinyin-pro";

// Hanzi berturut-turut (CJK Unified Ideographs). Dipakai untuk menempelkan
// pinyin di kanan tiap bentukan hanzi, contoh 你好（nǐ hǎo）, di jawaban chatbot
// dan isi artikel /help. Pinyin pakai tanda nada (toneType symbol), dan tiap
// suku kata dipisah spasi supaya tetap terbaca.
const HANZI_RUN = /[\u4e00-\u9fff]+/g;

/**
 * Tempelkan pinyin di belakang tiap run hanzi: "微信" -> "微信（wēi xìn）".
 * Teks non-hanzi dibiarkan apa adanya. Dipanggil di jalur render (Server
 * Action chat + halaman artikel), bukan di cache jawaban, supaya jawaban yang
 * tersimpan tetap teks bersih dan bisa dirender ulang tanpa pinyin ganda.
 */
export function annotateHanziPinyin(text: string): string {
  if (!text || !HANZI_RUN.test(text)) return text;
  HANZI_RUN.lastIndex = 0;
  return text.replace(HANZI_RUN, (run) => `${run}（${pinyin(run, { toneType: "symbol", nonZh: "consecutive" })}）`);
}
