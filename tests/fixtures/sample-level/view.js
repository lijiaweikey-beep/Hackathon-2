export function showSampleIntro(ui) {
  ui.showOverlay("sampleIntro", {
    className: "sample-intro",
    html: "<strong>样例关卡开始</strong>",
  });
}

export function hideSampleIntro(ui) {
  ui.hideOverlay("sampleIntro");
}
