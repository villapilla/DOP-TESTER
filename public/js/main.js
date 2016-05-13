/*
global $
*/
$(document).ready(function() {   
    var sideslider = $('[data-toggle=collapse-side]'),
        sel = sideslider.attr('data-target'),
        sel2 = sideslider.attr('data-target-2');
    sideslider.click(function(event){
        $(sel).toggleClass('in');
        $(sel2).toggleClass('out');
    });
    $("#log_git button").hover(function() {
        $("#log_git img").attr("src","/modules/users/client/img/buttons/git_negro.png");
    }, function () {
        $("#log_git img").attr("src","/modules/users/client/img/buttons/git_blanco.png");
    });

});