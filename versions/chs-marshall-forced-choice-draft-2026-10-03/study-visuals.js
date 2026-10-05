(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ObligationStudyVisuals=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  // Measured from each unmodified need stimulus, in its original 1920 × 1080
  // image coordinates. The scene displays y=120…960. Intro bounds differ from
  // the need artwork in several adult-recipient stories, so they are not used.
  const eyeGeometry={"woman-mom-teacher":{"helper1":[{"white":[268.0,348.0,49.5],"pupil":[277.5,357.5,33.0]},{"white":[413.0,348.0,49.5],"pupil":[423.5,358.0,32.75]}],"helper2":[{"white":[1505.0,348.0,49.5],"pupil":[1494.5,357.5,33.0]},{"white":[1650.0,348.0,49.5],"pupil":[1640.5,358.0,32.75]}]},"woman-sister-friend":{"helper1":[{"white":[240.0,539.5,36.75],"pupil":[250.0,541.0,24.5]},{"white":[344.5,539.5,37.0],"pupil":[354.0,541.0,24.5]}],"helper2":[{"white":[1558.0,539.5,36.75],"pupil":[1548.0,541.0,24.5]},{"white":[1662.5,539.5,37.0],"pupil":[1652.0,541.0,24.5]}]},"woman-bestfriend-friend":{"helper1":[{"white":[240.0,539.5,36.75],"pupil":[250.0,541.0,24.5]},{"white":[344.5,539.5,37.0],"pupil":[354.0,541.0,24.5]}],"helper2":[{"white":[1558.0,539.5,36.75],"pupil":[1548.0,541.0,24.5]},{"white":[1662.5,539.5,37.0],"pupil":[1652.0,541.0,24.5]}]},"woman-teacher-friend":{"helper1":[{"white":[295.0,348.0,49.5],"pupil":[304.5,357.5,33.0]},{"white":[440.0,348.0,49.5],"pupil":[450.5,358.0,32.75]}],"helper2":[{"white":[1535.0,539.5,36.75],"pupil":[1526.0,543.0,24.5]},{"white":[1639.5,539.5,37.0],"pupil":[1630.0,543.0,24.5]}]},"woman-mom-sister":{"helper1":[{"white":[295.0,348.0,49.5],"pupil":[304.5,357.5,33.0]},{"white":[440.0,348.0,49.5],"pupil":[450.5,358.0,32.75]}],"helper2":[{"white":[1535.0,539.5,36.75],"pupil":[1526.0,543.0,24.5]},{"white":[1639.5,539.5,37.0],"pupil":[1630.0,543.0,24.5]}]},"woman-teacher-classmate":{"helper1":[{"white":[251.0,539.5,36.25],"pupil":[262.5,540.0,24.25]},{"white":[355.5,539.5,36.5],"pupil":[367.0,540.0,24.5]}],"helper2":[{"white":[1473.0,345.0,49.5],"pupil":[1462.5,354.5,33.0]},{"white":[1618.0,345.0,49.5],"pupil":[1608.0,355.0,33.0]}]},"man-dad-teacher":{"helper1":[{"white":[268.0,348.0,49.5],"pupil":[277.5,357.5,33.0]},{"white":[413.0,348.0,49.5],"pupil":[423.5,358.0,32.75]}],"helper2":[{"white":[1505.0,348.0,49.5],"pupil":[1494.5,357.5,33.0]},{"white":[1650.0,348.0,49.5],"pupil":[1640.5,358.0,32.75]}]},"man-brother-friend":{"helper1":[{"white":[240.0,539.5,36.75],"pupil":[250.0,541.0,24.5]},{"white":[344.5,539.5,37.0],"pupil":[354.0,541.0,24.5]}],"helper2":[{"white":[1558.0,539.5,36.75],"pupil":[1548.0,541.0,24.5]},{"white":[1662.5,539.5,37.0],"pupil":[1652.0,541.0,24.5]}]},"man-bestfriend-friend":{"helper1":[{"white":[240.0,539.5,36.75],"pupil":[250.0,541.0,24.5]},{"white":[344.5,539.5,37.0],"pupil":[354.0,541.0,24.5]}],"helper2":[{"white":[1558.0,539.5,36.75],"pupil":[1548.0,541.0,24.5]},{"white":[1662.5,539.5,37.0],"pupil":[1652.0,541.0,24.5]}]},"man-teacher-friend":{"helper1":[{"white":[295.0,348.0,49.5],"pupil":[304.5,357.5,33.0]},{"white":[440.0,348.0,49.5],"pupil":[450.5,358.0,32.75]}],"helper2":[{"white":[1535.0,539.5,36.75],"pupil":[1526.0,543.0,24.5]},{"white":[1639.5,539.5,37.0],"pupil":[1630.0,543.0,24.5]}]},"man-dad-brother":{"helper1":[{"white":[295.0,348.0,49.5],"pupil":[304.5,357.5,33.0]},{"white":[440.0,348.0,49.5],"pupil":[450.5,358.0,32.75]}],"helper2":[{"white":[1535.0,539.5,36.75],"pupil":[1526.0,543.0,24.5]},{"white":[1639.5,539.5,37.0],"pupil":[1630.0,543.0,24.5]}]},"man-teacher-classmate":{"helper1":[{"white":[251.0,539.5,36.25],"pupil":[262.5,540.0,24.25]},{"white":[355.5,539.5,36.5],"pupil":[367.0,540.0,24.5]}],"helper2":[{"white":[1473.0,345.0,49.5],"pupil":[1462.5,354.5,33.0]},{"white":[1618.0,345.0,49.5],"pupil":[1608.0,355.0,33.0]}]},"family-mom-dad":{"helper1":[{"white":[268.0,348.0,49.5],"pupil":[277.5,357.5,33.0]},{"white":[413.0,348.0,49.5],"pupil":[423.5,358.0,32.75]}],"helper2":[{"white":[1505.0,348.0,49.5],"pupil":[1494.5,357.5,33.0]},{"white":[1650.0,348.0,49.5],"pupil":[1640.5,358.0,32.75]}]},"family-sister-brother":{"helper1":[{"white":[240.0,539.5,36.75],"pupil":[250.0,541.0,24.5]},{"white":[344.5,539.5,37.0],"pupil":[354.0,541.0,24.5]}],"helper2":[{"white":[1558.0,539.5,36.75],"pupil":[1548.0,541.0,24.5]},{"white":[1662.5,539.5,37.0],"pupil":[1652.0,541.0,24.5]}]},"family-dad-kid":{"helper1":[{"white":[295.0,348.0,49.5],"pupil":[306.5,350.5,33.0]},{"white":[440.0,348.0,49.5],"pupil":[452.5,351.0,32.75]}],"helper2":[{"white":[1535.0,539.5,36.75],"pupil":[1525.5,534.5,25.0]},{"white":[1639.5,539.5,37.0],"pupil":[1631.5,534.5,25.0]}]},"family-mom-kid":{"helper1":[{"white":[252.0,539.5,36.75],"pupil":[262.0,537.0,24.5]},{"white":[356.5,539.5,37.0],"pupil":[366.0,537.0,24.5]}],"helper2":[{"white":[1473.0,345.0,49.5],"pupil":[1459.5,348.5,33.0]},{"white":[1618.0,345.0,49.5],"pupil":[1605.0,349.0,33.0]}]},"family-teacher-kid":{"helper1":[{"white":[295.0,348.0,49.5],"pupil":[306.5,350.5,33.0]},{"white":[440.0,348.0,49.5],"pupil":[452.5,351.0,32.75]}],"helper2":[{"white":[1536.0,539.5,36.75],"pupil":[1526.0,534.5,24.75]},{"white":[1639.5,539.5,37.0],"pupil":[1631.0,534.5,24.75]}]},"family-teacher-classmate":{"helper1":[{"white":[251.0,539.5,36.25],"pupil":[262.5,540.0,24.25]},{"white":[355.5,539.5,36.5],"pupil":[367.0,540.0,24.5]}],"helper2":[{"white":[1473.0,345.0,49.5],"pupil":[1462.5,354.5,33.0]},{"white":[1618.0,345.0,49.5],"pupil":[1608.0,355.0,33.0]}]}};
  // Actual need-scene bounds including each role-label bar, with 5 original
  // pixels of padding. These differ from introductory artwork for adult
  // recipients and their small-child helper; percentages use the 1920 × 840 crop.
  const needActorBounds={"woman-mom-teacher":{"recipient":[39.948,33.571,20,61.19],"helper1":[3.229,4.762,29.375,90],"helper2":[67.292,4.762,29.323,90]},"woman-sister-friend":{"recipient":[39.74,33.571,20,61.19],"helper1":[3.906,32.024,22.813,62.738],"helper2":[72.656,32.024,22.865,62.738]},"woman-bestfriend-friend":{"recipient":[39.74,33.571,20,61.19],"helper1":[3.906,32.024,22.813,62.738],"helper2":[72.656,32.024,22.865,62.738]},"woman-teacher-friend":{"recipient":[42.5,33.571,20,61.19],"helper1":[4.688,4.762,29.375,90],"helper2":[71.406,32.024,22.865,62.738]},"woman-mom-sister":{"recipient":[42.5,33.571,20,61.19],"helper1":[4.688,4.762,29.375,90],"helper2":[71.406,32.024,22.865,62.738]},"woman-teacher-classmate":{"recipient":[36.823,33.571,20,61.19],"helper1":[4.688,32.024,22.813,62.857],"helper2":[65.99,4.762,29.375,90]},"man-dad-teacher":{"recipient":[39.948,33.69,20,61.071],"helper1":[3.229,4.762,29.375,90],"helper2":[67.292,4.762,29.323,90]},"man-brother-friend":{"recipient":[39.74,33.571,20,61.19],"helper1":[3.906,32.024,22.813,62.738],"helper2":[72.656,32.024,22.865,62.738]},"man-bestfriend-friend":{"recipient":[39.74,33.571,20,61.19],"helper1":[3.906,32.024,22.813,62.738],"helper2":[72.656,32.024,22.865,62.738]},"man-teacher-friend":{"recipient":[42.5,33.571,20,61.19],"helper1":[4.688,4.762,29.375,90],"helper2":[71.406,32.024,22.865,62.738]},"man-dad-brother":{"recipient":[42.5,33.571,20,61.19],"helper1":[4.688,4.762,29.375,90],"helper2":[71.406,32.024,22.865,62.738]},"man-teacher-classmate":{"recipient":[36.823,33.571,20,61.19],"helper1":[4.688,32.024,22.813,62.857],"helper2":[65.99,4.762,29.375,90]},"family-mom-dad":{"recipient":[39.948,33.571,20,61.19],"helper1":[3.229,4.762,29.375,90],"helper2":[67.292,4.762,29.323,90]},"family-sister-brother":{"recipient":[39.74,33.571,20,61.19],"helper1":[3.906,32.024,22.813,62.738],"helper2":[72.708,32.024,22.813,62.738]},"family-dad-kid":{"recipient":[40.365,6.429,26.354,88.333],"helper1":[4.688,4.762,29.375,90],"helper2":[71.406,32.024,22.865,62.738]},"family-mom-kid":{"recipient":[33.594,5.952,26.354,88.81],"helper1":[4.531,32.024,22.813,62.738],"helper2":[65.625,4.762,29.375,90]},"family-teacher-kid":{"recipient":[40.365,6.429,26.354,88.333],"helper1":[4.688,4.762,29.375,90],"helper2":[71.406,32.024,22.865,62.738]},"family-teacher-classmate":{"recipient":[36.823,33.571,20,61.19],"helper1":[4.688,32.024,22.813,62.857],"helper2":[65.99,4.762,29.375,90]}};
  function actorBoundsFor(step,actorId){
    if(!step?.pairing||step.image!==step.pairing.images.need)return null;
    const bounds=needActorBounds[step.pairing.id]?.[actorId];
    return bounds?bounds.slice():null;
  }
  function shouldLookAway(step){
    return Boolean(step?.pairing&&step.image===step.pairing.images.need&&(step.nonhelpingScene===true||/^(outcome(?:-summary)?|recall-.+|overall(?:-amount)?|evaluation-.+|compare)$/.test(step.localId)));
  }
  function eyesForPairing(pairing){
    const geometry=eyeGeometry[typeof pairing==='string'?pairing:pairing?.id];
    return geometry?JSON.parse(JSON.stringify(geometry)):null;
  }
  function nonhelpingEyeOverlay(step){
    if(!shouldLookAway(step))return '';
    const geometry=eyesForPairing(step.pairing);
    if(!geometry)return '';
    const source=step.pairing.images.need;
    const prefix='look-down-'+String(step.id||step.pairing.id).replace(/[^a-z\d-]/gi,'-');
    const pupils=[];
    for(const helper of step.pairing.helpers){
      for(const [eyeIndex,eye] of geometry[helper.id].entries()){
        const [cx,cy,radius]=eye.white,[px,py,pupilRadius]=eye.pupil;
        // Match the second nothelp.key reference: centered, downward pupils.
        // Leave a small white margin so the copied pupil stays within its eye.
        const targetX=cx,targetY=cy+Math.max(0,radius-pupilRadius-1.25);
        const deltaX=targetX-px,deltaY=targetY-py;
        const id=prefix+'-'+helper.id+'-'+eyeIndex;
        // Erase only the old pupil within its existing white eye. Copy the
        // original pupil pixels, including their shape and antialiasing, to the
        // downward position. Two circle clips keep changes inside that same eye;
        // no body, mouth, sadness mark, role label, or source image is replaced.
        pupils.push(`<g class="look-down-eye" data-look-down-helper="${esc(helper.id)}" data-gaze-direction="down">
          <defs><clipPath id="${id}-eye"><circle cx="${cx}" cy="${cy-120}" r="${radius}"/></clipPath><clipPath id="${id}-pupil"><circle cx="${targetX}" cy="${targetY-120}" r="${pupilRadius+.75}"/></clipPath></defs>
          <g clip-path="url(#${id}-eye)"><circle cx="${cx}" cy="${cy-120}" r="${radius}" fill="#fff"/><image href="${esc(source)}" x="${deltaX}" y="${deltaY-120}" width="1920" height="1080" preserveAspectRatio="none" clip-path="url(#${id}-pupil)"/></g>
        </g>`);
      }
    }
    return `<svg class="nonhelping-gaze-overlay" viewBox="0 0 1920 840" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${pupils.join('')}</svg>`;
  }
  function paletteMatrix(accent){
    const source=[129,214,83].map(value=>value/255),target=accent.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16)/255);
    const mean=source.reduce((sum,value)=>sum+value,0)/3,direction=source.map(value=>value-mean),norm=direction.reduce((sum,value)=>sum+value*value,0),vector=direction.map(value=>value/norm);
    return target.flatMap((value,i)=>vector.map((v,j)=>(i===j?1:0)+(value-source[i])*v).concat([0,0])).concat([0,0,0,1,0]).join(' ');
  }
  function liePracticeArtwork(step){
    const source=root.ObligationPairings?.pairings.find(pairing=>pairing.id==='woman-mom-teacher')?.images.group;
    if(!source)return '';
    const accent=step.pairing?.visualHex||'#f5b236';
    const id='lie-practice-palette-'+String(step.id||'practice-lie').replace(/[^a-z\d-]/gi,'-');
    // Same original adult and child pixels, crop, scale, and role-label type as
    // the existing teacher practice. The neutral question/answer bubbles do not
    // add an unspoken story, model a lie, or depict a new human character.
    return `<svg class="practice-artwork lie-practice-artwork" viewBox="0 0 900 390" role="img" aria-label="Someone asks you a question. You can answer. The child is labeled YOU." xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${paletteMatrix(accent)}"/></filter></defs>
      <svg x="145" y="62" width="215" height="281" viewBox="100 160 490 640"><image href="${esc(source)}" width="1920" height="1080" filter="url(#${id})"/></svg>
      <svg x="595" y="179" width="180" height="172" viewBox="760 390 410 390"><image href="${esc(source)}" width="1920" height="1080" filter="url(#${id})"/></svg>
      <path class="practice-bubble question-bubble" d="M364 28 H484 Q501 28 501 45 V97 Q501 114 484 114 H375 L327 141 L349 104 Q347 100 347 94 V45 Q347 28 364 28Z"/>
      <text class="lie-question-symbol" x="424" y="92" text-anchor="middle">?</text>
      <path class="practice-bubble answer-bubble" d="M581 65 H729 Q746 65 746 82 V119 Q746 136 729 136 H672 L676 167 L645 136 H581 Q564 136 564 119 V82 Q564 65 581 65Z"/>
      <text class="lie-answer-symbol" x="655" y="111" text-anchor="middle">…</text>
      <rect x="173" y="350" width="159" height="34" fill="${accent}"/><rect x="631" y="350" width="108" height="34" fill="${accent}"/>
      <text class="practice-role-label" x="252.5" y="376" text-anchor="middle">SOMEONE</text><text class="practice-role-label" x="685" y="376" text-anchor="middle">YOU</text>
      <rect class="practice-actor-cue" data-narration-actor="practice-someone" x="140" y="59" width="225" height="329" rx="8" aria-hidden="true"/>
      <rect class="practice-actor-cue" data-narration-actor="practice-you" x="589" y="175" width="191" height="213" rx="8" aria-hidden="true"/>
    </svg>`;
  }
  return {actorBoundsFor,shouldLookAway,eyesForPairing,nonhelpingEyeOverlay,liePracticeArtwork,paletteMatrix};
});
