// Deterministic teaching models: no network, real gifts, accounts or AI calls.
export class GiftExperiment {
 constructor(){this.reset();}
 reset(){this.owner=null;this.results=[];}
 reserve(buyer){const ok=this.owner===null;if(ok)this.owner=buyer;this.results.push({buyer,ok});return ok;}
 race(){this.reset();return ['Alex','Sam'].map(b=>({buyer:b,ok:this.reserve(b)}));}
 view(audience){return audience==='recipient'?{gift:'Studio headphones',wish:'On your wishlist'}:{gift:'Studio headphones',reservedBy:this.owner,status:this.owner?'Reserved':'Available'};}
}
export class EditExperiment {
 constructor(){this.reset();}
 reset(){this.code='print("Hello")';this.revision=0;this.proposal=null;this.undoState=null;}
 edit(code){if(this.code!==code){this.code=code;this.revision++;}}
 propose(){this.proposal={base:this.revision,before:this.code,code:this.code+'\n# Reviewed sample suggestion'};return this.proposal;}
 apply(){if(!this.proposal)return 'missing';if(this.proposal.base!==this.revision)return 'stale';this.undoState={before:this.code,appliedRevision:this.revision+1};this.code=this.proposal.code;this.revision++;this.proposal=null;return 'applied';}
 undo(){if(!this.undoState)return 'missing';if(this.revision!==this.undoState.appliedRevision)return 'stale';this.code=this.undoState.before;this.revision++;this.undoState=null;return 'undone';}
}
