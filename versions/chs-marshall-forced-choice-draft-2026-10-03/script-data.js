(function (root) {
  'use strict';
  const yesNo = ['Yes', 'No'];
  const helperChoices = ['The kid’s mom', 'The kid’s sister'];
  function ratingsFor(helper, recipient, ratingPosition) {
    const binaryId = `evaluation-${helper.id}`;
    const role = helper.description;
    const shared = {ratedActor:helper.id, ratingPosition};
    const binary = {...shared, id:binaryId, phase:`Was ${role} mean?`,
      text:`Do you think ${role} was mean for not helping ${recipient}?`,
      choices:yesNo, measure:'Individual evaluation'};
    const followups = yesNo.map(answer => {
      const direction = answer === 'Yes' ? 'mean' : 'not mean';
      const ratingBranch = direction.replace(' ', '-');
      const text = `How ${direction} was ${role}?`;
      return {...shared, id:`${binaryId}-${ratingBranch}`, phase:text, text,
        choices:['A tiny bit', 'A little bit', 'Very'].map(degree => `${degree} ${direction}`),
        when:[binaryId, answer], ratingBranch, measure:'Individual meanness strength'};
    });
    return [binary, ...followups];
  }
  const steps = [
    {id:'group', phase:'Meet the characters', image:'01-group.png', text:'Look! Here are some people.'},
    {id:'kid', phase:'Meet the kid in the middle', image:'02-child.png', text:'This is the kid in the middle.'},
    {id:'mom', phase:'Meet the mom', image:'03-mom.png', text:'This is the kid’s mom.'},
    {id:'sister', phase:'Meet the sister', image:'04-sister.png', text:'This is the kid’s sister.'},
    {id:'need', phase:'The kid in the middle needs help', text:'Oh no! The kid in the middle is sad now!'},
    {id:'witness', phase:'Both helpers see', text:'The kid’s mom and the kid’s sister both see that the kid in the middle is sad.'},
    {id:'predict-compare', phase:'Who will help?', text:'Who will help the kid in the middle now that they’re sad?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice prediction', proposed:true, note:'Two-helper forced-choice adaptation; this is not the original Marshall Study 1 individual Yes/No prediction question.'},
    {id:'obligation-compare', phase:'Who HAS TO help?', text:'Who HAS TO help the kid in the middle?', choices:helperChoices, optionActors:['helper1','helper2'], measure:'Forced-choice obligation', proposed:true, note:'Two-helper forced-choice adaptation; this is not the original Marshall Study 1 individual Yes/No obligation question.'},
    {id:'outcome-summary', phase:'No one helped', displayText:'No one helped the kid in the middle.', outcomeVisual:true, text:'No one helped the kid in the middle.', note:'Standalone outcome statement. Continue after the sentence to hear each helper’s action and the repeated no-one-helped statement.'},
    {id:'outcome', phase:'Each helper did NOT help', displayText:'The kid’s mom did NOT help the kid in the middle.', outcomeCaptions:['The kid’s mom did NOT help the kid in the middle.','The kid’s sister did NOT help the kid in the middle.','No one helped the kid in the middle.'], outcomeVisual:true, text:'The kid’s mom did NOT help the kid in the middle. The kid’s sister did NOT help the kid in the middle. No one helped the kid in the middle.', note:'Every response path reaches this same outcome, regardless of prediction or obligation choices.'},
    {id:'recall-all', phase:'Recall · No one helped', text:'Can you tell me, did either of these people help the kid in the middle?', choices:yesNo, expected:'No', replayFrom:'outcome-summary'},
    ...ratingsFor({id:'helper1', description:'the kid’s mom'}, 'the kid in the middle', 1),
    ...ratingsFor({id:'helper2', description:'the kid’s sister'}, 'the kid in the middle', 2),
    {id:'end', phase:'End of this example', image:null, text:'That’s the end of our story. Thank you!', note:'Draft closing wording.'}
  ].map(s => ({image:'05-sad.png', ...s, ...(s.point || s.expected ? {requireCorrect:true, allowBypass:false} : {})}));
  const draft = {variant:'forced-choice', steps, ratingsFor, nextIndex(index, answers) { let next=index+1; while(next<steps.length && (steps[next].when && answers[steps[next].when[0]] !== steps[next].when[1] || steps[next].unless && answers[steps[next].unless[0]] === steps[next].unless[1])) next++; return next; }};
  if(typeof module !== 'undefined' && module.exports) module.exports=draft;
  root.ObligationDraft=draft;
})(typeof globalThis !== 'undefined' ? globalThis : this);
