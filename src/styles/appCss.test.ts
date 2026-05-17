import { readFileSync } from "node:fs";

describe("app CSS", () => {
  const css = readFileSync("src/styles/app.css", "utf8");

  it("lets the New passage content editor flex to the available height", () => {
    expect(css).toMatch(
      /\.text-import\s*{[^}]*grid-template-rows:\s*minmax\(0, 1fr\) auto;/s,
    );
    expect(css).toMatch(
      /\.text-import-composer\s*{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);/s,
    );
    expect(css).toMatch(
      /\.text-import-body\s*{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);/s,
    );
    expect(css).toMatch(
      /\.text-import textarea\s*{[^}]*height:\s*100%;/s,
    );
  });

  it("keeps New passage labels larger than placeholder text", () => {
    expect(css).toMatch(/\.text-import label\s*{[^}]*font-size:\s*16px;/s);
    expect(css).toMatch(
      /\.text-import input::placeholder,\s*\.text-import textarea::placeholder\s*{[^}]*font-size:\s*14px;/s,
    );
  });

  it("keeps audio player progress and icon controls at the same height", () => {
    expect(css).toMatch(
      /\.custom-audio-controls\s*{[^}]*--audio-control-size:\s*34px;/s,
    );
    expect(css).toMatch(
      /\.custom-audio-controls\s*{[^}]*--audio-control-gap:\s*6px;/s,
    );
    expect(css).toMatch(
      /\.audio-play-button\s*{[^}]*height:\s*var\(--audio-control-size\);/s,
    );
    expect(css).toMatch(
      /\.audio-control-button\s*{[^}]*height:\s*var\(--audio-control-size\);/s,
    );
    expect(css).toMatch(
      /\.audio-progress\s*{[^}]*height:\s*var\(--audio-control-size\);/s,
    );
    expect(css).toMatch(
      /\.audio-control-button\s*{[^}]*display:\s*inline-grid;[^}]*place-items:\s*center;/s,
    );
    expect(css).toMatch(
      /\.audio-control-button svg\s*{[^}]*display:\s*block;/s,
    );
  });
});
