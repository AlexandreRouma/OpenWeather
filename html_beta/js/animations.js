$(document).ready(function () {
    var retracted = false;
    $("#retract").click(function () {
        if (!retracted) {
            $(".sidebar-button-text").hide();
            $(".sidebar").animate({width: '65px'}, 300);
            $(".content").animate({left: '65px'}, 300);

            $({xyz: 250}).animate({xyz: 65}, {
                duration: 300,
                step: function (now) {
                    $(":root").css({'--sidebar-width': now});
                }
            });

            $("#retract-icon").html("<i class=\"fa fa-angle-right\" style=\"font-size:20px;\">");

            retracted = true;
        }
        else {
            $(".sidebar").animate({width: '250px'}, 300, function () {
                $(".sidebar-button-text").show();
            });
            $(".content").animate({left: '250px'}, 300);

            $({xyz: 65}).animate({xyz: 250}, {
                duration: 300,
                step: function (now) {
                    $(":root").css({'--sidebar-width': now});
                }
            });

            $("#retract-icon").html("<i class=\"fa fa-angle-left\" style=\"font-size:20px;\">");
            retracted = false;
        }
    });

    $(".breakable").click(function(){
        $(this).remove();
    });
});