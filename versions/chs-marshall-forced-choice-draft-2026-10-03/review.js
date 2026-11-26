'use strict';

const sets = [
  ['woman', 'Mom and sister'],
  ['man', 'Dad and brother'],
  ['family', 'Family and teacher']
];
const careTypes = [
  ['hug', 'Giving a hug'],
  ['food', 'Sharing strawberries'],
  ['help', 'Helping with a heavy box']
];
const orders = [
  ['will-first', 'WILL then HAS TO'],
  ['has-to-first', 'HAS TO then WILL']
];
const sampleSeed = '513458116';
const board = document.getElementById('versions');
const orderTemplate = document.getElementById('order-template');
const setFilter = document.getElementById('set-filter');
const careFilter = document.getElementById('care-filter');
const orderFilter = document.getElementById('order-filter');

function addHeading(parent, level, text) {
  const heading = document.createElement(level);
  heading.textContent = text;
  parent.append(heading);
}

for (const [set, setName] of sets) {
  const section = document.createElement('section');
  section.className = 'set-section';
  section.dataset.set = set;
  addHeading(section, 'h2', setName + ' set');
  const grid = document.createElement('div');
  grid.className = 'review-grid';
  section.append(grid);
  for (const [care, careName] of careTypes) {
    const card = document.createElement('article');
    card.className = 'review-card is-audio-mode';
    card.dataset.care = care;
    addHeading(card, 'h3', careName);
    for (const [order, orderName] of orders) {
      const row = orderTemplate.content.firstElementChild.cloneNode(true);
      row.dataset.order = order;
      row.querySelector('h4').textContent = orderName;
      const url = new URL('index.html', location.href);
      url.search = new URLSearchParams({
        view: 'child', set, care, questionOrder: order, storySeed: sampleSeed, choiceBoxes: '1', slides: '1'
      }).toString();
      const context = [setName, careName, orderName].join(', ');
      const open = row.querySelector('.review-open');
      open.href = url.href;
      open.setAttribute('aria-label', 'Open narrated preview, ' + context);
      const jump = row.querySelector('.jump-link');
      url.searchParams.set('choicePreview', '1');
      jump.href = url.href;
      jump.setAttribute('aria-label', 'Jump to first choice, ' + context);
      card.append(row);
    }
    grid.append(card);
  }
  board.append(section);
}

function filterVersions() {
  let visible = 0;
  for (const section of board.children) {
    section.hidden = Boolean(setFilter.value && setFilter.value !== section.dataset.set);
    for (const card of section.querySelectorAll('[data-care]')) {
      card.hidden = Boolean(careFilter.value && careFilter.value !== card.dataset.care);
      for (const row of card.querySelectorAll('[data-order]')) {
        row.hidden = Boolean(orderFilter.value && orderFilter.value !== row.dataset.order);
        if (!section.hidden && !card.hidden && !row.hidden) visible++;
      }
    }
  }
  document.getElementById('count').textContent = visible === 18 ? 'All 18 versions' : visible + ' of 18 versions';
}
for (const [select, values] of [[setFilter, sets], [careFilter, careTypes], [orderFilter, orders]]) {
  for (const [value, label] of values) select.add(new Option(label, value));
  select.addEventListener('change', filterVersions);
}
filterVersions();
