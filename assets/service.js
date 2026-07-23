/* Shared behaviour for Mandil service pages */
(function(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal on scroll
  const io = new IntersectionObserver((es)=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), {threshold:.15, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));

  // Stagger children
  document.querySelectorAll('[data-stagger]').forEach(root=>{
    root.querySelectorAll(':scope > [data-reveal]').forEach((el,i)=>{
      el.style.transitionDelay=(i%4*0.09)+'s';
    });
  });

  // Scroll progress + sticky nav + hero parallax
  const bar=document.getElementById('progress');
  const nav=document.getElementById('site-nav');
  const heroMedia=document.getElementById('hero-media');
  let lastY=window.scrollY, ticking=false;
  function onScroll(){
    const y=window.scrollY;
    const max=document.documentElement.scrollHeight-innerHeight;
    if(bar) bar.style.transform='scaleX('+(max>0?Math.min(y/max,1):0)+')';
    if(nav){
      nav.classList.toggle('solid', y>60);
      if(y>420 && y>lastY+4) nav.classList.add('hide');
      else if(y<lastY-4 || y<=420) nav.classList.remove('hide');
    }
    if(heroMedia && !reduced && y<innerHeight){
      heroMedia.style.transform='translate3d(0,'+(y*0.32)+'px,0)';
      heroMedia.style.opacity=String(Math.max(1-y/(innerHeight*0.9),0));
    }
    lastY=y; ticking=false;
  }
  addEventListener('scroll',()=>{ if(!ticking){ ticking=true; requestAnimationFrame(onScroll); } },{passive:true});
  onScroll();

  // Mobile menu
  const mbtn=document.getElementById('menu-btn');
  const mmenu=document.getElementById('mobile-menu');
  mbtn?.addEventListener('click',()=>{
    const open=!mmenu.classList.toggle('hidden');
    mbtn.setAttribute('aria-expanded',String(open));
    mbtn.setAttribute('aria-label',open?'Close menu':'Open menu');
  });

  // FAQ accordion: close others in the same group
  document.querySelectorAll('details.faq').forEach(d=>{
    d.addEventListener('toggle',()=>{
      if(d.open) d.parentElement.querySelectorAll('details.faq[open]').forEach(o=>{ if(o!==d) o.open=false; });
    });
  });
})();
