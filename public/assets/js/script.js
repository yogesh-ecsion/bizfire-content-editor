(function () {
  'use strict';

  function initScript() {

    // ============================================================
    // DOM REFERENCES
    // ============================================================
    const track = document.getElementById('carouselTrack');
    // Safety check: If this page doesn't have the carousel, stop the script here.
    if (!track) return;

    const slides = track.querySelectorAll('.carousel-slide');

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const indicatorDots = document.querySelectorAll('#indicators button');
    const carouselWrapper = document.getElementById('testimonialCarousel');

    const totalSlides = slides.length;
    let currentIndex = 0;
    let isTransitioning = false;
    let autoPlayInterval = null;
    const AUTO_PLAY_INTERVAL = 5000;

    // ============================================================
    // UPDATE CAROUSEL
    // ============================================================
    function updateCarousel(index) {
      if (isTransitioning) return;
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;
      if (index === currentIndex) return;

      isTransitioning = true;

      // Move the track
      track.style.transform = 'translateX(-' + (index * 100) + '%)';

      // Update indicators
      indicatorDots.forEach(function (dot, i) {
        if (i === index) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      currentIndex = index;

      // Release transition lock
      setTimeout(function () {
        isTransitioning = false;
      }, 650);
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    function goToPrev() {
      updateCarousel(currentIndex - 1);
      resetAutoPlay();
    }

    function goToNext() {
      updateCarousel(currentIndex + 1);
      resetAutoPlay();
    }

    function goToSlide(index) {
      updateCarousel(index);
      resetAutoPlay();
    }

    // ============================================================
    // AUTO-PLAY
    // ============================================================
    function startAutoPlay() {
      stopAutoPlay();
      autoPlayInterval = setInterval(goToNext, AUTO_PLAY_INTERVAL);
    }

    function stopAutoPlay() {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
      }
    }

    function resetAutoPlay() {
      stopAutoPlay();
      startAutoPlay();
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    if (prevBtn) prevBtn.addEventListener('click', goToPrev);
    if (nextBtn) nextBtn.addEventListener('click', goToNext);

    indicatorDots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = parseInt(this.getAttribute('data-index'), 10);
        goToSlide(index);
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    });

    // Pause on hover
    if (carouselWrapper) {
      carouselWrapper.addEventListener('mouseenter', stopAutoPlay);
      carouselWrapper.addEventListener('mouseleave', startAutoPlay);

      // Pause on touch
      carouselWrapper.addEventListener('touchstart', stopAutoPlay, { passive: true });
      carouselWrapper.addEventListener('touchend', function () {
        setTimeout(startAutoPlay, 2000);
      }, { passive: true });
    }

    // ============================================================
    // HANDLE RESIZE — keep slide width consistent
    // ============================================================
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        // Re-apply transform to keep current slide in view
        track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
      }, 150);
    });

    // ============================================================
    // INIT
    // ============================================================
    function init() {
      // Ensure first slide is visible
      track.style.transform = 'translateX(0%)';

      // Set active indicator
      indicatorDots.forEach(function (dot, i) {
        if (i === 0) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      currentIndex = 0;
      startAutoPlay();
      console.log('[Testimonial Carousel] Initialized.');
    }

    // Run init now that DOMContentLoaded has fired
    init();
  });

})();


// ============================================================
// MAP
// ============================================================

(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const VIEWBOX_WIDTH = 360;
  const VIEWBOX_HEIGHT = 500;

  const counties = [
    {
      id: "atlantic",
      name: "Atlantic",
      url: "/service-areas/atlantic/",
      color: "var(--primary-color)",
      path: "M158.184,352.818L178.961,330.045L189.869,341.517L189.869,348.622L195.583,349.429L208.569,360.077L216.36,363.464L224.671,362.496L230.385,373.457L240.254,373.295L241.812,377.162L236.618,386.017L218.957,402.264L207.01,410.62L200.258,408.692L196.102,411.906L184.155,412.709L160.781,406.121L161.3,387.466L142.601,370.395Z"
    },
    {
      id: "bergen",
      name: "Bergen",
      url: "/service-areas/bergen/",
      color: "var(--primary-color)",
      path: "M254.798,63.155L298.95,89.207L300.508,89.372L297.391,104.517L294.794,111.425L287.522,127.201L282.847,122.602L270.9,131.634L264.148,129.664L266.226,123.259L267.784,115.864L264.667,95.136L249.084,90.36L245.968,84.759Z"
    },
    {
      id: "burlington",
      name: "Burlington",
      url: "/service-areas/burlington/",
      color: "var(--primary-color)",
      path: "M144.159,269.771L160.781,263.273L167.014,254.984L172.209,256.284L180.519,250.593L182.597,244.736L195.064,252.057L200.258,252.87L205.452,264.085L228.827,321.798L228.827,355.238L224.671,362.496L216.36,363.464L208.569,360.077L195.583,349.429L189.869,348.622L189.869,341.517L178.961,330.045L166.495,319.048L154.548,318.563L150.392,300.591L144.159,290.704L138.446,289.083L138.965,282.919L131.693,280.648Z"
    },
    {
      id: "camden",
      name: "Camden",
      url: "/service-areas/camden/",
      color: "var(--primary-color)",
      path: "M131.693,280.648L138.965,282.919L138.446,289.083L144.159,290.704L150.392,300.591L154.548,318.563L166.495,319.048L178.961,330.045L158.184,352.818L148.834,335.863L142.601,334.409L127.537,314.032L128.576,309.175L120.265,300.105L121.824,286.812Z"
    },
    {
      id: "capemay",
      name: "Cape May",
      url: "/service-areas/cape-may/",
      color: "var(--primary-color)",
      path: "M152.99,433.574L151.951,424.75L155.587,422.824L157.664,409.014L160.781,406.121L184.155,412.709L196.102,411.906L200.258,408.692L207.01,410.62L192.986,425.392L182.078,444.314L170.65,468.169L160.262,477.762L150.392,480L144.679,477.762L147.795,463.689L155.587,448.16L157.145,437.102Z"
    },
    {
      id: "cumberland",
      name: "Cumberland",
      url: "/service-areas/cumberland/",
      color: "var(--primary-color)",
      path: "M131.693,360.239L142.601,370.395L161.3,387.466L160.781,406.121L157.664,409.014L155.587,422.824L151.951,424.75L152.99,433.574L136.887,430.526L133.771,426.516L124.421,426.997L120.785,432.772L116.11,428.922L115.071,421.38L105.721,415.439L104.163,410.62L98.969,412.548L91.177,401.621L87.541,402.907L81.828,395.349L80.789,381.993L87.541,381.349L106.241,362.174L128.576,381.188L129.615,364.915Z"
    },
    {
      id: "essex",
      name: "Essex",
      url: "/service-areas/essex/",
      color: "var(--primary-color)",
      path: "M245.968,108.465L266.226,123.259L264.148,129.664L261.031,137.05L267.784,138.199L268.823,145.581L265.706,150.991L254.798,147.876L253.24,144.761L243.89,141.973L238.176,142.957L231.424,138.527L231.943,128.35L236.618,124.409L238.176,106.327Z"
    },
    {
      id: "gloucester",
      name: "Gloucester",
      url: "/service-areas/gloucester/",
      color: "var(--primary-color)",
      path: "M80.269,316.459L89.1,309.337L101.566,307.556L109.877,304.479L120.265,300.105L128.576,309.175L127.537,314.032L142.601,334.409L148.834,335.863L158.184,352.818L142.601,370.395L131.693,360.239L111.435,341.84L93.255,337.479L85.983,330.692L80.789,317.916Z"
    },
    {
      id: "hudson",
      name: "Hudson",
      url: "/service-areas/hudson/",
      color: "var(--primary-color)",
      path: "M264.148,129.664L270.9,131.634L282.847,122.602L287.522,127.201L283.886,133.768L281.808,144.433L278.692,148.04L275.056,153.614L262.07,156.727L265.706,150.991L268.823,145.581L267.784,138.199L261.031,137.05Z"
    },
    {
      id: "hunterdon",
      name: "Hunterdon",
      url: "/service-areas/hunterdon/",
      color: "var(--primary-color)",
      path: "M112.993,166.882L119.227,159.84L124.94,157.71L137.926,147.221L145.198,144.105L156.626,129.335L165.975,138.035L180.519,142.465L180,159.021L183.636,161.15L182.078,168.355L173.247,183.57L169.611,181.28L176.883,198.766L168.053,200.073L169.092,206.113L159.223,207.582L161.3,213.455L148.834,214.434L145.198,203.338L132.212,200.236L130.135,192.886L131.173,177.355L125.979,171.301L117.149,172.119Z"
    },
    {
      id: "mercer",
      name: "Mercer",
      url: "/service-areas/mercer/",
      color: "var(--primary-color)",
      path: "M148.834,214.434L161.3,213.455L159.223,207.582L169.092,206.113L168.053,200.073L176.883,198.766L181.039,208.071L190.908,204.97L195.583,208.234L195.064,217.533L215.321,227.313L215.321,231.06L206.491,238.063L203.894,243.109L196.102,244.573L200.258,252.87L195.064,252.057L182.597,244.736L180.519,250.593L173.767,238.388L163.378,231.712L159.742,223.239Z"
    },
    {
      id: "middlesex",
      name: "Middlesex",
      url: "/service-areas/middlesex/",
      color: "var(--primary-color)",
      path: "M195.583,208.234L200.777,199.909L208.569,195.5L218.957,185.041L209.088,172.938L211.166,168.682L218.438,165.408L241.293,163.607L243.371,166.718L254.279,164.426L255.837,166.554L253.759,173.101L249.084,175.719L247.526,183.897L247.526,190.925L252.72,193.213L249.604,201.869L234.021,217.533L228.307,226.172L215.321,231.06L215.321,227.313L195.064,217.533Z"
    },
    {
      id: "monmouth",
      name: "Monmouth",
      url: "/service-areas/monmouth/",
      color: "var(--primary-color)",
      path: "M215.321,231.06L228.307,226.172L234.021,217.533L249.604,201.869L252.72,193.213L265.706,192.559L278.172,199.746L285.445,201.216L287.522,194.029L289.6,208.724L288.042,226.172L280.77,255.796L280.77,260.023L275.056,262.298L269.862,253.195L263.109,260.185L250.123,257.26L247.526,247.502L226.229,246.526L205.452,264.085L200.258,252.87L196.102,244.573L203.894,243.109L206.491,238.063Z"
    },
    {
      id: "morris",
      name: "Morris",
      url: "/service-areas/morris/",
      color: "var(--primary-color)",
      path: "M173.767,105.833L179.481,103.859L182.597,108.136L190.908,103.859L192.466,95.63L212.724,72.23L212.724,80.639L220.516,78.331L228.827,86.407L241.812,88.878L244.929,93.819L245.968,108.465L238.176,106.327L236.618,124.409L231.943,128.35L231.424,138.527L218.438,151.155L209.608,155.908L211.166,146.565L204.933,135.081L180.519,142.465L165.975,138.035L156.626,129.335L167.014,119.973L168.573,111.425Z"
    },
    {
      id: "ocean",
      name: "Ocean",
      url: "/service-areas/ocean/",
      color: "var(--primary-color)",
      path: "M280.77,260.023L274.017,295.892L271.42,323.901L250.643,362.819L240.254,373.295L230.385,373.457L224.671,362.496L228.827,355.238L228.827,321.798L205.452,264.085L226.229,246.526L247.526,247.502L250.123,257.26L263.109,260.185L269.862,253.195L275.056,262.298Z"
    },
    {
      id: "passaic",
      name: "Passaic",
      url: "/service-areas/passaic/",
      color: "var(--primary-color)",
      path: "M212.724,72.23L231.943,49.612L251.162,61.339L254.798,63.155L245.968,84.759L249.084,90.36L264.667,95.136L267.784,115.864L266.226,123.259L245.968,108.465L244.929,93.819L241.812,88.878L228.827,86.407L220.516,78.331L212.724,80.639Z"
    },
    {
      id: "salem",
      name: "Salem",
      url: "/service-areas/salem/",
      color: "var(--primary-color)",
      path: "M59.492,348.783L66.764,338.287L71.439,333.116L74.036,323.254L80.789,317.916L85.983,330.692L93.255,337.479L111.435,341.84L131.693,360.239L129.615,364.915L128.576,381.188L106.241,362.174L87.541,381.349L80.789,381.993L81.828,395.349L78.192,393.58L72.997,384.569L63.128,380.544L66.245,357.981L60.011,353.302Z"
    },
    {
      id: "somerset",
      name: "Somerset",
      url: "/service-areas/somerset/",
      color: "var(--primary-color)",
      path: "M180.519,142.465L204.933,135.081L211.166,146.565L209.608,155.908L218.438,151.155L219.996,154.925L226.749,152.466L223.632,161.478L218.438,165.408L211.166,168.682L209.088,172.938L218.957,185.041L208.569,195.5L200.777,199.909L195.583,208.234L190.908,204.97L181.039,208.071L176.883,198.766L169.611,181.28L173.247,183.57L182.078,168.355L183.636,161.15L180,159.021Z"
    },
    {
      id: "sussex",
      name: "Sussex",
      url: "/service-areas/sussex/",
      color: "var(--primary-color)",
      path: "M141.562,71.075L151.951,62.164L157.664,54.073L164.936,33.574L176.364,22.153L184.675,20L231.943,49.612L212.724,72.23L192.466,95.63L190.908,103.859L182.597,108.136L179.481,103.859L173.767,105.833L145.198,70.58Z"
    },
    {
      id: "union",
      name: "Union",
      url: "/service-areas/union/",
      color: "var(--primary-color)",
      path: "M218.438,165.408L223.632,161.478L226.749,152.466L219.996,154.925L218.438,151.155L231.424,138.527L238.176,142.957L243.89,141.973L253.24,144.761L254.798,147.876L265.706,150.991L262.07,156.727L255.837,159.348L255.837,166.554L254.279,164.426L243.371,166.718L241.293,163.607Z"
    },
    {
      id: "warren",
      name: "Warren",
      url: "/service-areas/warren/",
      color: "var(--primary-color)",
      path: "M123.382,94.807L121.304,90.854L136.887,81.134L145.198,70.58L173.767,105.833L168.573,111.425L167.014,119.973L156.626,129.335L145.198,144.105L137.926,147.221L124.94,157.71L119.227,159.84L112.993,166.882L111.955,163.607L111.435,156.236L115.071,151.319L110.916,147.712L115.591,131.306L121.304,132.127L133.251,113.563L126.499,103.365Z"
    }
  ];

  const locationMarkers = [
    { id: "office-morris", x: 215.6, y: 127.7, label: "Morris County Office" },
    { id: "office-central", x: 219.9, y: 186.9, label: "Central NJ Office" }
  ];

  function createSVG(container) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('id', 'nj-map');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Map of New Jersey service areas by county');

    const regionsGroup = document.createElementNS(SVG_NS, 'g');
    regionsGroup.setAttribute('id', 'county-group');
    svg.appendChild(regionsGroup);

    container.appendChild(svg);
    return { svg, regionsGroup };
  }

  function createMarkers(svg, tooltip) {
    if (!locationMarkers.length) return;

    const markerGroup = document.createElementNS(SVG_NS, 'g');
    markerGroup.setAttribute('id', 'marker-group');

    locationMarkers.forEach((marker) => {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', marker.x);
      dot.setAttribute('cy', marker.y);
      dot.setAttribute('r', 6);
      dot.setAttribute('class', 'location-marker');
      dot.setAttribute('data-id', marker.id);
      dot.setAttribute('role', 'img');
      dot.setAttribute('aria-label', marker.label);

      dot.addEventListener('mouseenter', () => {
        tooltip.setText(marker.label);
        tooltip.show();
      });
      dot.addEventListener('mousemove', (event) => {
        tooltip.moveTo(event.clientX, event.clientY);
      });
      dot.addEventListener('mouseleave', () => tooltip.hide());

      markerGroup.appendChild(dot);
    });

    svg.appendChild(markerGroup);
  }

  function createCounty(countyData) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', countyData.path);
    path.setAttribute('fill', countyData.color);
    path.setAttribute('class', 'county');
    path.setAttribute('data-id', countyData.id);
    path.setAttribute('data-url', countyData.url);
    path.setAttribute('data-name', countyData.name);

    path.setAttribute('role', 'button');
    path.setAttribute('tabindex', '0');
    path.setAttribute('aria-label', countyData.name);

    return path;
  }

  function createTooltip() {
    const tooltipEl = document.getElementById('map-tooltip');

    function setText(text) {
      tooltipEl.textContent = text;
    }

    function moveTo(x, y) {
      const offsetX = 16;
      const offsetY = -12;
      tooltipEl.style.transform = `translate(${x + offsetX}px, ${y + offsetY}px)`;
    }

    function show() {
      tooltipEl.classList.add('is-visible');
      tooltipEl.setAttribute('aria-hidden', 'false');
    }

    function hide() {
      tooltipEl.classList.remove('is-visible');
      tooltipEl.setAttribute('aria-hidden', 'true');
    }

    return { el: tooltipEl, setText, moveTo, show, hide };
  }

  function bindEvents(pathEl, countyData, tooltip, state) {
    function navigate() {
      window.location.href = countyData.url;
    }

    function setActive() {
      if (state.activeEl && state.activeEl !== pathEl) {
        state.activeEl.classList.remove('is-active');
      }
      pathEl.classList.add('is-active');
      state.activeEl = pathEl;
    }

    pathEl.addEventListener('mouseenter', () => {
      pathEl.classList.add('is-hovered');
      tooltip.setText(countyData.name);
      tooltip.show();
    });

    pathEl.addEventListener('mousemove', (event) => {
      tooltip.moveTo(event.clientX, event.clientY);
    });

    pathEl.addEventListener('mouseleave', () => {
      pathEl.classList.remove('is-hovered');
      tooltip.hide();
    });

    pathEl.addEventListener('click', () => {
      setActive();
      navigate();
    });

    pathEl.addEventListener(
      'touchstart',
      (event) => {
        const touch = event.touches[0];
        tooltip.setText(countyData.name);
        tooltip.moveTo(touch.clientX, touch.clientY);
        tooltip.show();
        pathEl.classList.add('is-hovered');
      },
      { passive: true }
    );

    pathEl.addEventListener('touchend', () => {
      pathEl.classList.remove('is-hovered');
      tooltip.hide();
    });

    pathEl.addEventListener('focus', () => {
      pathEl.classList.add('is-hovered');
    });

    pathEl.addEventListener('blur', () => {
      pathEl.classList.remove('is-hovered');
    });

    pathEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setActive();
        navigate();
      }
    });
  }

  function init() {
    const container = document.getElementById('map-container');
    if (!container) return;

    const { svg, regionsGroup } = createSVG(container);
    const tooltip = createTooltip();

    const state = { activeEl: null };

    counties.forEach((countyData) => {
      const pathEl = createCounty(countyData);
      regionsGroup.appendChild(pathEl);
      bindEvents(pathEl, countyData, tooltip, state);
    });

    createMarkers(svg, tooltip);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        svg.classList.add('is-loaded');
      });
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        tooltip.hide();
      }, 100);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
// ============================================================
// COntact Form POPUP
// ============================================================
function openContactThankYouPopup() {
  document.getElementById("contactThankYouPopup").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeContactThankYouPopup() {
  document.getElementById("contactThankYouPopup").classList.remove("active");
  document.body.style.overflow = "";

  // Remove ?contact_submitted=success from URL without refreshing
  const url = new URL(window.location.href);
  url.searchParams.delete('contact_submitted');
  window.history.replaceState({}, document.title, url.pathname);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeContactThankYouPopup();
  }
});

// Check URL parameter to open Thank You modal upon submission redirect
window.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('contact_submitted') === 'success') {
    openContactThankYouPopup();
  }
});

// SIGN UP POPUP
function openPlumberPopup() {
  document.getElementById("plumberCallbackPopup").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePlumberPopup() {
  document.getElementById("plumberCallbackPopup").classList.remove("active");
  document.body.style.overflow = "";
}

function openThankYouPopup() {
  document.getElementById("thankYouPopup").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeThankYouPopup() {
  document.getElementById("thankYouPopup").classList.remove("active");
  document.body.style.overflow = "";

  // Clean URL parameter without reloading
  const url = new URL(window.location.href);
  url.searchParams.delete('submitted');
  window.history.replaceState({}, document.title, url.pathname);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closePlumberPopup();
    closeThankYouPopup();
  }
});

// Automatically show Thank You popup if redirected after successful submission
window.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('submitted') === 'success') {
    openThankYouPopup();
  }
});

window.openPlumberPopup = openPlumberPopup;




// ============================================================
// Schedule Service POPUP
// ============================================================
function openQuotePopup() {
  document.getElementById("freeQuotePopup").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeQuotePopup() {
  document.getElementById("freeQuotePopup").classList.remove("active");
  document.body.style.overflow = "";
}

function openThankYouPopup() {
  document.getElementById("thankYouPopup").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeThankYouPopup() {
  document.getElementById("thankYouPopup").classList.remove("active");
  document.body.style.overflow = "";

  // Clean URL parameter without reloading
  const url = new URL(window.location.href);
  url.searchParams.delete('submitted');
  window.history.replaceState({}, document.title, url.pathname);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeQuotePopup();
    closeThankYouPopup();
  }
});

// Automatically show Thank You popup if redirected after successful submission
window.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('submitted') === 'success') {
    openThankYouPopup();
  }
});

window.openQuotePopup = openQuotePopup;


// ============================================================
// REDEEM POPUP
// ============================================================
function openRedeemPopup() {
  document.getElementById("redeemOfferPopup").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeRedeemPopup() {
  document.getElementById("redeemOfferPopup").classList.remove("active");
  document.body.style.overflow = "";
}

function openThankYouPopup() {
  document.getElementById("thankYouPopup").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeThankYouPopup() {
  document.getElementById("thankYouPopup").classList.remove("active");
  document.body.style.overflow = "";

  // Clean URL parameter without reloading
  const url = new URL(window.location.href);
  url.searchParams.delete('submitted');
  window.history.replaceState({}, document.title, url.pathname);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeRedeemPopup();
    closeThankYouPopup();
  }
});

// Event listener to open popup on clicking any element with .coupon-btn class
document.addEventListener("DOMContentLoaded", function () {
  const couponBtns = document.querySelectorAll('.coupon-btn');
  couponBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openRedeemPopup();
    });
  });

  // Automatically show Thank You popup if redirected after successful submission
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('submitted') === 'success') {
    openThankYouPopup();
  }
}

    if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScript);
} else {
  initScript();
}