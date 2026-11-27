/* Isolated researcher review: parent keeps walkthrough responses in memory only. */
(function (root) {
  'use strict';
  const VERSION='marshall-forced-choice-chs-draft-2026-10-03';
  const params=new URLSearchParams(root.location.search);
  const embedded=root.parent!==root;
  let origin='';
  try { origin=new URL(params.get('parentOrigin')||document.referrer).origin; } catch (_) {}
  const allowedParent=/^https:\/\/(?:childrenhelpingscience\.com|lookit\.mit\.edu)$/.test(origin)||/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin);
  const sessionId=params.get('session_id')||VERSION+'-'+Date.now().toString(36);
  let records=[],screenTime=performance.now(),currentScreen=null,completeSent=false;
  function emit(type,fields){if(embedded&&allowedParent)root.parent.postMessage(Object.assign({type,bridge_version:VERSION,session_id:sessionId},fields),origin);}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function orderFields(session){return {
    care_context:session.care,question_order:session.questionOrder,first_question:session.firstQuestion,
    counterbalance_cell:session.counterbalanceCell,assignment_number:session.assignmentNumber,
    assignment_version:'care-order-v1',question_order_version:'between_participant_order_v1',
    first_rating_side:session.firstRatingSide,meanness_version:'individual-yes-no-degree-v1',
    story_seed:session.storySeed,pairing_order:session.pairingOrder,story_order_version:session.storyOrderVersion
  };}
  function ratingFields(step, response) {
    if (!step.ratedActor) return {};
    const helper = step.pairing.helpers.find(actor => actor.id === step.ratedActor);
    const degreeIndex = step.ratingBranch ? step.choices.indexOf(response) : -1;
    const result = {
      rated_actor_id:helper.id,rated_role:helper.role,rated_side:helper.side,
      rating_position:step.ratingPosition,rating_branch:step.ratingBranch || null
    };
    if (degreeIndex >= 0) {
      result.meanness_score = step.ratingBranch === 'mean' ? 4 + degreeIndex : 3 - degreeIndex;
    }
    return result;
  }
  root.MarshallCHSBridge={
    version:VERSION,embedded,
    screen(step,session,index){if(currentScreen!==step.id){screenTime=performance.now();currentScreen=step.id;emit('MARSHALL_SCREEN',{step_id:step.id,role_set:session.setId,story_index:step.storyIndex??null,step_index:index,...orderFields(session),...ratingFields(step),question_position:step.questionPosition??null});}},
    answer(step,session,response,flags){
      const record={sequence:records.length,study_version:VERSION,role_set:session.setId,practice_mode:session.practiceMode,pairing_id:step.pairing?.id||null,pairing_label:step.pairing?.label||null,story_index:step.storyIndex??null,step_id:step.id,local_step_id:step.localId,phase:step.phase,measure:step.measure||null,proposed_wording:!!step.proposed,narration_script:[step.context,step.preface,step.text].filter(Boolean).join(' '),choices:step.choices||null,response,response_format:step.optionActors?'forced-choice':step.ratingBranch?'three-degree-rating':step.ratedActor?'yes-no-rating':step.point?'character':'check',chosen_actor_id:step.optionActors?.[step.choices?.indexOf(response)]||null,chosen_side:step.optionActors?(step.choices.indexOf(response)===0?'left':step.choices.indexOf(response)===1?'right':null):null,rt:Math.round(performance.now()-screenTime),expected:step.expected||step.point||null,accepted:!!flags.accepted,continued_after_reminder:!!flags.continuedAfterReminder,outcome_replay_count:flags.outcomeReplayCount||0,recorded_at:new Date().toISOString()};
      Object.assign(record,orderFields(session),ratingFields(step,response),{question_position:step.questionPosition??null});
      records.push(record);emit('MARSHALL_RESPONSE',{record:clone(record)});screenTime=performance.now();
    },
    reset(){records=[];screenTime=performance.now();currentScreen=null;completeSent=false;},
    complete(session,answers){if(completeSent)return;completeSent=true;emit('GAME_COMPLETE',{chs_child_id:params.get('child')||'',chs_response_id:params.get('response_uuid')||params.get('response')||'',data_posted:false,payload:{study_version:VERSION,role_set:session.setId,practice_mode:session.practiceMode,...orderFields(session),story_count:session.pairings.length,completed:true,answers:clone(answers),records:clone(records)}});},
    snapshot(){return clone(records);}
  };
})(window);
