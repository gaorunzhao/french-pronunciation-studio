import {
  downsamplePeaks,
} from "./waveformPeaks";

describe("waveformPeaks", () => {
  it("downsamples audio samples into normalized peak bars", () => {
    const peaks = downsamplePeaks(Float32Array.from([0, 0.5, -1, 0.25]), 2);

    expect(peaks).toEqual([0.5, 1]);
  });

  it("returns no bars for unavailable audio", () => {
    expect(downsamplePeaks(Float32Array.from([]), 48)).toEqual([]);
    expect(downsamplePeaks(Float32Array.from([0.5]), 0)).toEqual([]);
  });
});
