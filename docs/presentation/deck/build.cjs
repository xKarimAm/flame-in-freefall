// Firebreak deck: node build.cjs <imgDir> <out.pptx>
// Slide text and speaker notes are copied from docs/presentation/DECK.md (footnote marks removed).
const pptxgen = require('pptxgenjs');
const { applyTheme } = require('C:/Users/Admin/.claude/skills/synced/528239f7-4a10-45db-a5c4-d808e07297c7_6decb9e7-a70b-40f1-953d-b5dc60f57a28/pptx/scripts/apply_theme.js');
const [imgDir, outFile] = process.argv.slice(2);
const LOGO = 'E:/flame-in-freefall/docs/brand/logo.png';

// colours from web/src/styles/tokens.css
const THEME = {
  name: 'Firebreak',
  headFontFace: 'Calibri', bodyFontFace: 'Calibri',
  colors: {
    dk1: '151622', lt1: 'FFFFFF', dk2: '1B1B1B', lt2: 'DFE1E2',
    accent1: 'FF5804', accent2: '2491FF', accent3: 'E7F434', accent4: '1B2B85', accent5: 'FFA630', accent6: 'E52207',
    hlink: '2491FF', folHlink: '2491FF',
  },
};

const SLIDES = [
  {
    title: 'The most serious events had extra oxygen',
    lines: [
      'Apollo 1, 1967: a cabin of pure oxygen. Three crew died.',
      'NASA\u2019s review: \u201CAll of the most serious events were in the presence of enhanced oxygen.\u201D',
      'Moon-base plan: 33.7 to 40 % oxygen, 56.5 kPa. Earth air: 21 %.',
    ],
    img: 's1.png', caption: 'Firebreak, Student lens, chapter 1: Why oxygen matters',
    notes: 'In 1967, Apollo 1 burned in a ground test, in a cabin of pure oxygen. The crew of three died. In 1997, an oxygen generator fire filled the Mir station with smoke. NASA\u2019s own review says all of the most serious events had extra oxygen. Now NASA plans Moon-base air with 33.7 to 40 percent oxygen, at a bit over half of Earth\u2019s pressure. Earth air is 21 percent. So the question is simple. How much real fire evidence do we have for that air? That is what Firebreak shows.',
  },
  {
    title: 'NASA\u2019s fire tests on one footing',
    lines: [
      '22 investigations, 1,883 test rows, each linked to its PSI record.',
      '986 are plotted. The other 897 are listed, with the reason.',
      'Unreadable cells stay empty. Nothing is guessed.',
    ],
    img: 's2.png', caption: 'Firebreak, Student lens, chapter 2: What NASA has tested',
    notes: 'We took NASA\u2019s Physical Sciences Informatics archive, which is public. Our snapshot has 22 investigations and 1,883 test rows. Each study wrote its table differently, so we converted every unit to percent oxygen and kilopascals, and kept the file and row of every test. A test goes on the chart only if both oxygen and pressure were recorded. That is 986 tests. The other 897 are listed, with the reason. When a cell cannot be read, it stays empty with its raw text. We never fill it with a guess.',
  },
  {
    title: 'Live demo: pick an air',
    lines: [
      'Dashboard, Compare, Method.',
      'Then the story: set an air, read the answer.',
      'Last stop: the empty Moon-gravity plane.',
    ],
    img: 's3.png', caption: 'Firebreak, Analyst lens, Dashboard tab',
    notes: 'Now the product, live. Two minutes. I start on the dashboard: five numbers, then every investigation ranked for Moon-base air. I open the top two side by side. Then the Method page, which shows where each number comes from and which checks ran. Then I go back to the story, set an air with the sliders, and read the answer. The last stop is an empty plane. If the site fails, I show this still and say the same words.',
  },
  {
    title: 'Where the evidence stops',
    lines: [
      'None of the tests in NASA\u2019s PSI archive ran in Moon gravity.',
      'The first experiment in real Moon gravity, FM2, is planned for late 2026.',
      'The list is \u201Cnearest tested conditions, not a prediction.\u201D',
    ],
    img: 's4.png', caption: 'Firebreak, Student lens, chapter 4: What nobody knows yet',
    notes: 'Here is the honest part. None of the tests in NASA\u2019s PSI archive ran in Moon gravity. The Moon-gravity numbers we show come from NASA papers, not from PSI. One paper gives oxygen margins from 0.32 to 2.3 points for six materials. The first experiment in real Moon gravity, called FM2, is planned for late 2026. So Firebreak lists the nearest tested conditions and says plainly that this is not a prediction. We do not call any investigation safer or more dangerous. We show where the evidence stops.',
  },
  {
    title: 'How it was built, why trust it',
    lines: [
      'Every number links to a PSI row or to a NASA source with a URL.',
      'AI-written text is tagged with model and time. Its quotes are checked in code.',
      'Claude and Meta Muse Spark built it. The Method tab lists the checks.',
    ],
    img: 's5.png', caption: 'Firebreak, Analyst lens, Method tab: automated checks and how AI was used',
    notes: 'Every number links to a PSI row, or to a NASA paper with a URL. Data files follow written contracts, and tests check them. On AI: Claude, called Fable, planned and supervised. Claude Sonnet wrote the first wave of code and reviewed everything. Meta Muse Spark wrote much of the code overnight, and the library text. The 22 investigation summaries are tagged Claude Sonnet. Every AI string carries its model and time, and its quotes are checked against the PSI text in code.\n\nClose (say it, then stop): Firebreak puts NASA\u2019s space-fire tests in one picture, and shows where that evidence stops: none of these tests ran in Moon gravity.',
  },
];

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = 'Firebreak';
  pres.author = 'Firebreak';
  const C = pres.SchemeColor;

  // one frame: dark ground, mark and name top left, title and three lines on the left, the screen on the right
  pres.defineSlideMaster({
    title: 'SCREEN',
    background: { color: THEME.colors.dk1 },
    objects: [
      { image: { path: LOGO, x: 0.6, y: 0.45, w: 0.42, h: 0.42 } },
      { text: { text: 'Firebreak', options: { x: 1.1, y: 0.45, w: 3, h: 0.42, margin: 0, fontSize: 16, bold: true, color: C.background1, valign: 'middle' } } },
      { text: { text: 'NASA Space Apps 2026 \u00B7 Flame in Freefall', options: { x: 6.0, y: 6.85, w: 5.9, h: 0.3, margin: 0, fontSize: 10, color: C.background2, align: 'right' } } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 1.25, w: 4.7, h: 1.9, margin: 0, fontSize: 36, bold: true, color: C.background1, valign: 'top', align: 'left' }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 3.35, w: 4.7, h: 3.2, margin: 0, fontSize: 18, color: C.background1, valign: 'top', align: 'left' }, text: '' } },
    ],
    slideNumber: { x: 12.1, y: 6.85, w: 0.63, h: 0.3, fontSize: 10, color: C.background2, align: 'right' },
  });

  pres.addSection({ title: 'Firebreak' });
  SLIDES.forEach((s, i) => {
    const slide = pres.addSlide({ masterName: 'SCREEN', sectionTitle: 'Firebreak' });
    slide.addText(s.title, { placeholder: 'title' });
    slide.addText(s.lines.map((text, k) => ({ text, options: { breakLine: k < s.lines.length - 1, paraSpaceAfter: 14 } })), { placeholder: 'body' });
    // the screen: 1440 x 900 still, 16:10
    slide.addImage({ path: `${imgDir}/${s.img}`, x: 5.9, y: 1.25, w: 6.83, h: 4.27, objectName: `Screen ${i + 1}`, altText: s.caption });
    slide.addText(s.caption, { x: 5.9, y: 5.62, w: 6.83, h: 0.3, margin: 0, isTextBox: true, fontSize: 11, color: C.background2, objectName: `Caption ${i + 1}` });
    slide.addNotes(s.notes);
  });

  await pres.writeFile({ fileName: outFile });
  await applyTheme(outFile, THEME);
  console.log('wrote', outFile);
})();
