/* Progressive enhancement only: native details work without script.
   No height animation, scroll interception, forced accordion closure or AI calls. */
(() => {
  function enhance(root=document) {
    root.querySelectorAll('.project-showcase .project-detail').forEach(detail => {
      if (detail.dataset.projectEnhanced) return;
      const summary=detail.querySelector(':scope > summary');
      if (!summary) return;
      detail.dataset.projectEnhanced='true';
      const sync=()=>{detail.dataset.expanded=String(detail.open);};
      detail.addEventListener('toggle',sync);
      sync();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>enhance(),{once:true});
  else enhance();
})();
