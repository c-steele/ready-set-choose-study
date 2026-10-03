(function (root) {
  'use strict';
  const yesNo = ['Yes', 'No'];
  const amount = ['A teeny bit', 'A little bit', 'A lot'];
  const meanAmount = ['A teeny bit mean', 'A little bit mean', 'Very mean'];
  const steps = [
    {id:'group', phase:'Meet the characters', image:'01-group.png', text:'Look! Here are some people.', note:'Opening line from Find the Caregiver.'},
    {id:'kid', phase:'Meet the kid', image:'02-child.png', text:'This is the kid. Tap the kid.', point:'kid', reminder:'This one in the middle is the kid. Tap the kid.'},
    {id:'mom', phase:'Meet the mom', image:'03-mom.png', text:'This is the kid’s mom. Tap the kid’s mom.', point:'mom', reminder:'This one on the left is the kid’s mom. Tap the kid’s mom.'},
    {id:'sister', phase:'Meet the sister', image:'04-sister.png', text:'This is the kid’s sister. Tap the kid’s sister.', point:'sister', reminder:'This one on the right is the kid’s sister. Tap the kid’s sister.'},
    {id:'need', phase:'The kid needs help', text:'Now let’s say that one day this kid was very sad.'},
    {id:'witness', phase:'Both helpers see', text:'The kid’s mom and the kid’s sister both see that the kid is sad.'},
    {id:'predict-mom', phase:'Prediction · Mom', text:'Now, do you think the kid’s mom will help the kid?', choices:yesNo, measure:'Prediction'},
    {id:'predict-sister', phase:'Prediction · Sister', text:'Now, do you think the kid’s sister will help the kid?', choices:yesNo, measure:'Prediction'},
    {id:'practice-intro', phase:'“HAVE TO” practice', image:null, text:'Now, sometimes people HAVE TO do things.'},
    {id:'practice-stop', phase:'Practice · Stop being mean', image:null, visual:'teacher-practice', displayTitle:'Let’s practice!', displaySetup:'A teacher tells you to stop being mean to someone.', displayQuestion:'Do you HAVE TO stop being mean?', text:'When a teacher tells you to stop being mean to someone, do you HAVE TO stop being mean? Yes or No.', choices:yesNo, expected:'Yes', reminder:'When a teacher tells you to stop being mean to someone, you HAVE TO stop being mean. Let’s try that question again.', note:'Practice, not a study outcome. The illustration and split display wording are new adaptations. The downloaded script retains the full Marshall practice prompt. Reminder wording is a draft implementation choice.'},
    {id:'practice-stop-amount', phase:'Practice · How much', image:null, text:'How much do you think you HAVE TO stop being mean?', choices:amount, when:['practice-stop','Yes'], note:'Practice routing is a draft choice; strength is not marked right or wrong.'},
    {id:'practice-lie', phase:'Practice · Lie', image:null, text:'When someone asks you a question, do you HAVE TO lie? Yes or No.', choices:yesNo, expected:'No', reminder:'When someone asks you a question, you do not HAVE TO lie. Let’s try that question again.', note:'Practice, not a study outcome. Reminder wording is a draft implementation choice.'},
    {id:'practice-lie-amount', phase:'Practice · How much', image:null, text:'How much do you think you HAVE TO lie?', choices:amount, when:['practice-lie','Yes'], note:'Shown if the facilitator continues after a Yes response. Original practice follow-up routing is unverified.'},
    {id:'practice-end', phase:'Back to our story', image:null, text:'So now, I’m going to ask you some questions about whether people HAVE TO do things.'},
    {id:'obligation-mom', phase:'Obligation · Mom', text:'Now, do you think the kid’s mom HAS TO help the kid? Yes or No.', choices:yesNo, measure:'Obligation'},
    {id:'obligation-mom-amount', phase:'Obligation strength · Mom', text:'How much do you think she HAS TO?', displayText:'How much do you think the kid’s mom HAS TO?', choices:amount, when:['obligation-mom','Yes'], context:'The kid’s mom', measure:'Obligation strength'},
    {id:'obligation-sister', phase:'Obligation · Sister', text:'Now, do you think the kid’s sister HAS TO help the kid? Yes or No.', choices:yesNo, measure:'Obligation'},
    {id:'obligation-sister-amount', phase:'Obligation strength · Sister', text:'How much do you think she HAS TO?', displayText:'How much do you think the kid’s sister HAS TO?', choices:amount, when:['obligation-sister','Yes'], context:'The kid’s sister', measure:'Obligation strength'},
    {id:'outcome', phase:'What happens next', text:'No one helped the kid. The kid’s mom did NOT help the kid. The kid’s sister did NOT help the kid.', note:'Every response path reaches this same outcome, regardless of prediction or obligation answers.'},
    {id:'recall-all', phase:'Recall · No one helped', text:'Can you tell me, did either of these people help the kid?', choices:yesNo, expected:'No', reminder:'Actually, remember, no one helped the kid. The kid’s mom did NOT help the kid. The kid’s sister did NOT help the kid. Can you tell me, did either of these people help the kid?'},
    {id:'overall', phase:'Overall evaluation', preface:'No one helped the kid.', text:'Do you think this was a mean or nice thing that happened?', choices:['Mean','Nice'], measure:'Overall evaluation', note:'Exploratory measure in Marshall Study 1.'},
    {id:'overall-amount', phase:'Overall evaluation strength', text:'How mean was the thing that happened?', choices:['A tiny bit mean','A little bit mean','A lot mean'], when:['overall','Mean'], proposed:true, measure:'Overall evaluation strength', note:'PROPOSED PROMPT AND RESPONSE WORDING: the supplement confirms these score levels, but the exact spoken follow-up and response wording were not recovered.'},
    {id:'recall-mom', phase:'Recall · Mom', text:'Do you remember, did the kid’s mom help the kid?', choices:yesNo, expected:'No', reminder:'Remember, the kid’s mom did not help the kid. Do you remember, did the kid’s mom help the kid?'},
    {id:'evaluation-mom', phase:'Individual evaluation · Mom', text:'Do you think it was Mean or Not Mean that the kid’s mom did NOT help the kid in the middle?', choices:['Mean','Not Mean'], measure:'Individual evaluation'},
    {id:'evaluation-mom-amount', phase:'Meanness strength · Mom', text:'How mean do you think the kid’s mom was for NOT helping the kid in the middle?', displayText:'How mean do you think the kid’s mom was for NOT helping the kid in the middle?', choices:meanAmount, when:['evaluation-mom','Mean'], measure:'Individual meanness strength'},
    {id:'recall-sister', phase:'Recall · Sister', text:'Do you remember, did the kid’s sister help the kid?', choices:yesNo, expected:'No', reminder:'Remember, the kid’s sister did not help the kid. Do you remember, did the kid’s sister help the kid?'},
    {id:'evaluation-sister', phase:'Individual evaluation · Sister', text:'Do you think it was Mean or Not Mean that the kid’s sister did NOT help the kid in the middle?', choices:['Mean','Not Mean'], measure:'Individual evaluation'},
    {id:'evaluation-sister-amount', phase:'Meanness strength · Sister', text:'How mean do you think the kid’s sister was for NOT helping the kid in the middle?', displayText:'How mean do you think the kid’s sister was for NOT helping the kid in the middle?', choices:meanAmount, when:['evaluation-sister','Mean'], measure:'Individual meanness strength'},
    {id:'compare', phase:'Compare the helpers', text:'Who was meaner for not helping?', choices:['The kid’s mom','The kid’s sister'], measure:'Pairwise evaluation', note:'Exploratory comparison. Buttons follow the scene: mom left, sister right.'},
    {id:'end', phase:'End of this example', image:null, text:'That’s the end of our story. Thank you!', note:'Draft closing wording. This preview contains one mom–sister story.'}
  ].map(s => ({image:'05-sad.png', ...s}));
  const draft = {steps, nextIndex(index, answers) { let next=index+1; while(next<steps.length && steps[next].when && answers[steps[next].when[0]] !== steps[next].when[1]) next++; return next; }};
  if(typeof module !== 'undefined' && module.exports) module.exports=draft;
  root.ObligationDraft=draft;
})(typeof globalThis !== 'undefined' ? globalThis : this);
