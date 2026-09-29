/*!
    * Start Bootstrap - Agency v6.0.3 (https://startbootstrap.com/theme/agency)
    * Copyright 2013-2020 Start Bootstrap
    * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-agency/blob/master/LICENSE)
    */
    (function ($) {
    "use strict"; // Start of use strict

    // Smooth scrolling using jQuery easing
    $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function () {
        if (
            location.pathname.replace(/^\//, "") ==
                this.pathname.replace(/^\//, "") &&
            location.hostname == this.hostname
        ) {
            var target = $(this.hash);
            target = target.length
                ? target
                : $("[name=" + this.hash.slice(1) + "]");
            if (target.length) {
                $("html, body").animate(
                    {
                        scrollTop: target.offset().top - 72,
                    },
                    1000,
                    "easeInOutExpo"
                );
                return false;
            }
        }
    });

    // Closes responsive menu when a scroll trigger link is clicked
    $(".js-scroll-trigger").click(function () {
        $(".navbar-collapse").collapse("hide");
    });

    // Activate scrollspy to add active class to navbar items on scroll
    $("body").scrollspy({
        target: "#mainNav",
        offset: 74,
    });

    // Collapse Navbar
    var navbarCollapse = function () {
        if ($("#mainNav").offset().top > 100) {
            $("#mainNav").addClass("navbar-shrink");
        } else {
            $("#mainNav").removeClass("navbar-shrink");
        }
    };
    // Collapse now if page is not at top
    navbarCollapse();
    // Collapse the navbar when page is scrolled
    $(window).scroll(navbarCollapse);

    // Index page: expand the mobile "About me" collapse when the nav link is clicked
    document.querySelectorAll('a[href="#about"]').forEach(function (link) {
        link.addEventListener('click', function () {
            var aboutContent = document.getElementById('about-content');
            if (aboutContent && window.innerWidth < 992 && !aboutContent.classList.contains('show')) {
                $(aboutContent).collapse('show');
            }
        });
    });

    // When the mobile "Show less" toggle collapses the About text, scroll back
    // to the heading instead of leaving the reader stranded further down the page.
    $('#about-content').on('hidden.bs.collapse', function () {
        var target = document.getElementById('about');
        if (target && window.innerWidth < 992) {
            $('html, body').animate(
                { scrollTop: $(target).offset().top - 72 },
                800,
                'easeInOutExpo'
            );
        }
    });
})(jQuery); // End of use strict
