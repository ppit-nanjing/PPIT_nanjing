import type { CoverageFeature } from "@/app/coverage/page";

export type Outline = { d: string; w: number; h: number };
/** Beberapa wilayah pada satu kanvas, mis. 11 distrik Nanjing untuk peta penunjuk. */
export type Outlines = { w: number; h: number; paths: Record<string, string> };

const ringsOf = (feature: CoverageFeature) => {
  const g = feature.geometry;
  return (g.type === "Polygon" ? g.coordinates : (g.coordinates as number[][][][]).flat()) as number[][][];
};

/**
 * Garis bentuk wilayah untuk gambar kecil yang tidak interaktif (kepala bagian
 * dan peta penunjuk di /universities), dipaskan ke kotak `size`. Peta yang bisa
 * diklik memakai CoverageMap.
 *
 * Titiknya dijarangkan: pada ukuran sekitar 100px selisihnya tidak terlihat,
 * sedangkan HTML-nya tinggal sepertiga.
 */
export function outlinesOf(features: CoverageFeature[], size = 100, maxPoints = 140): Outlines {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const feature of features) {
    for (const ring of ringsOf(feature)) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  // Satu derajat bujur lebih pendek daripada satu derajat lintang, sebesar cos(lintang).
  const cosLat = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = (maxLng - minLng) * cosLat;
  const spanY = maxLat - minLat;
  const scale = size / Math.max(spanX, spanY);

  const paths: Record<string, string> = {};
  for (const feature of features) {
    paths[feature.properties.id] = ringsOf(feature)
      .map((ring) => {
        const step = Math.max(1, Math.ceil(ring.length / maxPoints));
        const points = ring.filter((_, i) => i % step === 0);
        // Pulau kecil yang tinggal dua titik setelah dijarangkan tidak punya luas untuk digambar.
        if (points.length < 3) return "";
        return (
          "M" +
          points
            .map(([lng, lat]) => `${((lng - minLng) * cosLat * scale).toFixed(1)},${((maxLat - lat) * scale).toFixed(1)}`)
            .join("L") +
          "Z"
        );
      })
      .join("");
  }

  return { w: Math.round(spanX * scale), h: Math.round(spanY * scale), paths };
}

/** Satu wilayah saja, dipaskan ke kotaknya sendiri. */
export function outlineOf(feature: CoverageFeature, size = 100, maxPoints = 140): Outline {
  const { w, h, paths } = outlinesOf([feature], size, maxPoints);
  return { d: paths[feature.properties.id], w, h };
}
