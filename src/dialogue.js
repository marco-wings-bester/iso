// What Farmer Jones and Bob say when they meet at the gate. A line is
// [who, text]; at a { choose } you pick which of two replies Jones says, and
// `then` is how Bob answers that reply before the talk goes on.
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
    { say: "There's one on the kitchen table. It's yours!", then: [
      ['bob', "Now you're talking! See you at the market, neighbour."],
    ] },
    { say: 'A whole pie? For waving your cap about?', then: [
      ['bob', 'Hmph! A cup of tea, then. See you at the market, neighbour.'],
    ] },
  ] },
];

export const AGAIN = [
  ['bob', 'Still here, Jones? Lovely morning for it.'],
  { choose: [
    { say: "It is! I'm off for a walk round the farm.", then: [
      ['bob', 'Mind that fox!'],
    ] },
    { say: 'Keep an eye on my hens for me, Bob?', then: [
      ['bob', "Only if there's pie in it!"],
    ] },
  ] },
];
