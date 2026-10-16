// What Farmer Jones and Bob say when they meet at the gate. A line is
// [who, text]; at a { choose } you pick which of two replies Jones says (the
// pick is his answer, it isn't shown again), and `then` is how Bob answers
// that reply before the talk goes on. A reply with `flag` sets that story
// flag: 'gavePie' sends Bob off to the farmhouse to eat the pie.
export const FIRST_MEETING = [
  ['bob', 'Morning, Jones! Finally up, are we?'],
  { choose: [
    { say: 'Morning, Bob! Read a good book and slept like a log.', then: [
      ['bob', 'Lucky you! While you were snoring, a fox was sniffing round your chickens.'],
    ] },
    { say: "Up? I've been up for hours! ...Well, minutes.", then: [
      ['bob', 'Ha! Well, while you were snoring, a fox was sniffing round your chickens.'],
    ] },
  ] },
  { choose: [
    { say: 'A fox?! Are the hens alright?', then: [
      ['bob', 'Right as rain. I chased him off with my cap. You owe me a pie!'],
    ] },
    { say: 'The hens looked fine to me...', then: [
      ['bob', 'Aye, because I chased him off with my cap. You owe me a pie!'],
    ] },
  ] },
  { choose: [
    { say: "I baked one last night. It's on the kitchen table!", flag: 'gavePie', then: [
      ['bob', 'Yummy!'],
    ] },
    { say: 'A whole pie? For waving your cap about?', then: [
      ['bob', 'Hmph! Keep your pie, then.'],
    ] },
  ] },
];

// Talking again: Bob is only still at the gate if he didn't get the pie.
export const AGAIN = [
  ['bob', 'Still here, Jones? Changed your mind about that pie?'],
  { choose: [
    { say: "Go on then, it's on the kitchen table.", flag: 'gavePie', then: [
      ['bob', 'Yummy!'],
    ] },
    { say: 'Not a chance, Bob!', then: [
      ['bob', 'Hmph! Worth a try.'],
    ] },
  ] },
];
