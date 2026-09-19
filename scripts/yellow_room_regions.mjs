// Hand-traced object boundaries in the immutable 1536x1024 room illustrations.
// Neutral objects are restored from the geometrically identical gray palette;
// only complete, explicitly selected accent objects receive stronger gold.
const poly = p => `<polygon points="${p}"/>`;
const rect = (x,y,w,h,r=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const trace = d => `<path d="${d}"/>`;

// The spaces between the furniture are wall/baseboard, not part of its outline.
// Trace each component separately so restoring a leg cannot draw a gray wedge
// through the yellow room. Both rear desk legs are included explicitly.
const studentFurniture = [
  trace('M 603 494 L 771 494 Q 776 494 776 500 L 774 515 Q 773 522 766 522 L 591 522 Q 586 522 586 517 L 586 509 Z'),
  rect(607,522,145,22),
  trace('M 597 522 L 608 522 L 606 628 Q 606 634 600 634 Q 594 634 594 629 Z'),
  trace('M 613 543 L 623 543 L 623 610 Q 623 617 618 617 Q 612 617 612 611 Z'),
  trace('M 750 522 L 762 522 L 766 629 Q 766 635 760 635 Q 753 635 753 629 Z'),
  trace('M 759 539 L 765 540 L 769 610 Q 769 616 764 617 Z'),
  trace('M 657 489 Q 633 490 633 514 L 633 541 Q 633 562 648 567 Q 680 574 711 567 Q 726 561 726 540 L 726 513 Q 726 490 701 489 Z'),
  trace('M 642 560 Q 631 560 629 568 Q 627 577 642 580 L 713 580 Q 731 579 734 566 Q 735 557 722 558 L 709 566 L 648 567 Z'),
  trace('M 644 578 L 652 579 L 648 616 Q 648 624 642 624 Q 637 624 638 618 Z'),
  trace('M 636 577 L 647 580 L 636 634 Q 635 642 629 641 Q 624 640 626 633 Z'),
  trace('M 720 576 L 728 576 L 736 615 Q 738 622 732 624 Q 726 625 725 618 Z'),
  trace('M 708 580 L 718 578 L 731 633 Q 733 640 726 642 Q 720 642 719 635 Z'),
  trace('M 868 494 L 1036 494 L 1055 509 L 1055 517 Q 1055 522 1049 522 L 870 522 Q 864 522 864 516 L 864 501 Q 864 496 868 494 Z'),
  rect(886,522,147,22),
  trace('M 875 522 L 887 522 L 884 629 Q 884 635 878 635 Q 871 635 872 629 Z'),
  trace('M 875 539 L 882 539 L 879 611 Q 879 617 874 617 Z'),
  trace('M 1020 543 L 1030 543 L 1031 610 Q 1031 617 1026 617 Q 1019 617 1019 611 Z'),
  trace('M 1035 522 L 1047 522 L 1049 629 Q 1049 635 1043 635 Q 1036 635 1036 629 Z'),
  trace('M 943 489 Q 917 490 917 514 L 917 541 Q 917 562 932 567 Q 964 574 996 567 Q 1012 561 1012 540 L 1012 513 Q 1012 490 987 489 Z'),
  trace('M 921 559 Q 908 557 908 566 Q 909 579 927 581 L 999 581 Q 1015 579 1015 570 Q 1015 562 1004 560 L 993 567 L 933 568 Z'),
  trace('M 913 575 L 922 578 L 914 618 Q 913 625 907 624 Q 901 623 903 617 Z'),
  trace('M 924 579 L 936 580 L 925 634 Q 924 642 917 641 Q 910 640 912 633 Z'),
  trace('M 988 579 L 997 578 L 1001 617 Q 1003 624 997 624 Q 991 625 990 618 Z'),
  trace('M 999 578 L 1010 578 L 1021 633 Q 1023 640 1016 642 Q 1010 642 1008 635 Z'),
].join('');
export function roomNeutralRegions(name) {
  if(name==='school-room') return [
    poly('0,0 177,48 177,425 132,435 0,466'),
    rect(498,82,582,339,13),
    // All desk/chair metal and gray furniture, including their antialias edges.
    poly('175,429 481,428 486,430 486,447 476,457 476,603 470,611 454,611 450,606 450,624 445,630 426,630 425,603 214,603 210,611 188,611 184,604 165,603 165,624 161,630 143,630 141,457 132,454 132,443'),
    studentFurniture,
    rect(1157,403,365,227,5),
    // Preserve the previously repaired bush AND its antialiased window edge;
    // even the matching gray reference differs there by a few pixel values.
    '<rect x="0" y="384" width="34" height="39" fill="black"/>',
  ].join('');
  if(name==='house-room') return [
    // Cabinet frame/books restored as a unit before adding the chosen accents.
    rect(1162,374,340,235,3),
  ].join('');
  return '';
}
export function roomAccentRegions(name) {
  if(name==='school-room') return [
    // Complete pot/cup silhouettes; the desk/window neutral masks must never
    // leave a gray lower half on an otherwise gold accent object.
    trace('M 63 392 Q 62 392 62 396 L 62 404 Q 63 406 65 406 L 66 425 Q 67 431 84 432 Q 99 432 102 427 L 105 405 Q 107 405 107 402 L 107 394 Q 106 392 103 392 Z'),
    trace('M 183 396 Q 181 397 181 400 L 181 407 Q 182 410 185 410 L 188 432 Q 189 438 205 438 Q 221 438 223 432 L 226 410 Q 230 410 230 406 L 230 400 Q 230 397 227 397 Z'),
    trace('M 397 400 Q 395 400 396 405 L 397 434 Q 398 439 412 439 Q 429 439 430 434 L 432 405 Q 433 400 429 400 Z'),
    // Only the board's movable eraser/markers, never its metal frame.
    rect(615,391,49,16,4),rect(841,400,32,8,3),rect(891,400,35,8,3),
    poly('1180,437 1197,436 1199,509 1181,510'),
    poly('1202,437 1217,438 1219,510 1203,511'),
    poly('1244,440 1255,436 1267,508 1252,511'),
    poly('1438,438 1458,442 1446,511 1428,506'),
    poly('1294,449 1384,449 1384,462 1380,511 1300,511 1297,463'),
    poly('1181,541 1271,541 1271,553 1266,609 1186,609 1183,554'),
    poly('1294,546 1387,546 1387,559 1380,609 1300,609 1297,559'),
    poly('1408,542 1497,542 1497,555 1492,609 1413,609 1410,555'),
  ].join('');
  if(name==='house-room') return [
    poly('1201,416 1219,416 1219,482 1202,482'),
    poly('1257,419 1273,418 1273,482 1258,482'),
    poly('1278,414 1295,413 1306,480 1287,483'),
    poly('1461,416 1478,416 1478,482 1462,482'),
    poly('1204,522 1220,521 1220,588 1204,588'),
    poly('1245,526 1262,522 1280,582 1262,588'),
    poly('1295,536 1380,534 1380,546 1370,587 1298,587'),
  ].join('');
  return '';
}
