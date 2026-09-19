// Geometry-only masks for the yellow hallway illustrations (1672 × 941).
// White selects painted walls/accents. Black preserves neutral source details.
const rect = (x, y, width, height, fill = 'black', extra = '') =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" ${extra}/>`;
const polygon = (points, fill = 'black') => `<polygon points="${points}" fill="${fill}"/>`;
const path = (d, fill = 'black') => `<path d="${d}" fill="${fill}"/>`;

function schoolHall() {
  return rect(0, 0, 1672, 941, 'white')
    // Ceiling, floor, and complete neutral door surrounds.
    + polygon('209,0 1462,0 1344,87 325,87')
    + polygon('0,816 276,646 1346,646 1672,815 1672,941 0,941')
    + polygon('46,63 61,63 220,150 220,696 53,794 46,791')
    + polygon('1451,149 1610,63 1626,63 1626,791 1618,796 1451,696')
    + rect(684, 165, 305, 486)
    + rect(719, 196, 237, 443, 'white')
    + rect(719, 515, 237, 125)
    + polygon('716,192 792,229 792,640 716,640')
    + rect(766, 440, 31, 25)
    // The distant classroom board remains neutral, including its tray.
    + rect(789, 297, 151, 132)
    // Distant desk tops, metal legs, and chair silhouettes.
    + polygon('790,457 849,457 860,464 860,477 855,477 855,538 849,538 849,477 796,477 796,538 790,538')
    + rect(790, 453, 54, 51, 'black', 'rx="17"')
    + polygon('791,497 800,497 797,538 790,538')
    + polygon('835,497 842,497 846,538 839,538')
    + polygon('876,457 937,457 951,463 951,477 947,477 947,538 941,538 941,477 882,477 882,538 876,538')
    + rect(898, 452, 54, 52, 'black', 'rx="17"')
    + polygon('897,497 906,497 902,538 895,538')
    + polygon('943,497 950,497 955,538 948,538')
    + rect(839, 473, 14, 19)
    + rect(879, 473, 22, 19)
    // Gray cubbies, hooks, and board frames are never recolored.
    + rect(273, 411, 386, 259)
    + rect(1044, 246, 268, 239)
    // Clean silhouettes of the two themed backpacks and three storage bins.
    + path('M313 478 C313 465 338 465 339 480 Q352 490 350 511 L350 562 Q350 576 339 578 L306 578 Q294 575 294 563 L296 503 Q296 485 313 478Z', 'white')
    + path('M449 510 C449 499 465 499 465 511 Q479 516 479 532 L478 572 Q478 581 467 582 L445 581 Q435 579 435 568 L436 531 Q436 515 449 510Z', 'white')
    + polygon('295,604 352,604 351,615 348,617 348,646 300,647 299,616 295,615', 'white')
    + polygon('430,604 486,604 485,615 482,616 482,647 434,647 433,616 430,615', 'white')
    + polygon('573,604 635,604 633,615 630,616 630,647 578,647 576,616 573,615', 'white')
    + rect(1208, 280, 71, 86, 'white', 'rx="3"')
    + rect(1185, 379, 65, 76, 'white', 'rx="3"')
    + '<circle cx="1086" cy="292" r="5" fill="white"/><circle cx="1161" cy="292" r="5" fill="white"/>';
}

function houseHall() {
  return rect(0, 0, 1672, 941, 'white')
    // Main floor and white baseboards. The painted foreground door stays yellow.
    + polygon('133,811 421,634 574,634 574,680 1104,680 1104,634 1251,634 1672,916 1672,941 133,941')
    // Neutral doorway; recolor only its visible room interior.
    + rect(573, 30, 532, 651)
    + rect(621, 79, 436, 561, 'white')
    + rect(621, 451, 436, 190)
    + path('M666 383 Q664 372 672 366 Q680 362 695 360 L692 348 Q691 342 697 341 L705 341 Q705 315 730 314 L961 314 Q981 314 991 322 Q1004 331 1006 362 Q1015 365 1016 378 L1012 440 Q1010 452 998 456 L682 457 Q669 456 668 444Z')
    + polygon('621,220 666,220 681,278 621,278')
    + rect(635, 276, 11, 179)
    + rect(657.5, 275, 3, 20)
    + '<ellipse cx="659" cy="296" rx="2.6" ry="3.6" fill="black"/>'
    + rect(1027, 318, 31, 148)
    + path('M1051 206 L1058 206 L1058 245 L1049 245 Q1040 238 1047 222 L1051 219Z')
    // Picture: preserve the white mat, color the frame and center field.
    + rect(778, 176, 176, 119)
    + '<rect x="783" y="180" width="165" height="110" fill="none" stroke="white" stroke-width="5"/>'
    + rect(799, 194, 133, 80, 'white')
    // Coat-hook panel, neutral mirror glass/frame/shadow, and wooden bench.
    + polygon('141,108 378,166 379,235 140,195')
    + path('M1376 112 Q1376 96 1392 88 L1508 30 Q1527 22 1537 42 L1540 416 Q1540 436 1523 435 L1386 413 Q1374 410 1374 395Z')
    + polygon('144,673 343,565 466,565 464,730 344,799 344,676 307,698 295,870 151,873 149,708 144,704')
    // Neutral table top and its four individual legs: wall gaps remain yellow.
    + polygon('1275,470 1388,465 1617,530 1616,548 1487,565 1275,510')
    + polygon('1297,496 1476,550 1476,611 1297,538')
    + polygon('1505,548 1583,546 1583,604 1505,614')
    + polygon('1287,505 1308,513 1308,789 1291,795 1287,788')
    + polygon('1364,530 1386,536 1387,789 1370,791 1364,785')
    + polygon('1470,554 1508,560 1508,941 1486,941')
    + polygon('1578,548 1604,547 1604,941 1578,941')
    // Preserve the warm metal door hardware rather than boosting it.
    + '<ellipse cx="111" cy="435" rx="14" ry="25" fill="black"/>'
    + '<ellipse cx="108" cy="529" rx="16" ry="30" fill="black"/>'
    + rect(108, 517, 32, 26)
    + '<ellipse cx="144" cy="530" rx="20" ry="29" fill="black"/>';
}

export function makeHallMask(name, width = 1672, height = 941) {
  if (width !== 1672 || height !== 941) throw new Error('Yellow hallway geometry must be 1672 × 941');
  const shapes = name === 'school-hall' ? schoolHall() : name === 'house-hall' ? houseHall() : null;
  if (!shapes) throw new Error(`Unknown yellow hallway: ${name}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941" viewBox="0 0 1672 941">${shapes}</svg>`;
}
