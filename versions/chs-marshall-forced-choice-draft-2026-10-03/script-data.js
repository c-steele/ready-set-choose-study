(function (root) {
  'use strict';
  const yesNo = ['Yes', 'No'];
  const helperChoices = ['The kid’s mom', 'The kid’s sister'];
  const steps = [
    {id:'group', phase:'Meet the characters', image:'01-group.png', text:'Oh look! Here is a kid.', note:'Opening adapted to the single kid shown on screen.'},
    {id:'kid', phase:'Meet the kid', image:'02-child.png', text:'This is the kid. Tap the kid.', point:'kid', reminder:'This one in the middle is the kid. Tap the kid.'},
    {id:'mom', phase:'Meet the mom', image:'03-mom.png', text:'This is the kid’s mom. Tap the kid’s mom.', point:'mom', reminder:'This one on the left is the kid’s mom. Tap the kid’s mom.'},
    {id:'sister', phase:'Meet the sister', image:'04-sister.png', text:'This is the kid’s sister. Tap the kid’s sister.', point:'sister', reminder:'This one on the right is the kid’s sister. Tap the kid’s sister.'},
    {id:'need', phase:'The kid needs help', text:'Now let’s say that one day this kid was very sad.'},
    {id:'witness', phase:'Both helpers see', text:'The kid’s mom and the kid’s sister both see that the kid is sad.'},
    {id:'predict-compare', phase:'Who will help?', text:'Who do you think will help the kid in the middle?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice prediction', proposed:true, note:'Two-helper forced-choice adaptation; this is not the original Marshall Study 1 individual Yes/No prediction question.'},
    {id:'practice-intro', phase:'“HAVE TO” practice', image:null, text:'Now, sometimes people HAVE TO do things.'},
    {id:'practice-stop', phase:'Practice · Stop being mean', image:null, visual:'teacher-practice', displayTitle:'Let’s practice!', displaySetup:'A teacher tells you to stop being mean to someone.', displayQuestion:'Do you HAVE TO stop being mean?', text:'When a teacher tells you to stop being mean to someone, do you HAVE TO stop being mean? Yes or No.', choices:yesNo, expected:'Yes', reminder:'When a teacher tells you to stop being mean to someone, you HAVE TO stop being mean. Let’s try that question again.', note:'Brief comprehension practice, not a study outcome. The illustration and split display wording are adaptations. Reminder wording is a draft implementation choice. This compact forced-choice version omits the strength follow-up.'},
    {id:'practice-lie', phase:'Practice · Lie', image:null, text:'When someone asks you a question, do you HAVE TO lie? Yes or No.', choices:yesNo, expected:'No', reminder:'When someone asks you a question, you do not HAVE TO lie. Let’s try that question again.', note:'Brief comprehension practice, not a study outcome. Reminder wording is a draft implementation choice. This compact forced-choice version omits the strength follow-up.'},
    {id:'practice-end', phase:'Back to our story', image:null, text:'So now, I’m going to ask you some questions about whether people HAVE TO do things.'},
    {id:'obligation-compare', phase:'Who HAS TO help?', text:'Who do you think HAS TO help the kid in the middle?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice obligation', proposed:true, note:'Two-helper forced-choice adaptation; this is not the original Marshall Study 1 individual Yes/No obligation question.'},
    {id:'outcome', phase:'What happens next', text:'No one helped the kid. The kid’s mom did NOT help the kid. The kid’s sister did NOT help the kid.', note:'Every response path reaches this same outcome, regardless of prediction or obligation choices.'},
    {id:'recall-all', phase:'Recall · No one helped', text:'Can you tell me, did either of these people help the kid?', choices:yesNo, expected:'No', reminder:'Actually, remember, no one helped the kid. The kid’s mom did NOT help the kid. The kid’s sister did NOT help the kid. Can you tell me, did either of these people help the kid?'},
    {id:'compare', phase:'Who was meaner?', text:'Who was meaner for NOT helping the kid in the middle?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice meanness', proposed:true, note:'Comparison adapted to two helpers and an explicit recipient reference. Buttons follow the scene: mom left, sister right.'},
    {id:'end', phase:'End of this example', image:null, text:'That’s the end of our story. Thank you!', note:'Draft closing wording.'}
  ].map(s => ({image:'05-sad.png', ...s}));
  const draft = {variant:'forced-choice', steps, nextIndex(index) { return index + 1; }};
  if(typeof module !== 'undefined' && module.exports) module.exports=draft;
  root.ObligationDraft=draft;
})(typeof globalThis !== 'undefined' ? globalThis : this);
