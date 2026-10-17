// What Farmer Jones and Bob (Boer Johan and Pieter) say when they meet at
// the gate, in Afrikaans and English ({ af, en }: src/i18n.js). A line is
// [who, text]; at a { choose } you pick which of two replies Jones says (the
// pick is his answer, it isn't shown again), and `then` is how Bob answers
// that reply before the talk goes on. A reply with `flag` sets that story
// flag: 'gavePie' sends Bob off to the farmhouse to eat the pie.
const YUMMY = ['bob', { af: 'Njammie!', en: 'Yummy!' }];

export const FIRST_MEETING = [
  ['bob', { af: 'Môre, Johan! Uiteindelik op, nè?', en: 'Morning, Jones! Finally up, are we?' }],
  { choose: [
    { say: { af: 'Môre, Pieter! Ek het ’n goeie boek gelees en soos ’n klip geslaap.', en: 'Morning, Bob! Read a good book and slept like a log.' }, then: [
      ['bob', {
        af: 'Gelukkige jy! Terwyl jy gesnork het, het ’n jakkals om jou hoenders rondgesnuffel.',
        en: 'Lucky you! While you were snoring, a fox was sniffing round your chickens.',
      }],
    ] },
    { say: { af: 'Op? Ek is al ure lank op! …Nou ja, minute.', en: "Up? I've been up for hours! ...Well, minutes." }, then: [
      ['bob', {
        af: 'Ha! Wel, terwyl jy gesnork het, het ’n jakkals om jou hoenders rondgesnuffel.',
        en: 'Ha! Well, while you were snoring, a fox was sniffing round your chickens.',
      }],
    ] },
  ] },
  { choose: [
    { say: { af: '’n Jakkals?! Is die henne veilig?', en: 'A fox?! Are the hens alright?' }, then: [
      ['bob', { af: 'Hulle makeer niks. Ek het hom met my pet weggejaag. Jy skuld my ’n tert!', en: 'Right as rain. I chased him off with my cap. You owe me a pie!' }],
    ] },
    { say: { af: 'Die henne het vir my orraait gelyk…', en: 'The hens looked fine to me...' }, then: [
      ['bob', { af: 'Ja, want ek het hom met my pet weggejaag. Jy skuld my ’n tert!', en: 'Aye, because I chased him off with my cap. You owe me a pie!' }],
    ] },
  ] },
  { choose: [
    { say: { af: 'Ek het gisteraand een gebak. Die helfte staan op die kombuistafel!', en: "I baked one last night. Half of it's on the kitchen table!" }, flag: 'gavePie', then: [
      YUMMY,
    ] },
    { say: { af: '’n Hele tert? Omdat jy jou pet rondgeswaai het?', en: 'A whole pie? For waving your cap about?' }, then: [
      ['bob', { af: 'Hmf! Hou dan maar jou tert.', en: 'Hmph! Keep your pie, then.' }],
    ] },
  ] },
];

// Talking again: Bob is only still at the gate if he didn't get the pie.
export const AGAIN = [
  ['bob', { af: 'Nog steeds hier, Johan? Van plan verander oor daai tert?', en: 'Still here, Jones? Changed your mind about that pie?' }],
  { choose: [
    { say: { af: 'Toe maar, die res staan op die kombuistafel.', en: 'Go on then, the rest is on the kitchen table.' }, flag: 'gavePie', then: [
      YUMMY,
    ] },
    { say: { af: 'Nie ’n kans nie, Pieter!', en: 'Not a chance, Bob!' }, then: [
      ['bob', { af: 'Hmf! Dit was die moeite werd om te probeer.', en: 'Hmph! Worth a try.' }],
    ] },
  ] },
];
