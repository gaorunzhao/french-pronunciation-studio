export function downsamplePeaks(samples: Float32Array, barCount: number) {
  if (barCount <= 0 || samples.length === 0) return [];

  const chunkSize = Math.ceil(samples.length / barCount);

  return Array.from({ length: barCount }, (_, index) => {
    const start = index * chunkSize;
    const end = Math.min(samples.length, start + chunkSize);
    let peak = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(samples[sampleIndex] ?? 0));
    }

    return Math.round(Math.min(1, peak) * 100) / 100;
  });
}
