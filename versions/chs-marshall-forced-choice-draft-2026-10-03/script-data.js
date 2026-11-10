(function (root) {
  'use strict';
  const yesNo = ['Yes', 'No'];
  const meanAmount = ['Not mean', 'A teeny bit mean', 'A little bit mean', 'Very mean'];
  const helperChoices = ['The kid’s mom', 'The kid’s sister'];
  const steps = [
    {id:'group', phase:'Meet the characters', image:'01-group.png', text:'Look! Here are some people.'},
    {id:'kid', phase:'Meet the kid in the middle', image:'02-child.png', text:'This is the kid in the middle.'},
    {id:'mom', phase:'Meet the mom', image:'03-mom.png', text:'This is the kid’s mom.'},
    {id:'sister', phase:'Meet the sister', image:'04-sister.png', text:'This is the kid’s sister.'},
    {id:'need', phase:'The kid in the middle needs help', text:'Oh no! The kid in the middle is sad now!'},
    {id:'witness', phase:'Both helpers see', text:'The kid’s mom and the kid’s sister both see that the kid in the middle is sad.'},
    {id:'predict-compare', phase:'Who will help?', text:'Who will help the kid in the middle now that they’re sad?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice prediction', proposed:true, note:'Two-helper forced-choice adaptation; this is not the original Marshall Study 1 individual Yes/No prediction question.'},
    {id:'obligation-compare', phase:'Who HAS TO help?', text:'Who do you think HAS TO help the kid in the middle?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice obligation', proposed:true, note:'Two-helper forced-choice adaptation; this is not the original Marshall Study 1 individual Yes/No obligation question.'},
    {id:'outcome-summary', phase:'No one helped', displayText:'No one helped the kid in the middle.', outcomeVisual:true, text:'No one helped the kid in the middle.', note:'Standalone outcome statement. Continue after the sentence to hear each helper’s action and the repeated no-one-helped statement.'},
    {id:'outcome', phase:'Each helper did NOT help', displayText:'The kid’s mom did NOT help the kid in the middle.', outcomeCaptions:['The kid’s mom did NOT help the kid in the middle.','The kid’s sister did NOT help the kid in the middle.','No one helped the kid in the middle.'], outcomeVisual:true, text:'The kid’s mom did NOT help the kid in the middle. The kid’s sister did NOT help the kid in the middle. No one helped the kid in the middle.', note:'Every response path reaches this same outcome, regardless of prediction or obligation choices.'},
    {id:'recall-all', phase:'Recall · No one helped', text:'Can you tell me, did either of these people help the kid in the middle?', choices:yesNo, expected:'No', replayFrom:'outcome-summary'},
    {id:'compare', phase:'Who was meaner?', text:'Who was meaner for NOT helping the kid in the middle?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice meanness', proposed:true, note:'Comparison adapted to two helpers and an explicit recipient reference. Buttons follow the scene: mom left, sister right.'},
    {id:'compare-helper1-amount', phase:'Selected helper · How mean?', text:'How mean do you think the kid’s mom was for NOT helping the kid in the middle?', choices:meanAmount, when:['compare','The kid’s mom'], measure:'Selected helper meanness strength', proposed:true, note:'Added strength rating for the helper selected as meaner. This follows the comparison and is an adaptation.'},
    {id:'compare-helper2-amount', phase:'Selected helper · How mean?', text:'How mean do you think the kid’s sister was for NOT helping the kid in the middle?', choices:meanAmount, when:['compare','The kid’s sister'], measure:'Selected helper meanness strength', proposed:true, note:'Added strength rating for the helper selected as meaner. This follows the comparison and is an adaptation.'},
    {id:'evaluation-mom', unless:['compare','The kid’s mom'], phase:'Individual evaluation · Mom', text:'Do you think it was Mean or Not Mean that the kid’s mom did NOT help the kid in the middle?', choices:['Mean','Not Mean'], measure:'Individual evaluation'},
    {id:'evaluation-mom-amount', unless:['compare','The kid’s mom'], phase:'Meanness strength · Mom', text:'How mean do you think the kid’s mom was for NOT helping the kid in the middle?', displayText:'How mean do you think the kid’s mom was for NOT helping the kid in the middle?', choices:meanAmount, measure:'Individual meanness strength'},
    {id:'evaluation-sister', unless:['compare','The kid’s sister'], phase:'Individual evaluation · Sister', text:'Do you think it was Mean or Not Mean that the kid’s sister did NOT help the kid in the middle?', choices:['Mean','Not Mean'], measure:'Individual evaluation'},
    {id:'evaluation-sister-amount', unless:['compare','The kid’s sister'], phase:'Meanness strength · Sister', text:'How mean do you think the kid’s sister was for NOT helping the kid in the middle?', displayText:'How mean do you think the kid’s sister was for NOT helping the kid in the middle?', choices:meanAmount, measure:'Individual meanness strength'},
    {id:'end', phase:'End of this example', image:null, text:'That’s the end of our story. Thank you!', note:'Draft closing wording.'}
  ].map(s => ({image:'05-sad.png', ...s, ...(s.point || s.expected ? {requireCorrect:true, allowBypass:false} : {})}));
  const draft = {variant:'forced-choice', steps, nextIndex(index, answers) { let next=index+1; while(next<steps.length && (steps[next].when && answers[steps[next].when[0]] !== steps[next].when[1] || steps[next].unless && answers[steps[next].unless[0]] === steps[next].unless[1])) next++; return next; }};
  if(typeof module !== 'undefined' && module.exports) module.exports=draft;
  root.ObligationDraft=draft;
})(typeof globalThis !== 'undefined' ? globalThis : this);
