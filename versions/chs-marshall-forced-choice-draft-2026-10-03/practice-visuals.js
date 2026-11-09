(function(root){
  'use strict';
  function introduction(step){
    const transition=step.visual==='practice-transition';
    return `<div class="practice-welcome"><svg class="practice-welcome-art" viewBox="0 0 920 440" role="img" aria-label="A smiling face and a speech bubble saying HAVE TO" xmlns="http://www.w3.org/2000/svg">
      <path d="m110 68 8 22 23 1-18 15 6 23-20-13-19 13 6-23-18-15 23-1Z" fill="#f4c86a"/>
      <path d="m800 318 7 18 19 1-15 12 5 19-16-11-16 11 5-19-15-12 19-1Z" fill="#a9d4c7"/>
      <circle cx="245" cy="246" r="139" fill="#e6daef"/>
      <circle cx="238" cy="232" r="134" fill="#ffda68" stroke="#fff" stroke-width="13"/>
      <ellipse cx="199" cy="208" rx="13" ry="20" fill="#233848"/><ellipse cx="276" cy="208" rx="13" ry="20" fill="#233848"/>
      <path d="M198 253 H278 A40 40 0 0 1 198 253" fill="#233848"/>
      <path d="M440 91 H778 Q810 91 810 123 V252 Q810 284 778 284 H487 L408 339 L426 281 Q407 271 407 249 V123 Q407 91 440 91Z" fill="#fff" stroke="#d7c2e9" stroke-width="7"/>
      <text x="609" y="207" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="69" font-weight="800" fill="#654184">HAVE TO${transition?'?':''}</text>
    </svg></div>`;
  }
  function traffic(){
    return `<svg class="practice-artwork traffic-practice-artwork" viewBox="0 0 1000 430" role="img" aria-label="A blue car stopped behind a white line at a red traffic light. No people or role labels." xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="20" width="956" height="390" rx="30" fill="#f2f8fc"/>
      <path d="M22 292 H978 V380 Q978 410 948 410 H52 Q22 410 22 380Z" fill="#c8d1df"/>
      <path d="M22 292 H978" stroke="#a3b4a3" stroke-width="10"/>
      <path d="M55 365 H160 M226 365 H331 M397 365 H502 M568 365 H673 M812 365 H917" stroke="#fff" stroke-width="9"/>
      <path d="M720 310 V400" stroke="#fff" stroke-width="17"/>
      <path d="M821 182 V288" stroke="#52657c" stroke-width="16"/>
      <rect x="769" y="31" width="104" height="206" rx="27" fill="#34465e"/>
      <circle cx="821" cy="76" r="27" fill="#ff555a" stroke="#ffb8b8" stroke-width="6"/>
      <circle cx="821" cy="134" r="24" fill="#5c6170"/><circle cx="821" cy="191" r="24" fill="#4a6165"/>
      <path d="M258 242 301 162 Q311 144 335 144 H475 Q497 144 512 165 L566 242Z" fill="#5b97d8"/>
      <path d="M316 174 Q320 166 336 166 H392 V236 H282Z M410 166 H474 Q482 166 494 182 L534 236 H410Z" fill="#dff2ff"/>
      <rect x="203" y="231" width="421" height="101" rx="34" fill="#5b97d8"/>
      <path d="M225 265 H600" stroke="#88b9e9" stroke-width="5"/>
      <rect x="598" y="251" width="28" height="26" rx="7" fill="#fff2bc"/>
      <rect x="208" y="254" width="16" height="23" rx="5" fill="#ff6d72"/>
      <rect x="427" y="250" width="37" height="8" rx="4" fill="#315d91"/>
      <circle cx="292" cy="326" r="44" fill="#34465e"/><circle cx="292" cy="326" r="22" fill="#d8e3ef"/>
      <circle cx="541" cy="326" r="44" fill="#34465e"/><circle cx="541" cy="326" r="22" fill="#d8e3ef"/>
    </svg>`;
  }
  root.ObligationPracticeVisuals={introduction,traffic};
})(window);
