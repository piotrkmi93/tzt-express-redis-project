window.addEventListener('load', () => {
  var path = window.location.pathname,
      items = document.querySelectorAll('ul.nav.navbar-nav li a');
  for(let it of items)
    if(0 === path.indexOf(it.getAttribute("href")))
      it.parentElement.className += " active";
});
