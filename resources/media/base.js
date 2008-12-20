/************************************************
 * Display a busy image on top of the given element
 ************************************************/
function setBusy (elemt) {
  if (elemt) {
     var pos = elemt.position ();
  } else {
     elemt = $(document.body);
     var pos = {top:0, left:0};
  }
  var mark = $("<div class='throbber'/>")
     .css ({left:elemt.left, top:elemt.top,
            width:elemt.width(), height:elemt.height()});
  elemt.before (mark);
}

function unsetBusy (elemt) {
  $(".throbber", elemt).remove ();
}

