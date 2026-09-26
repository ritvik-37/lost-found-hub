try {
  var saved = localStorage.getItem('lf-theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
} catch (e) {
  /* storage blocked: fall back to the OS preference */
}
