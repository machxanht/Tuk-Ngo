/* Canonical 2.5D entry; explicit legacy demo links remain available. */
(()=>{
 const demo=new URLSearchParams(location.search).get('demo');
 if(!demo||demo==='2d')location.replace(new URL('assets/illustrated-v22/',location.href));
})();
