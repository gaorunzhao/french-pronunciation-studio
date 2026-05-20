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

  it("keeps New passage placeholders aligned with typed input typography", () => {
    expect(css).toMatch(/\.text-import label\s*{[^}]*font-size:\s*16px;/s);
    expect(css).toMatch(
      /\.text-import input::placeholder,\s*\.text-import textarea::placeholder\s*{[^}]*font:\s*inherit;/s,
    );
    expect(css).toMatch(
      /\.text-import input::placeholder,\s*\.text-import textarea::placeholder\s*{[^}]*line-height:\s*inherit;/s,
    );
    expect(css).not.toMatch(
      /\.text-import input::placeholder,\s*\.text-import textarea::placeholder\s*{[^}]*font-size:\s*14px;/s,
    );
  });

  it("keeps the passage title readable in compact native windows", () => {
    expect(css).toMatch(
      /\.workspace\s*{[^}]*padding:\s*max\(18px, env\(safe-area-inset-top\)\) 18px 18px;/s,
    );
    expect(css).toMatch(/\.text-stage-header h2\s*{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(css).toMatch(/\.text-stage-header h2\s*{[^}]*white-space:\s*normal;/s);
  });

  it("keeps audio player progress and inline icon controls at the same height", () => {
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
      /\.audio-progress\s*{[^}]*height:\s*var\(--audio-control-size\);/s,
    );
    expect(css).toMatch(
      /\.audio-control-button\s*{[^}]*height:\s*var\(--audio-control-size\);/s,
    );
    expect(css).toMatch(
      /\.audio-control-button\s*{[^}]*display:\s*inline-grid;[^}]*place-items:\s*center;/s,
    );
    expect(css).toMatch(
      /\.audio-control-button svg\s*{[^}]*display:\s*block;/s,
    );
    expect(css).toMatch(
      /\.audio-control-button\.icon-only\s*{[^}]*width:\s*24px;/s,
    );
    expect(css).not.toMatch(/\.audio-control-button\s*{[^}]*border-radius:\s*0;/s);
    expect(css).not.toMatch(/\.audio-control-button\s*{[^}]*background:\s*transparent;/s);
  });

  it("keeps the waveform surface stable across empty, generating, and recorded states", () => {
    expect(css).toMatch(
      /\.waveform-card\s*{[^}]*grid-template-rows:\s*auto;/s,
    );
    expect(css).toMatch(
      /\.waveform-expanded-content\s*{[^}]*grid-template-rows:\s*118px 34px;/s,
    );
    expect(css).toMatch(
      /\.audio-player-row\s*{[^}]*grid-template-columns:\s*minmax\(280px, 760px\);/s,
    );
    expect(css).toMatch(
      /\.audio-player-row\[data-has-recording="true"\]\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
    );
    expect(css).not.toMatch(/recording-manager/);
    expect(css).toMatch(/\.waveform-bars\.recording\.active rect\s*{/);
    expect(css).not.toMatch(/\.waveform-bars\.reference\.active rect\s*{[^}]*opacity:/s);
    expect(css).toMatch(
      /\.waveform-bars\.recording\.active rect\s*{[^}]*opacity:\s*0\.72;/s,
    );
    expect(css).toMatch(
      /\.waveform-legend-button\.user\s*{[^}]*border-color:\s*rgba\(143, 112, 76, 0\.3\);/s,
    );
    expect(css).toMatch(/\.waveform-legend-button\.user span\s*{[^}]*background:\s*#8f704c;/s);
    expect(css).toMatch(/--audio-progress-color:\s*#8f704c;/);
    expect(css).not.toMatch(/--audio-progress-color:\s*#b64b62;/);
    expect(css).toMatch(/\.waveform-legend\s*{/);
    expect(css).toMatch(/\.waveform-legend-button\[aria-pressed="false"\]\s*{/);
    expect(css).not.toMatch(/\.audio-state/);
    expect(css).not.toMatch(/\.waveform-recording-line/);
  });

  it("uses a Radix-style volume slider surface instead of a raw vertical input", () => {
    expect(css).toMatch(/\.volume-slider\s*{[^}]*height:\s*108px;/s);
    expect(css).toMatch(/\.volume-slider-track\s*{[^}]*border-radius:\s*999px;/s);
    expect(css).toMatch(/\.volume-slider-range\s*{[^}]*pointer-events:\s*none;/s);
    expect(css).toMatch(/\.volume-slider-thumb\s*{[^}]*width:\s*18px;/s);
    expect(css).toMatch(/\.volume-slider-thumb\s*{[^}]*z-index:\s*1;/s);
    expect(css).not.toMatch(/\.playback-control/);
    expect(css).not.toMatch(/\.volume-menu input/);
  });

  it("keeps transport buttons visually aligned with the control row", () => {
    expect(css).toMatch(
      /\.practice-controls-panel\s*{[^}]*column-gap:\s*8px;[^}]*row-gap:\s*10px;/s,
    );
    expect(css).toMatch(/\.voice-controls\s*{[^}]*gap:\s*10px;/s);
    expect(css).toMatch(
      /\.transport-action\s*{[^}]*font-size:\s*16px;[^}]*font-weight:\s*760;[^}]*line-height:\s*1;/s,
    );
    expect(css).toMatch(
      /\.transport-action span\s*{[^}]*font-weight:\s*inherit;[^}]*line-height:\s*inherit;/s,
    );
  });

  it("keeps only the line list and passage list scrollable", () => {
    expect(css).toMatch(/html,\s*body,\s*#root\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.app-shell\s*{[^}]*height:\s*100vh;[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.sentence-scroll-viewport\s*{[^}]*overflow:\s*auto;/s);
    expect(css).toMatch(/\.session-scroll-viewport\s*{[^}]*overflow:\s*auto;/s);
    expect(css).not.toMatch(/\.workspace\s*{[^}]*overflow:\s*visible;/s);
  });

  it("styles stable Radix selects instead of raw native model controls", () => {
    expect(css).toMatch(/\.select-trigger\s*{[^}]*width:\s*100%;/s);
    expect(css).toMatch(/\.select-trigger\s*{[^}]*white-space:\s*nowrap;/s);
    expect(css).toMatch(/\.model-select-field\s*{[^}]*width:\s*154px;/s);
    expect(css).toMatch(/\.select-content\s*{[^}]*z-index:\s*20;/s);
    expect(css).not.toMatch(/model-select-shell/);
  });

  it("uses a compact vertical layout for shorter desktop windows", () => {
    expect(css).toMatch(/@media \(max-height:\s*700px\)\s*{/);
    expect(css).toMatch(
      /@media \(max-height:\s*700px\)[\s\S]*\.practice-layout\s*{[^}]*grid-template-rows:\s*minmax\(150px, 0\.66fr\) minmax\(130px, 1fr\) auto;/,
    );
    expect(css).toMatch(
      /@media \(max-height:\s*700px\)[\s\S]*\.waveform-expanded-content\s*{[^}]*grid-template-rows:\s*88px 34px;/,
    );
  });

  it("uses quiet ToggleGroup source-list selection instead of custom card effects", () => {
    expect(css).toMatch(/\.sentence-card\[data-state="on"\]\s*{/);
    expect(css).toMatch(/\.session-card\[data-state="on"\]\s*{/);
    expect(css).not.toMatch(/\.sentence-card\.active/);
    expect(css).not.toMatch(/\.session-card\.active/);
    expect(css).not.toMatch(/box-shadow:\s*inset\s+[34]px 0 0/);
  });

  it("does not draw a divider through the selected sentence text", () => {
    expect(css).not.toMatch(/\.selected-sentence-card::before/);
  });

  it("uses a resizable sidebar source list that can fully collapse", () => {
    expect(css).toMatch(/\.app-shell\[data-sidebar-collapsed="true"\]\s*{/);
    expect(css).toMatch(/\.sidebar-icon-button,\s*\.sidebar-restore-button\s*{/);
    expect(css).toMatch(
      /\.sidebar-icon-button,\s*\.sidebar-restore-button\s*{[^}]*border-radius:\s*999px;[^}]*background:\s*transparent;/s,
    );
    expect(css).toMatch(/\.sidebar-icon-button::before,\s*\.sidebar-restore-button::before\s*{/);
    expect(css).toMatch(
      /\.sidebar-icon-button:hover::before,\s*\.sidebar-restore-button:hover::before,/s,
    );
    expect(css).not.toMatch(
      /\.sidebar-icon-button\s*{[^}]*background:\s*rgba\(255, 253, 247/s,
    );
    expect(css).not.toMatch(/\.sidebar-toggle/);
    expect(css).not.toMatch(/\.sidebar-reveal/);
    expect(css).toMatch(
      /\.app-shell\[data-sidebar-collapsed="true"\]\s*{[^}]*grid-template-columns:\s*0 0 minmax\(0, 1fr\);/s,
    );
    expect(css).toMatch(/\.app-shell\[data-sidebar-resizing="true"\]\s*{[^}]*transition:\s*none;/s);
    expect(css).toMatch(/\.app-shell\s*{[^}]*grid-template-columns:\s*var\(--sidebar-width, 248px\) 10px minmax\(0, 1fr\);/s);
    expect(css).toMatch(/\.app-shell\s*{[^}]*transition:\s*grid-template-columns 180ms/s);
    expect(css).toMatch(/\.sidebar\s*{[^}]*background:\s*#f4f1e8;/s);
    expect(css).toMatch(/\.sidebar-resizer\s*{[^}]*cursor:\s*col-resize;/s);
    expect(css).toMatch(/\.sidebar-resizer\s*{[^}]*width:\s*10px;/s);
    expect(css).toMatch(/\.sidebar-resizer::before\s*{[^}]*border-radius:\s*999px;/s);
    expect(css).toMatch(/\.sidebar-resizer::before\s*{[^}]*opacity:\s*0\.58;/s);
  });
});
