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
  mmenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mmenu.classList.add('hidden');
    mbtn.setAttribute('aria-expanded','false');
    mbtn.setAttribute('aria-label','Open menu');
  }));

  // FAQ accordion: close others in the same group
  document.querySelectorAll('details.faq').forEach(d=>{
    d.addEventListener('toggle',()=>{
      if(d.open) d.parentElement.querySelectorAll('details.faq[open]').forEach(o=>{ if(o!==d) o.open=false; });
    });
  });

  /* ---------- Service-page enquiry forms ----------
     Each service page carries one form in its closing CTA. They POST to
     the same endpoint as the homepage, but tag the lead with the service
     it came from, so an enquiry from Northern Tours is not confused with
     an airport pickup. */
  const ENDPOINT='api/lead.php';
  const loadedAt=Date.now();

  document.querySelectorAll('form.svc-form').forEach(form=>{
    const msgEl=form.querySelector('.svc-msg');
    const btn=form.querySelector('button[type=submit]');
    const label=btn.querySelector('[data-label]');
    let sent=false;

    function show(text,ok){
      msgEl.textContent=text;
      msgEl.classList.remove('hidden');
      msgEl.style.color=ok?'#8FCB9B':'#F0A0A0';   // set inline: these never appear in the markup
    }

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(sent) return;

      const f=new FormData(form);
      if(f.get('company')) return;                 // honeypot

      const name=(f.get('name')||'').trim();
      const phone=(f.get('phone')||'').trim();
      if(name.length<2){ show('Please enter your name.',false); return; }
      if((phone.match(/\d/g)||[]).length<9){ show('Please enter a valid phone number.',false); return; }

      const original=label.textContent;
      btn.disabled=true; label.textContent='Sending...';
      try{
        const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            name, phone,
            message:(f.get('message')||'').trim(),
            type:form.dataset.service||'Service enquiry',
            tag:form.dataset.tag||'',
            company:'', elapsed:Date.now()-loadedAt
          })});
        const d=await r.json().catch(()=>({ok:false}));
        if(d.ok){
          sent=true;
          show(d.message||'Thank you. We will be in touch shortly.',true);
          label.textContent='Sent';
          form.querySelectorAll('input').forEach(i=>i.disabled=true);
        }else{
          show(d.message||'That did not send. Please WhatsApp us on +92 313 5251392.',false);
          btn.disabled=false; label.textContent=original;
        }
      }catch(err){
        show('Network problem. Please WhatsApp us on +92 313 5251392.',false);
        btn.disabled=false; label.textContent=original;
      }
    });
  });
})();
