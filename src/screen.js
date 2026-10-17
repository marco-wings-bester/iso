// The game draws at the phone's full resolution (main.js): its canvas has a
// pixel for every pixel of the screen, shown at the page's size. Sizes meant
// for the screen (text, bubbles, buttons, walking speed) are given in page
// px and multiplied by UI, the screen's pixels per page px (at most 2: sharp
// enough to read easily, and light enough for older phones to keep up).
export const UI = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
