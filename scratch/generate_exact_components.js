import fs from 'fs';
import path from 'path';
import DataService from '../api-services/data.service.js';

const rawSections = JSON.parse(fs.readFileSync('scratch/raw_sections.json', 'utf8'));
const compRoot = path.join(process.cwd(), 'workspaces/test-workspace-001/theme/components');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Map each component key to its exact specification
const componentDefs = [
  // 1. plumbing-hero-split (Section 1)
  {
    key: 'plumbing-hero-split',
    name: 'Plumbing Hero Split',
    category: 'Hero',
    displayOrder: 10,
    schema: {
      title: { type: 'text', label: 'Main Title', default: 'New Jersey Plumbing Services' },
      intro: { type: 'textarea', label: 'Intro Text', default: 'The quiet of a household depends on plumbing that works without being thought about.' },
      paragraph1: { type: 'textarea', label: 'Paragraph 1', default: 'Water pooling where it shouldn\'t. A shower that runs cold before the morning is over. A toilet that runs and runs at 2 a.m. These are the moments that pull a household off schedule.' },
      paragraph2: { type: 'textarea', label: 'Paragraph 2', default: 'Princeton Air\'s licensed plumbers arrive prepared, diagnose the actual cause, and complete the repair with careful attention to your finished spaces. Call or book online to schedule plumbing service in New Jersey.' },
      image: { type: 'image', label: 'Hero Image', default: { src: '/assets/img/1-index-hero-img.webp', alt: 'Professional Plumber' } }
    },
    defaults: {
      title: 'New Jersey Plumbing<br />Services',
      intro: 'The quiet of a household depends on plumbing that works without being thought about.',
      paragraph1: 'Water pooling where it shouldn\'t. A shower that runs cold before the morning is over. A toilet that runs and runs at 2 a.m. These are the moments that pull a household off schedule.',
      paragraph2: 'Princeton Air\'s licensed plumbers arrive prepared, diagnose the actual cause, and complete the repair with careful attention to your finished spaces. Call or book online to schedule plumbing service in New Jersey.',
      image: { src: '/assets/img/1-index-hero-img.webp', alt: 'Professional Plumber' }
    },
    template: `<section class="plumbing-service-section">
  <div class="container-fluid">
    <div class="row p-0 align-items-stretch">
      <div class="col-lg-6 section-hero-main">
        <div class="plumbing-service-image">
          <img src="{{image.src}}" alt="{{image.alt}}" width="800" height="900" loading="eager" fetchpriority="high">
        </div>
      </div>
      <div class="col-lg-6 section-hero-main">
        <div class="plumbing-service-content">
          <div class="plumbing-service-divider"></div>
          <div class="plumbing-service-inner">
            <h2 class="plumbing-service-title">{{{title}}}</h2>
            {{#if intro}}<p class="plumbing-service-intro">{{intro}}</p>{{/if}}
            {{#if paragraph1}}<p class="plumbing-service-text">{{paragraph1}}</p>{{/if}}
            {{#if paragraph2}}<p class="plumbing-service-text">{{paragraph2}}</p>{{/if}}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for plumbing-hero-split */
.plumbing-service-section { min-height: 374px; display: flex; background: #fff; padding: 0; }
.plumbing-service-content { background: linear-gradient(to right, #A01922, #7D1118, #390106); color: #fff; }
.plumbing-service-title { color: #fff; font-family: Outfit, sans-serif; font-size: 38px; font-weight: 700; }`
  },

  // 2. cta-strip (Section 2)
  {
    key: 'cta-strip',
    name: 'CTA Urgency Strip',
    category: 'Call to Action',
    displayOrder: 20,
    schema: {
      text: { type: 'text', label: 'Callout Text', default: 'Ready to talk to a home services specialist?' },
      buttonText: { type: 'text', label: 'Button Label', default: 'Schedule Services' },
      buttonUrl: { type: 'text', label: 'Button URL', default: '#quote' }
    },
    defaults: {
      text: 'Ready to talk to a home services specialist?',
      buttonText: 'Schedule Services',
      buttonUrl: '#quote'
    },
    template: `<section class="cta-section">
  <div class="container">
    <div class="cta-wrapper">
      <p class="cta-text">{{text}}</p>
      <a onclick="openQuotePopup()" class="btn-filled-chat">{{buttonText}}</a>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for cta-strip */
.cta-section { background-color: #000; padding: 18px 0; }
.cta-wrapper { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; }
.cta-text { color: #fff; font-size: 18px; margin: 0; font-weight: 500; }`
  },

  // 3. plumbing-order-checklist (Section 3)
  {
    key: 'plumbing-order-checklist',
    name: 'Plumbing Order & Guarantee',
    category: 'Stats & Social Proof',
    displayOrder: 30,
    schema: {
      sectionTitle: { type: 'text', label: 'Section Title', default: 'When Plumbing Disrupts<br />Your Home, We Restore Order' },
      headline: { type: 'text', label: 'Headline', default: 'Your plumbing works in the background until the minute it stops.' },
      desc1: { type: 'textarea', label: 'Paragraph 1', default: 'You turn a handle expecting water. You flush expecting nothing else to happen. You walk past the laundry room without thinking about what\'s under the sink. When one of those automatic assumptions stops holding, the rest of the household adjusts around it, and you start running a quiet inventory of what else might be about to go wrong.' },
      desc2: { type: 'textarea', label: 'Paragraph 2', default: 'Princeton Air\'s licensed plumbers walk into that moment with a plan. We evaluate the whole system, not just the obvious failure, name the cause accurately, and put forward a scope that makes sense for your household and your budget. We pull the permits, follow the code, and leave the work area the way we found it. Five decades of serving New Jersey homeowners has taught us that the plumbing call that earns the next one is the one that\'s done properly the first time.' }
    },
    defaults: {
      sectionTitle: 'When Plumbing Disrupts<br />Your Home, We Restore Order',
      headline: 'Your plumbing works in the background until the minute it stops.',
      desc1: 'You turn a handle expecting water. You flush expecting nothing else to happen. You walk past the laundry room without thinking about what\'s under the sink. When one of those automatic assumptions stops holding, the rest of the household adjusts around it, and you start running a quiet inventory of what else might be about to go wrong.',
      desc2: 'Princeton Air\'s licensed plumbers walk into that moment with a plan. We evaluate the whole system, not just the obvious failure, name the cause accurately, and put forward a scope that makes sense for your household and your budget. We pull the permits, follow the code, and leave the work area the way we found it. Five decades of serving New Jersey homeowners has taught us that the plumbing call that earns the next one is the one that\'s done properly the first time.'
    },
    template: `<section class="plumbing-order-section section-padding bg-light-gray">
  <div class="container">
    <h2 class="section-title text-center pb-2">{{{sectionTitle}}}</h2>
    <div class="row align-items-center">
      <div class="col-lg-6 col-12">
        <div>
          <h3 class="plumbing-order-title section-subtitle">{{headline}}</h3>
          <p class="plumbing-order-text section-desc">{{desc1}}</p>
          <p class="plumbing-order-text section-desc">{{desc2}}</p>
        </div>
      </div>
      <div class="col-lg-6 col-12">
        <div class="plumbing-stats-card">
          <div class="plumbing-stat-item">
            <div class="plumbing-stat-icon">
              <i class="fa-solid fa-shield-halved" style="color:#fff; font-size:20px;"></i>
            </div>
            <div class="plumbing-stat-content">
              <span class="plumbing-stat-number">50+</span>
              <span class="plumbing-stat-label">Years in Business</span>
            </div>
          </div>
          <div class="plumbing-stat-item">
            <div class="plumbing-stat-icon">
              <i class="fa-solid fa-users" style="color:#fff; font-size:20px;"></i>
            </div>
            <div class="plumbing-stat-content">
              <span class="plumbing-stat-number">700</span>
              <span class="plumbing-stat-label">Skilled Employees</span>
            </div>
          </div>
          <div class="plumbing-stat-item">
            <div class="plumbing-stat-icon">
              <i class="fa-solid fa-clock" style="color:#fff; font-size:20px;"></i>
            </div>
            <div class="plumbing-stat-content">
              <span class="plumbing-stat-number">24/7</span>
              <span class="plumbing-stat-label">Emergency Service</span>
            </div>
          </div>
          <div class="plumbing-stat-item">
            <div class="plumbing-stat-icon">
              <i class="fa-solid fa-truck" style="color:#fff; font-size:20px;"></i>
            </div>
            <div class="plumbing-stat-content">
              <span class="plumbing-stat-number">500</span>
              <span class="plumbing-stat-label">Trucks on the Road</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for plumbing-order-checklist */
.plumbing-stats-card { background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.plumbing-stat-item { display: flex; align-items: center; gap: 16px; }
.plumbing-stat-icon { width: 44px; height: 44px; background: #A01922; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.plumbing-stat-number { font-size: 28px; font-weight: 800; color: #172033; display: block; line-height: 1.1; font-family: Outfit, sans-serif; }
.plumbing-stat-label { font-size: 13px; color: #5b6472; font-weight: 500; }`
  },

  // 4. plumbing-services-grid (Section 4)
  {
    key: 'plumbing-services-grid',
    name: 'Plumbing Services Grid',
    category: 'Services',
    displayOrder: 40,
    schema: {},
    defaults: {},
    template: `<section class="plumbing-services-section" aria-label="Plumbing services">
  <div class="plumbing-grid">
    <a href="#" class="card-body card-body-center" aria-label="Plumbing services">
      <span class="plumbing-card-icon" aria-hidden="true">
        <i class="fa-solid fa-wrench"></i>
      </span>
      <div class="plumbing-card-content">
        <h3 class="plumbing-card-title">Plumbing</h3>
      </div>
    </a>
    <a href="#" class="card-body card-body-center" aria-label="Plumbing Installation services">
      <span class="plumbing-card-icon" aria-hidden="true">
        <i class="fa-solid fa-faucet-drip"></i>
      </span>
      <div class="plumbing-card-content">
        <h3 class="plumbing-card-title">Plumbing Installation</h3>
      </div>
    </a>
    <a href="#" class="card-body card-body-center" aria-label="Plumbing Repair services">
      <span class="plumbing-card-icon" aria-hidden="true">
        <i class="fa-solid fa-screwdriver-wrench"></i>
      </span>
      <div class="plumbing-card-content">
        <h3 class="plumbing-card-title">Plumbing Repair</h3>
      </div>
    </a>
    <a href="#" class="card-body card-body-center" aria-label="Commercial plumbing services">
      <span class="plumbing-card-icon" aria-hidden="true">
        <i class="fa-solid fa-building"></i>
      </span>
      <div class="plumbing-card-content">
        <h3 class="plumbing-card-title">Commercial</h3>
      </div>
    </a>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for plumbing-services-grid */
.plumbing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
.card-body-center { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; }
.card-body-center:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #A01922; }
.plumbing-card-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(169, 31, 56, 0.08); display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.card-body-center:hover .plumbing-card-icon { background: #A01922; }
.plumbing-card-icon i { font-size: 24px; color: #A01922; transition: 0.2s; }
.card-body-center:hover .plumbing-card-icon i { color: #fff; }
.plumbing-card-title { font-size: 18px; font-weight: 700; color: #172033; margin: 0; font-family: Outfit, sans-serif; }`
  },

  // 5. plumbing-care-video (Section 5)
  {
    key: 'plumbing-care-video',
    name: 'Plumbing Care Video Section',
    category: 'Media & Video',
    displayOrder: 50,
    schema: {
      heading: { type: 'text', label: 'Section Heading', default: 'Plumbing Care That Matches the Character of Your Home' },
      subheading: { type: 'text', label: 'Subheading', default: 'The right plumbing approach depends on what\'s already there.' },
      image: { type: 'image', label: 'Video Placeholder Image', default: { src: '/assets/img/2-plumbing-care.webp', alt: 'Plumbing service video placeholder' } },
      phone: { type: 'text', label: 'Phone Number', default: '(123) 456-7890' }
    },
    defaults: {
      heading: 'Plumbing Care That Matches<br class="d-none d-sm-block" /> the Character of Your Home',
      subheading: 'The right plumbing approach depends on what\'s already there.',
      image: { src: '/assets/img/2-plumbing-care.webp', alt: 'Plumbing service video placeholder' },
      phone: '(123) 456-7890'
    },
    template: `<section class="plumbing-care-section section-padding bg-light-gray py-lg-6">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-10 col-xl-9 text-center">
        <h2 class="plumbing-care-heading section-title">{{{heading}}}</h2>
        <p class="plumbing-care-subheading section-subtitle">{{subheading}}</p>
        <div class="spacer-50"></div>
      </div>
    </div>
    <div class="row justify-content-center">
      <div class="col-lg-12">
        <div class="video-card">
          <img src="{{image.src}}" alt="{{image.alt}}" class="video-card-img" width="1280" height="720" loading="lazy">
          <div class="play-button-wrapper">
            <button class="play-button" aria-label="Play video" onclick="openQuotePopup()">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="row justify-content-center">
      <div class="col-lg-10 col-xl-9 text-center">
        <div class="spacer-40"></div>
        <p class="plumbing-care-text">
          Older homes in Princeton and surrounding towns carry plumbing systems installed across decades, where cast iron meets copper and original layouts require thoughtful integration rather than generic replacement.
        </p>
        <p class="plumbing-care-text">
          Princeton Air plumbers assess each home's plumbing with respect for its character and build quality, tailoring solutions to preserve what works and reliably upgrade what doesn't.
        </p>
        <div class="button-group justify-content-start">
          <a href="tel:{{phone}}" class="btn-outline-phone">
            <i class="fa-solid fa-phone"></i> {{phone}}
          </a>
          <a onclick="openQuotePopup()" class="btn-filled-chat">
            <i class="fa-solid fa-message"></i> Chat with us
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for plumbing-care-video */
.video-card { position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
.video-card-img { width: 100%; height: auto; display: block; object-fit: cover; }
.play-button-wrapper { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.play-button { width: 72px; height: 72px; border-radius: 50%; background: #A01922; border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(160,25,34,0.4); }
.play-button svg { width: 28px; height: 28px; fill: #fff; }`
  },

  // 6. trust-bar (Section 6)
  {
    key: 'trust-bar',
    name: 'Trust Rating & Social Bar',
    category: 'Social Proof',
    displayOrder: 60,
    schema: {
      rating: { type: 'text', label: 'Rating Number', default: '4.7' },
      reviewsCount: { type: 'text', label: 'Review Count', default: '6634' }
    },
    defaults: {
      rating: '4.7',
      reviewsCount: '6634'
    },
    template: `<section class="trust-bar section-padding" aria-label="Trust bar with reviews and social links">
  <div class="container">
    <div class="row align-items-center justify-content-between w-100 trust-bar-row">
      <div class="col-auto">
        <div class="trust-left">
          <span class="trust-rating">{{rating}}</span>
          <span class="trust-stars" role="img" aria-label="Rated {{rating}} out of 5 stars">
            <i class="fa-solid fa-star" aria-hidden="true"></i>
            <i class="fa-solid fa-star" aria-hidden="true"></i>
            <i class="fa-solid fa-star" aria-hidden="true"></i>
            <i class="fa-solid fa-star" aria-hidden="true"></i>
            <i class="fa-solid fa-star" aria-hidden="true"></i>
          </span>
          <span class="trust-review">
            Based on {{reviewsCount}} reviews <span class="google-highlight">powered by Google</span>
          </span>
        </div>
      </div>
      <div class="col-auto">
        <div class="trust-right">
          <a href="https://www.instagram.com/" target="_blank" class="trust-icon-btn" aria-label="Instagram">
            <i class="fab fa-instagram"></i>
          </a>
          <a href="https://x.com/" target="_blank" class="trust-icon-btn" aria-label="Twitter">
            <i class="fab fa-twitter"></i>
          </a>
          <a href="https://api.whatsapp.com/send/?phone=%2B17323318811&text&type=phone_number&app_absent=0" target="_blank" class="trust-icon-btn" aria-label="WhatsApp">
            <i class="fab fa-whatsapp"></i>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for trust-bar */
.trust-bar { background: #fff; border-bottom: 1px solid #ECECEC; padding: 18px 0; }
.trust-left { display: flex; align-items: center; gap: 14px; }
.trust-rating { font-size: 24px; font-weight: 800; color: #172033; font-family: Outfit, sans-serif; }
.trust-stars { color: #f59e0b; display: flex; gap: 3px; font-size: 16px; }
.trust-review { font-size: 14px; color: #5b6472; }
.google-highlight { color: #4285F4; font-weight: 600; }
.trust-right { display: flex; gap: 10px; }
.trust-icon-btn { width: 36px; height: 36px; border-radius: 50%; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; color: #475569; text-decoration: none; transition: 0.2s; }
.trust-icon-btn:hover { background: #A01922; color: #fff; border-color: #A01922; }`
  },

  // 7. accordion-map-section (Section 7)
  {
    key: 'accordion-map-section',
    name: 'NJ Service Areas & Accordion',
    category: 'Locations',
    displayOrder: 70,
    schema: {
      heading: { type: 'text', label: 'Section Heading', default: 'New Jersey Chooses Princeton Air' }
    },
    defaults: {
      heading: 'New Jersey Chooses Princeton Air'
    },
    template: `<section class="nj-section section-padding py-lg-6">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-10 text-center mb-2">
        <h2 class="nj-heading section-title">{{heading}}</h2>
      </div>
    </div>
    <div class="row align-items-center gx-5">
      <div class="col-lg-4 col-12">
        <ul class="nj-list">
          <li><a href="#" class="nj-list-item"><span class="nj-number">1.</span><span class="nj-title">One Trusted Team for the Entire Home</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" class="nj-list-item"><span class="nj-number">2.</span><span class="nj-title">Thorough, Code-Compliant Work</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" onclick="openQuotePopup()" class="nj-list-item"><span class="nj-number">3.</span><span class="nj-title">Financing Options</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" class="nj-list-item"><span class="nj-number">4.</span><span class="nj-title">Solutions Made to Last</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" class="nj-list-item"><span class="nj-number">5.</span><span class="nj-title">Respect for Your Home and Privacy</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
        </ul>
      </div>
      <div class="col-lg-4 col-12 mb-4">
        <ul class="nj-list">
          <li><a href="#" class="nj-list-item"><span class="nj-number">6.</span><span class="nj-title">Responsive Emergency Plumbing Service</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" class="nj-list-item"><span class="nj-number">7.</span><span class="nj-title">Transparent Pricing</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" class="nj-list-item"><span class="nj-number">8.</span><span class="nj-title">Over 50 Years Serving New Jersey</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" class="nj-list-item"><span class="nj-number">9.</span><span class="nj-title">New Jersey Locations</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
          <li><a href="#" class="nj-list-item"><span class="nj-number">10.</span><span class="nj-title">Over 50 Years Serving New Jersey</span><i class="bi bi-plus-circle nj-icon"></i></a></li>
        </ul>
      </div>
      <div class="col-lg-4 col-12 w-100">
        <div class="nj-card">
          <main class="map-page">
            <h1 class="visually-hidden">New Jersey Service Areas</h1>
            <div id="map-container" class="map-container" aria-label="Interactive map of New Jersey service areas">
              <img src="/assets/img/map.webp" alt="Map of New Jersey service areas by county" width="360" height="500" class="img-fluid" style="max-height: 380px; object-fit: contain;">
            </div>
            <div id="map-tooltip" class="map-tooltip" role="status" aria-hidden="true"></div>
          </main>
          <a href="#" onclick="openQuotePopup()" class="btn-filled-chat location-popup">
            <i class="bi bi-plus-circle"></i> New Jersey Locations
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for accordion-map-section */
.nj-section { background: #fff; padding: 48px 0; }
.nj-list { list-style: none; padding: 0; margin: 0; }
.nj-list-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; text-decoration: none; color: #172033; font-weight: 600; font-size: 15px; transition: 0.2s; }
.nj-list-item:hover { border-color: #A01922; background: #fdf2f2; }
.nj-number { color: #A01922; margin-right: 8px; font-weight: 700; }
.nj-icon { color: #A01922; font-size: 18px; }
.map-container { min-height: 280px; width: 100%; display: flex; align-items: center; justify-content: center; }`
  },

  // 8. process-steps-grid (Section 8)
  {
    key: 'process-steps-grid',
    name: 'Process Steps Grid',
    category: 'Process',
    displayOrder: 80,
    schema: {
      heading: { type: 'text', label: 'Heading', default: 'Three Simple Steps to Reliable Plumbing' },
      subheading: { type: 'text', label: 'Subheading', default: 'Scheduling plumbing service with Princeton Air should take minutes and follow a clear path from the first call to the final walkthrough.' },
      desc: { type: 'text', label: 'Supporting Text', default: 'Your experience with Princeton Air is clear, structured, and centered on your schedule.' },
      image: { type: 'image', label: 'Step Image', default: { src: '/assets/img/4-three-simple-steps.webp', alt: 'Professional plumber at work' } },
      phone: { type: 'text', label: 'Phone', default: '(123) 456-7890' }
    },
    defaults: {
      heading: 'Three Simple Steps to Reliable Plumbing',
      subheading: 'Scheduling plumbing service with Princeton Air should take minutes and follow a clear path from the first call to the final walkthrough.',
      desc: 'Your experience with Princeton Air is clear, structured, and centered on your schedule.',
      image: { src: '/assets/img/4-three-simple-steps.webp', alt: 'Professional plumber at work' },
      phone: '(123) 456-7890'
    },
    template: `<section class="steps-section bg-light-gray section-padding py-lg-6">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-10 col-xl-9 text-center">
        <h2 class="section-title">{{heading}}</h2>
        <p class="section-subtitle">{{subheading}}</p>
        <p class="section-desc">{{desc}}</p>
      </div>
    </div>
    <div class="row align-items-stretch gx-4 gy-4">
      <div class="col-lg-6 col-12">
        <div class="steps-cards-wrapper">
          <div class="card-body card-body-flex">
            <div class="step-circle">1</div>
            <div class="step-content">
              <h3 class="step-title">Contact Princeton Air</h3>
              <p class="step-text">Call or schedule through our online booking system. We confirm the details, answer initial questions, and send a licensed plumber prepared for your home.</p>
            </div>
          </div>
          <div class="card-body card-body-flex">
            <div class="step-circle">2</div>
            <div class="step-content">
              <h3 class="step-title">Receive Clear Answers</h3>
              <p class="step-text">Your plumber arrives on time, protects your space before any work begins, and carefully evaluates the situation. We explain our findings in plain language and walk through your options without pressure.</p>
            </div>
          </div>
          <div class="card-body card-body-flex">
            <div class="step-circle">3</div>
            <div class="step-content">
              <h3 class="step-title">Precise Work, Completed with Care</h3>
              <p class="step-text">Once approved, we complete the work thoroughly and to current code standards. We test everything carefully, clean the work area, and review the results with you before we leave.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-6 col-12 step-image-card-home">
        <div class="step-image-card-home">
          <img src="{{image.src}}" alt="{{image.alt}}" class="step-image" width="700" height="900" loading="lazy">
        </div>
      </div>
    </div>
    <br>
    <div class="button-group justify-content-start">
      <a href="tel:{{phone}}" class="btn-outline-phone">
        <i class="fa-solid fa-phone"></i> {{phone}}
      </a>
      <a onclick="openQuotePopup()" class="btn-filled-chat">
        <i class="fa-solid fa-message"></i> Chat with us
      </a>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for process-steps-grid */
.steps-section { background-color: #f8fafc; }
.card-body-flex { display: flex; align-items: flex-start; gap: 20px; background: #fff; padding: 24px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
.step-circle { width: 44px; height: 44px; min-width: 44px; border-radius: 50%; background: #A01922; color: #fff; font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-family: Outfit, sans-serif; }
.step-title { font-size: 18px; font-weight: 700; color: #172033; margin: 0 0 8px; font-family: Outfit, sans-serif; }
.step-text { font-size: 14px; color: #5b6472; line-height: 1.5; margin: 0; }
.step-image { width: 100%; height: auto; border-radius: 16px; object-fit: cover; }`
  },

  // 9. cta-banner-dual (Section 9 & 17)
  {
    key: 'cta-banner-dual',
    name: 'Dual CTA Contact Banner',
    category: 'Call to Action',
    displayOrder: 90,
    schema: {
      phone: { type: 'text', label: 'Phone Number', default: '(123) 456-7890' },
      phoneText: { type: 'text', label: 'Phone Text', default: 'to schedule plumbing services.' },
      chatText: { type: 'text', label: 'Chat Button Text', default: 'Chat with us' }
    },
    defaults: {
      phone: '(123) 456-7890',
      phoneText: 'to schedule plumbing services.',
      chatText: 'Chat with us'
    },
    template: `<section class="cta-banner-section">
  <div class="container">
    <div class="cta-banner">
      <div class="cta-banner-left">
        <span class="cta-phone-icon" aria-hidden="true">
          <i class="fas fa-phone"></i>
        </span>
        <a href="tel:{{phone}}" class="cta-phone-number">{{phone}}</a>
        <span class="cta-phone-text">{{phoneText}}</span>
      </div>
      <div class="cta-banner-right">
        <span class="cta-question">Questions?</span>
        <a onclick="openQuotePopup()" class="cta-chat-btn">
          <i class="fa-solid fa-message"></i> {{chatText}}
        </a>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for cta-banner-dual */
.cta-banner-section { padding: 40px 0; }
.cta-banner { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); flex-wrap: wrap; gap: 20px; }
.cta-banner-left { display: flex; align-items: center; gap: 16px; }
.cta-phone-icon { width: 44px; height: 44px; border-radius: 50%; background: #A01922; color: #fff; display: flex; align-items: center; justify-content: center; }
.cta-phone-number { font-size: 24px; font-weight: 800; color: #172033; text-decoration: none; font-family: Outfit, sans-serif; }
.cta-banner-right { display: flex; align-items: center; gap: 16px; }
.cta-chat-btn { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #A01922; color: #A01922; padding: 10px 22px; border-radius: 30px; font-weight: 700; text-decoration: none; cursor: pointer; transition: 0.2s; }
.cta-chat-btn:hover { background: #A01922; color: #fff; }`
  },

  // 10. testimonial-carousel (Section 10)
  {
    key: 'testimonial-carousel',
    name: 'Testimonials Carousel',
    category: 'Social Proof',
    displayOrder: 100,
    schema: {
      title: { type: 'text', label: 'Section Title', default: 'What Our Customers Are Saying' },
      subtitle: { type: 'text', label: 'Subtitle', default: '100% Satisfaction Guarantee' }
    },
    defaults: {
      title: 'What Our Customers Are Saying',
      subtitle: '100% Satisfaction Guarantee'
    },
    template: `<section class="testimonial-section bg-light-gray section-padding" aria-label="Customer testimonials">
  <div class="container">
    <div class="testimonial-header">
      <h2 class="testimonial-heading section-title">{{title}}</h2>
      <p class="testimonial-subtitle section-subtitle">{{subtitle}}</p>
    </div>
    <div class="carousel-wrapper" id="testimonialCarousel">
      <div class="carousel-track" id="carouselTrack">
        <!-- SLIDE 1 -->
        <div class="carousel-slide">
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #B51F33;">S</div>
              <div class="testimonial-info">
                <span class="testimonial-name">Steven Raffuel</span>
                <span class="testimonial-time">17h ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">A/C went down unexpectedly in the middle of humid New Jersey summer. Princeton Air was out in less than 24 hours and found the problem.</p>
          </div>
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #1EA7A8;">J</div>
              <div class="testimonial-info">
                <span class="testimonial-name">JRM</span>
                <span class="testimonial-time">a day ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">A/C went down unexpectedly in the middle of humid New Jersey summer. Princeton Air was out in less than 24 hours and found the problem.</p>
          </div>
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #3047B8;">G</div>
              <div class="testimonial-info">
                <span class="testimonial-name">Janet Grisi</span>
                <span class="testimonial-time">17h ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">A/C went down unexpectedly in the middle of humid New Jersey summer. Princeton Air was out in less than 24 hours and found the problem.</p>
          </div>
        </div>
        <!-- SLIDE 2 -->
        <div class="carousel-slide">
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #F59E0B;">M</div>
              <div class="testimonial-info">
                <span class="testimonial-name">Michael Torres</span>
                <span class="testimonial-time">2 days ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">Our water heater failed on a Sunday morning. Called Princeton Air and they had a technician at our door within 3 hours. Professional, courteous, and got our hot water back fast.</p>
          </div>
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #4F46E5;">K</div>
              <div class="testimonial-info">
                <span class="testimonial-name">Karen Chen</span>
                <span class="testimonial-time">Yesterday</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">Princeton Air installed a new HVAC system for our home. The team was professional, respectful of our space, and walked us through every step. Our energy bills have already dropped!</p>
          </div>
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #16A34A;">D</div>
              <div class="testimonial-info">
                <span class="testimonial-name">David O'Brien</span>
                <span class="testimonial-time">3 weeks ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">Had a plumbing emergency with a burst pipe in our basement. Princeton Air responded immediately, contained the damage, and replaced the section same day. Amazing service.</p>
          </div>
        </div>
        <!-- SLIDE 3 -->
        <div class="carousel-slide">
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #B51F33;">L</div>
              <div class="testimonial-info">
                <span class="testimonial-name">Linda Patterson</span>
                <span class="testimonial-time">5 days ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">From the first call to the final walkthrough, Princeton Air delivered exceptional service. They installed our new water heater and even showed us how to maintain it. Highly recommend!</p>
          </div>
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #1EA7A8;">R</div>
              <div class="testimonial-info">
                <span class="testimonial-name">Robert Kim</span>
                <span class="testimonial-time">1 week ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">Our AC unit stopped cooling during the hottest week of July. Princeton Air came out same day, diagnosed the issue, and had it repaired by evening. Absolute lifesaver.</p>
          </div>
          <div class="card-body">
            <div class="testimonial-top">
              <div class="testimonial-avatar" style="background: #3047B8;">S</div>
              <div class="testimonial-info">
                <span class="testimonial-name">Sarah Mitchell</span>
                <span class="testimonial-time">2 weeks ago</span>
              </div>
            </div>
            <div class="testimonial-stars"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i></div>
            <p class="testimonial-review">Princeton Air handled our whole-home plumbing inspection. They were thorough, explained everything clearly, and didn't try to upsell us on anything we didn't need. Honest and reliable.</p>
          </div>
        </div>
      </div>
      <div class="testimonial-indicators" id="indicators">
        <button class="active" data-index="0" aria-label="Slide 1"></button>
        <button data-index="1" aria-label="Slide 2"></button>
        <button data-index="2" aria-label="Slide 3"></button>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for testimonial-carousel */
.testimonial-section { background: #f8fafc; }
.carousel-wrapper { position: relative; overflow: hidden; width: 100%; }
.carousel-track { display: flex; transition: transform 0.6s ease-in-out; }
.carousel-slide { min-width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; padding: 12px 4px; box-sizing: border-box; }
.testimonial-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.testimonial-avatar { width: 44px; height: 44px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 18px; display: flex; align-items: center; justify-content: center; }
.testimonial-name { font-weight: 700; color: #172033; display: block; font-size: 16px; font-family: Outfit, sans-serif; }
.testimonial-time { font-size: 12px; color: #94a3b8; }
.testimonial-stars { color: #f59e0b; font-size: 14px; margin-bottom: 12px; display: flex; gap: 3px; }
.testimonial-review { color: #475569; font-size: 15px; line-height: 1.6; margin: 0; }
.testimonial-indicators { display: flex; justify-content: center; gap: 10px; margin-top: 32px; }
.testimonial-indicators button { width: 12px; height: 12px; border-radius: 50%; border: none; background: #cbd5e1; cursor: pointer; transition: 0.2s; padding: 0; }
.testimonial-indicators button.active { background: #A01922; width: 28px; border-radius: 8px; }`
  },

  // 11. coupon-grid (Section 11)
  {
    key: 'coupon-grid',
    name: 'Promotional Coupons Grid',
    category: 'Promotions',
    displayOrder: 110,
    schema: {
      heading: { type: 'text', label: 'Section Heading', default: 'Plumbing Specials & Discounts' },
      subtitle: { type: 'text', label: 'Subtitle', default: 'Take advantage of our current offers & coupons!' }
    },
    defaults: {
      heading: 'Plumbing Specials &amp; Discounts',
      subtitle: 'Take advantage of our current offers &amp; coupons!'
    },
    template: `<section class="coupon-section py-lg-6">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8 col-xl-7 text-center mb-5">
        <h2 class="coupon-heading section-title">{{{heading}}}</h2>
        <p class="coupon-subtitle section-subtitle">{{{subtitle}}}</p>
      </div>
    </div>
    <div class="row g-4">
      <div class="col-lg-4 col-md-6 col-12">
        <div class="card-body card-body-center d-flex flex-column">
          <div class="coupon-card-body">
            <span class="coupon-badge">$125 OFF</span>
            <h3 class="coupon-title">Sink/Shower Unclog<br />(Branch Line)</h3>
            <p class="coupon-expiry">Expires: 08/31/2026</p>
          </div>
          <div class="coupon-card-footer">
            <a onclick="openQuotePopup()" class="coupon-btn"><i class="fa-solid fa-arrow-right"></i> Redeem Offer</a>
            <a href="/offers/" class="coupon-link">More Info</a>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6 col-12">
        <div class="card-body card-body-center d-flex flex-column">
          <div class="coupon-card-body">
            <span class="coupon-badge">$89 OFF</span>
            <h3 class="coupon-title">Drain Cleaning<br />Service</h3>
            <p class="coupon-expiry">Expires: 08/31/2026</p>
          </div>
          <div class="coupon-card-footer">
            <a onclick="openQuotePopup()" class="coupon-btn"><i class="fa-solid fa-arrow-right"></i> Redeem Offer</a>
            <a href="/offers/" class="coupon-link">More Info</a>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6 col-12">
        <div class="card-body card-body-center d-flex flex-column">
          <div class="coupon-card-body">
            <span class="coupon-badge">$250 OFF</span>
            <h3 class="coupon-title">Water Heater<br />Installation</h3>
            <p class="coupon-expiry">Expires: 09/15/2026</p>
          </div>
          <div class="coupon-card-footer">
            <a onclick="openQuotePopup()" class="coupon-btn"><i class="fa-solid fa-arrow-right"></i> Redeem Offer</a>
            <a href="/offers/" class="coupon-link">More Info</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for coupon-grid */
.coupon-section { background: #fafafa; padding: 48px 0; }
.coupon-badge { display: inline-block; background: #A01922; color: #fff; font-weight: 800; font-size: 18px; padding: 6px 14px; border-radius: 6px; margin-bottom: 14px; font-family: Outfit, sans-serif; }
.coupon-title { font-size: 20px; font-weight: 700; color: #172033; margin-bottom: 8px; font-family: Outfit, sans-serif; }
.coupon-expiry { font-size: 13px; color: #94a3b8; margin-bottom: 20px; }
.coupon-btn { display: inline-flex; align-items: center; gap: 8px; background: #A01922; color: #fff; padding: 10px 22px; border-radius: 30px; font-weight: 700; text-decoration: none; cursor: pointer; transition: 0.2s; }
.coupon-btn:hover { background: #7d1118; color: #fff; }
.coupon-link { display: block; margin-top: 10px; color: #5b6472; font-size: 14px; text-decoration: underline; }`
  },

  // 12. financing-cta (Section 12)
  {
    key: 'financing-cta',
    name: 'Financing Pre-Approval Banner',
    category: 'Call to Action',
    displayOrder: 120,
    schema: {
      heading: { type: 'text', label: 'Heading', default: 'Get Pre-Approved Financing' },
      buttonText: { type: 'text', label: 'Button Label', default: 'Financing Options' }
    },
    defaults: {
      heading: 'Get Pre-Approved Financing',
      buttonText: 'Financing Options'
    },
    template: `<section class="financing-cta-section bg-light-gray">
  <div class="container">
    <div class="financing-cta-banner d-flex flex-wrap justify-content-between align-items-center">
      <div class="financing-cta-left d-flex align-items-center gap-3">
        <i class="bi bi-credit-card financing-cta-icon" aria-hidden="true"></i>
        <h2 class="financing-cta-heading">{{heading}}</h2>
      </div>
      <a onclick="openQuotePopup()" class="financing-cta-btn d-inline-flex align-items-center gap-2">
        <i class="bi bi-arrow-right-circle" aria-hidden="true"></i> {{buttonText}}
      </a>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for financing-cta */
.financing-cta-section { background: #f8fafc; padding: 32px 0; }
.financing-cta-banner { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px 36px; }
.financing-cta-icon { font-size: 32px; color: #A01922; }
.financing-cta-heading { font-size: 22px; font-weight: 700; color: #172033; margin: 0; font-family: Outfit, sans-serif; }
.financing-cta-btn { background: #172033; color: #fff; padding: 12px 26px; border-radius: 30px; font-weight: 700; text-decoration: none; cursor: pointer; transition: 0.2s; }
.financing-cta-btn:hover { background: #A01922; color: #fff; }`
  },

  // 13. comfort-club-perks (Section 13)
  {
    key: 'comfort-club-perks',
    name: 'Home Comfort Club Perks',
    category: 'Memberships',
    displayOrder: 130,
    schema: {
      title: { type: 'text', label: 'Title', default: 'Year-Round Confidence<br /><span class="comfort-club-heading-sub">With the Home Comfort Club</span>' },
      image: { type: 'image', label: 'Technician Image', default: { src: '/assets/img/5-year-round.webp', alt: 'Home Comfort Club Technician' } }
    },
    defaults: {
      title: 'Year-Round Confidence<br /><span class="comfort-club-heading-sub">With the Home Comfort Club</span>',
      image: { src: '/assets/img/5-year-round.webp', alt: 'Home Comfort Club Technician' }
    },
    template: `<section class="comfort-club-section section-padding py-lg-6">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-10 col-xl-9 text-center mb-5">
        <h2 class="section-title">{{{title}}}</h2>
        <p class="section-subtitle">
          Plumbing benefits from the same scheduled attention that protects your other essential systems. The Princeton Air Home Comfort Club puts that attention on a calendar so the quiet problems get caught on a planned visit instead of surfacing as emergency calls. Membership turns reactive service into predictable upkeep.
        </p>
      </div>
    </div>
    <div class="row align-items-center gx-5 gy-5">
      <div class="col-lg-5">
        <div class="comfort-club-image-wrap">
          <img src="{{image.src}}" alt="{{image.alt}}" class="comfort-club-image" width="700" height="900" loading="lazy">
        </div>
      </div>
      <div class="col-lg-7">
        <ul class="comfort-club-list">
          <li><a href="#" class="comfort-club-item"><span class="comfort-club-number">1.</span><span class="comfort-club-title">Pre-Planned Routine Maintenance</span><i class="bi bi-plus-circle comfort-club-icon"></i></a></li>
          <li><a href="#" class="comfort-club-item"><span class="comfort-club-number">2.</span><span class="comfort-club-title">Priority Scheduling and Faster Response</span><i class="bi bi-plus-circle comfort-club-icon"></i></a></li>
          <li><a href="#" class="comfort-club-item"><span class="comfort-club-number">3.</span><span class="comfort-club-title">Exclusive Member Savings</span><i class="bi bi-plus-circle comfort-club-icon"></i></a></li>
          <li><a href="#" class="comfort-club-item"><span class="comfort-club-number">4.</span><span class="comfort-club-title">Extended System Health</span><i class="bi bi-plus-circle comfort-club-icon"></i></a></li>
        </ul>
        <div class="comfort-club-membership">
          <h3 class="comfort-club-membership-title">The Home Comfort Club</h3>
          <p class="comfort-club-membership-sub">Service plans starting at</p>
          <div class="comfort-club-membership-buttons">
            <a href="#" class="steps-btn-outline" style="cursor: default;">$49.99/mo</a>
            <a onclick="openQuotePopup()" class="steps-btn-filled">All Service Plans <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for comfort-club-perks */
.comfort-club-section { background:#fff; padding:48px 0; }
.comfort-club-image { width: 100%; height: auto; border-radius: 16px; object-fit: cover; }
.comfort-club-list { list-style: none; padding: 0; margin-bottom: 32px; }
.comfort-club-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; text-decoration: none; color: #172033; font-weight: 600; font-size: 15px; }
.comfort-club-number { color: #A01922; margin-right: 8px; font-weight: 700; }
.comfort-club-icon { color: #A01922; font-size: 18px; }
.comfort-club-membership { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
.comfort-club-membership-title { font-size: 20px; font-weight: 700; color: #172033; margin: 0 0 6px; font-family: Outfit, sans-serif; }
.comfort-club-membership-sub { font-size: 14px; color: #5b6472; margin: 0 0 16px; }
.comfort-club-membership-buttons { display: flex; gap: 14px; flex-wrap: wrap; }
.steps-btn-outline { border: 1px solid #172033; color: #172033; padding: 10px 20px; border-radius: 30px; font-weight: 700; text-decoration: none; }
.steps-btn-filled { background: #A01922; color: #fff; padding: 10px 20px; border-radius: 30px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }`
  },

  // 14. plumbing-spotlight-hero (Section 14)
  {
    key: 'plumbing-spotlight-hero',
    name: 'Plumbing Spotlight Banner',
    category: 'Hero',
    displayOrder: 140,
    schema: {
      title: { type: 'text', label: 'Spotlight Title', default: 'Our New Jersey Plumbing Services' },
      image: { type: 'image', label: 'Image', default: { src: '/assets/img/6-plumbing-services.webp', alt: 'Our New Jersey Plumbing Services' } }
    },
    defaults: {
      title: 'Our New Jersey Plumbing<br />Services',
      image: { src: '/assets/img/6-plumbing-services.webp', alt: 'Our New Jersey Plumbing Services' }
    },
    template: `<section class="plumbing-hero section-padding bg-light-gray">
  <div class="container">
    <h1 class="section-title pb-3">{{{title}}}</h1>
    <div class="row align-items-center">
      <div class="col-md-6">
        <div class="hero-content">
          <p class="section-subtitle">
            Your plumbing system is dozens of specific components doing specific jobs, and any one of them can start pulling attention when it isn't working the way it should.
          </p>
          <p class="section-desc">
            Princeton Air's licensed plumbers bring decades of hands-on experience to every corner of your home's water supply and drainage systems.
          </p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="hero-image">
          <img src="{{image.src}}" alt="{{image.alt}}" class="img-fluid" width="700" height="900" loading="lazy">
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for plumbing-spotlight-hero */
.plumbing-hero { background:#f8fafc; padding: 48px 0; }
.hero-image img { width: 100%; height: auto; border-radius: 16px; object-fit: cover; }`
  },

  // 15. services-detailed-grid (Section 16 in raw)
  {
    key: 'services-detailed-grid',
    name: 'Detailed Services Grid (6 Cards)',
    category: 'Services',
    displayOrder: 160,
    schema: {
      title: { type: 'text', label: 'Section Title', default: 'Services' }
    },
    defaults: {
      title: 'Services'
    },
    template: `<section class="services-section section-padding bg-light-gray">
  <div class="container">
    <div class="section-header">
      <h2 class="section-title text-center"><span class="highlight">{{title}}</span></h2>
    </div>
    <div class="services-grid">
      <div class="service-card">
        <div class="card-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3>Emergency Plumbing</h3>
        <p>A plumbing emergency won't wait until tomorrow, and neither should the call.</p>
        <a href="/plumbing/" class="card-link">Emergency Plumbing <span class="arrow">→</span></a>
      </div>
      <div class="service-card">
        <div class="card-icon">
          <i class="fa-solid fa-faucet-drip"></i>
        </div>
        <h3>Pipe Services</h3>
        <p>Supply lines and drain stacks run out of sight for decades, and what happens inside them affects everything.</p>
        <a href="/plumbing/" class="card-link">Pipe Services <span class="arrow">→</span></a>
      </div>
      <div class="service-card">
        <div class="card-icon">
          <i class="fa-solid fa-filter"></i>
        </div>
        <h3>Drain Cleaning</h3>
        <p>Slow drains are an early indicator; stubborn blockages are a household halt.</p>
        <a href="/plumbing/" class="card-link">Drain Cleaning <span class="arrow">→</span></a>
      </div>
      <div class="service-card">
        <div class="card-icon">
          <i class="fa-solid fa-fire"></i>
        </div>
        <h3>Water Heaters</h3>
        <p>Hot water is one of those things a home is built around until it's lukewarm or missing.</p>
        <a href="/plumbing/" class="card-link">Water Heaters <span class="arrow">→</span></a>
      </div>
      <div class="service-card">
        <div class="card-icon">
          <i class="fa-solid fa-bolt"></i>
        </div>
        <h3>Tankless Water Heaters</h3>
        <p>Continuous hot water, less space taken, and reduced standby energy use make sense for high-demand homes.</p>
        <a href="/plumbing/" class="card-link">Tankless Water Heaters <span class="arrow">→</span></a>
      </div>
      <div class="service-card">
        <div class="card-icon">
          <i class="fa-solid fa-water"></i>
        </div>
        <h3>Sewer</h3>
        <p>A sewer issue is never simply an inconvenience; it requires swift diagnosis and targeted repair.</p>
        <a href="/plumbing/" class="card-link">Sewer Line Services <span class="arrow">→</span></a>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for services-detailed-grid */
.services-section { background:#f8fafc; padding: 48px 0; }
.services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 36px; }
.service-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 32px; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; justify-content: space-between; }
.service-card:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(0,0,0,0.08); border-color: #A01922; }
.card-icon { width: 50px; height: 50px; border-radius: 10px; background: #fdf2f2; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; transition: 0.2s; }
.card-icon i { font-size: 24px; color: #A01922; transition: 0.2s; }
.service-card:hover .card-icon { background: #A01922; }
.service-card:hover .card-icon i { color: #fff; }
.service-card h3 { font-size: 20px; font-weight: 700; color: #172033; margin: 0 0 12px; font-family: Outfit, sans-serif; }
.service-card p { font-size: 15px; color: #5b6472; line-height: 1.6; margin: 0 0 24px; }
.card-link { font-size: 15px; font-weight: 700; color: #A01922; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
.card-link:hover .arrow { transform: translateX(4px); }
.arrow { transition: transform 0.2s; }`
  },

  // 16. plumbing-hvac-cross-sell (Section 18 in raw)
  {
    key: 'plumbing-hvac-cross-sell',
    name: 'Multi-Trade Cross-Sell Bar',
    category: 'Services',
    displayOrder: 180,
    schema: {},
    defaults: {},
    template: `<section class="plumbing-hvac-section section-padding bg-light-gray" aria-label="Plumbing services">
  <div class="container">
    <div class="plumbing-grid">
      <a href="/hvac/" class="card-body card-body-center" aria-label="HVAC services">
        <span class="plumbing-card-icon" aria-hidden="true">
          <i class="fa-solid fa-fan"></i>
        </span>
        <div class="plumbing-card-content">
          <h3 class="plumbing-card-title">HVAC</h3>
        </div>
      </a>
      <a href="/electrical/" class="card-body card-body-center" aria-label="Electrical services">
        <span class="plumbing-card-icon" aria-hidden="true">
          <i class="fa-solid fa-bolt"></i>
        </span>
        <div class="plumbing-card-content">
          <h3 class="plumbing-card-title">Electrical</h3>
        </div>
      </a>
      <a href="/healthy-home/" class="card-body card-body-center" aria-label="Health services">
        <span class="plumbing-card-icon" aria-hidden="true">
          <i class="fa-solid fa-heart-pulse"></i>
        </span>
        <div class="plumbing-card-content">
          <h3 class="plumbing-card-title">Health</h3>
        </div>
      </a>
      <a href="/commercial/" class="card-body card-body-center" aria-label="Commercial plumbing services">
        <span class="plumbing-card-icon" aria-hidden="true">
          <i class="fa-solid fa-building"></i>
        </span>
        <div class="plumbing-card-content">
          <h3 class="plumbing-card-title">Commercial</h3>
        </div>
      </a>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for plumbing-hvac-cross-sell */
.plumbing-hvac-section { background:#f8fafc; padding: 40px 0; }
.plumbing-hvac-section .plumbing-card-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(169, 31, 56, 0.08); display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.plumbing-hvac-section .card-body-center:hover .plumbing-card-icon { background: #A01922; }
.plumbing-hvac-section .plumbing-card-icon i { font-size: 24px; color: #A01922; transition: 0.2s; }
.plumbing-hvac-section .card-body-center:hover .plumbing-card-icon i { color: #fff; }`
  },

  // 17. comfort-closing-cta (Section 19 in raw)
  {
    key: 'comfort-closing-cta',
    name: 'Closing Guarantee & Callout',
    category: 'Call to Action',
    displayOrder: 190,
    schema: {
      title: { type: 'text', label: 'Title', default: 'Restore Your Comfort.<br> Call Princeton Air Today.' },
      subtitle: { type: 'text', label: 'Subtitle', default: 'Quality, Friendly Service in Central New Jersey Since 1971.' },
      image: { type: 'image', label: 'Image', default: { src: '/assets/img/7-restore-your.webp', alt: 'Restore Your Comfort' } },
      phone: { type: 'text', label: 'Phone', default: '(123) 456-7890' }
    },
    defaults: {
      title: 'Restore Your Comfort.<br> Call Princeton Air Today.',
      subtitle: 'Quality, Friendly Service in Central New Jersey Since 1971.',
      image: { src: '/assets/img/7-restore-your.webp', alt: 'Restore Your Comfort' },
      phone: '(123) 456-7890'
    },
    template: `<section class="comfort-section section-padding">
  <div class="container">
    <div class="row">
      <div class="col-12 mb-4">
        <div class="comfort-heading text-center">
          <h2 class="section-title">{{{title}}}</h2>
          <p class="section-subtitle">{{subtitle}}</p>
        </div>
      </div>
    </div>
    <div class="row align-items-center g-4">
      <div class="col-lg-6 col-12">
        <div class="comfort-img-wrap">
          <img src="{{image.src}}" alt="{{image.alt}}" class="comfort-img img-fluid" width="700" height="900" loading="lazy">
        </div>
      </div>
      <div class="col-lg-6 col-12">
        <div class="comfort-content">
          <p class="comfort-lead">
            Plumbing shouldn't pull you away from your week. A single call connects you to a licensed, prepared technician who diagnoses the issue honestly and repairs it properly the first time.
          </p>
          <div class="comfort-buttons">
            <a href="tel:{{phone}}" class="btn-filled-chat">
              <i class="fa-solid fa-phone"></i> Call {{phone}}
            </a>
            <a onclick="openQuotePopup()" class="btn-outline-phone">
              <i class="fa-solid fa-message"></i> Book Online
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for comfort-closing-cta */
.comfort-section { background: #fff; padding: 48px 0; }
.comfort-img { width: 100%; height: auto; border-radius: 16px; object-fit: cover; }
.comfort-lead { font-size: 18px; line-height: 1.6; color: #475569; margin-bottom: 28px; }
.comfort-buttons { display: flex; gap: 16px; flex-wrap: wrap; }`
  },

  // 18. certifications-marquee (Section 20 in raw)
  {
    key: 'certifications-marquee',
    name: 'Certifications & Partners Marquee',
    category: 'Social Proof',
    displayOrder: 200,
    schema: {},
    defaults: {},
    template: `<section class="gallery-slider-wrapper section-padding">
  <div class="container">
    <div class="row align-items-center g-0">
      <div class="col overflow-hidden" id="sliderContainer">
        <div class="gallery-slider-track" id="logoTrack">
          <div class="gallery-slider-card"><img src="/assets/img/abc-logo.webp" alt="ABC" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/acca-logo.webp" alt="ACCA" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/bbb-logo.webp" alt="BBB" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/factory-auth-logo.webp" alt="Carrier Factory Authorized" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/nat-grid-logo.webp" alt="National Grid" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/nate-logo.webp" alt="NATE" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/phcc-logo.webp" alt="PHCC" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/acca-logo.webp" alt="ACCA" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/abc-logo.webp" alt="ABC" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/bbb-logo.webp" alt="BBB" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/nat-grid-logo.webp" alt="National Grid" width="160" height="70" loading="lazy"></div>
          <div class="gallery-slider-card"><img src="/assets/img/nate-logo.webp" alt="NATE" width="160" height="70" loading="lazy"></div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `/* Scoped Layer 2 styles for certifications-marquee */
.gallery-slider-wrapper { background: #fff; padding: 36px 0; border-top: 1px solid #ECECEC; }
.gallery-slider-track { display: flex; align-items: center; gap: 40px; width: max-content; animation: marqueeScroll 25s linear infinite; }
.gallery-slider-card { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.gallery-slider-card img { max-height: 55px; width: auto; object-fit: contain; filter: grayscale(100%); opacity: 0.7; transition: 0.3s; }
.gallery-slider-card img:hover { filter: grayscale(0%); opacity: 1; }
@keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`
  }
];

async function run() {
  console.log('1. Writing local component definitions...');
  for (const c of componentDefs) {
    const dir = path.join(compRoot, c.key);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'template.html'), c.template);
    fs.writeFileSync(path.join(dir, 'schema.json'), JSON.stringify(c.schema, null, 2));
    fs.writeFileSync(path.join(dir, 'defaults.json'), JSON.stringify(c.defaults, null, 2));
    fs.writeFileSync(path.join(dir, 'style.css'), c.css);
  }
  console.log('Local component files written successfully.');

  console.log('2. Syncing components to Azure PostgreSQL public.theme_components...');
  const THEME_GUID = 'a1000000-0000-0000-0000-000000000001';

  // Fetch existing rows from theme_components to preserve row_guids
  const existingComps = await DataService.selectRows('theme_components', 'row_guid,component_key', [{ Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }]);
  const guidMap = {};
  existingComps.forEach(r => { guidMap[r.component_key] = r.row_guid; });

  const rowsToMerge = componentDefs.map(c => {
    return {
      row_guid: guidMap[c.key] || undefined,
      theme_guid: THEME_GUID,
      component_key: c.key,
      name: c.name,
      category: c.category,
      schema_json: c.schema,
      template_html: c.template,
      defaults_json: c.defaults,
      css: c.css,
      display_order: c.displayOrder,
      is_active: true,
      is_deleted: false
    };
  });

  const mergeRes = await DataService.merge(rowsToMerge, 'theme_components');
  console.log('theme_components merge result:', mergeRes.data?.status || mergeRes.status);

  console.log('3. Updating page sections in public.bizfire_page_contents...');
  const PAGE_GUID = 'c8d97d1b-39ac-4efc-ac8f-1b84e3f76b8b';

  // Construct 20 sections in exact sequence
  const pageSections = [
    { type: 'plumbing-hero-split', content: componentDefs.find(c => c.key === 'plumbing-hero-split').defaults },
    { type: 'cta-strip', content: componentDefs.find(c => c.key === 'cta-strip').defaults },
    { type: 'plumbing-order-checklist', content: componentDefs.find(c => c.key === 'plumbing-order-checklist').defaults },
    { type: 'plumbing-services-grid', content: componentDefs.find(c => c.key === 'plumbing-services-grid').defaults },
    { type: 'plumbing-care-video', content: componentDefs.find(c => c.key === 'plumbing-care-video').defaults },
    { type: 'trust-bar', content: componentDefs.find(c => c.key === 'trust-bar').defaults },
    { type: 'accordion-map-section', content: componentDefs.find(c => c.key === 'accordion-map-section').defaults },
    { type: 'process-steps-grid', content: componentDefs.find(c => c.key === 'process-steps-grid').defaults },
    { type: 'cta-banner-dual', content: componentDefs.find(c => c.key === 'cta-banner-dual').defaults },
    { type: 'testimonial-carousel', content: componentDefs.find(c => c.key === 'testimonial-carousel').defaults },
    { type: 'coupon-grid', content: componentDefs.find(c => c.key === 'coupon-grid').defaults },
    { type: 'financing-cta', content: componentDefs.find(c => c.key === 'financing-cta').defaults },
    { type: 'comfort-club-perks', content: componentDefs.find(c => c.key === 'comfort-club-perks').defaults },
    { type: 'plumbing-spotlight-hero', content: componentDefs.find(c => c.key === 'plumbing-spotlight-hero').defaults },
    { type: 'plumbing-services-grid', content: componentDefs.find(c => c.key === 'plumbing-services-grid').defaults },
    { type: 'services-detailed-grid', content: componentDefs.find(c => c.key === 'services-detailed-grid').defaults },
    { type: 'cta-banner-dual', content: componentDefs.find(c => c.key === 'cta-banner-dual').defaults },
    { type: 'plumbing-hvac-cross-sell', content: componentDefs.find(c => c.key === 'plumbing-hvac-cross-sell').defaults },
    { type: 'comfort-closing-cta', content: componentDefs.find(c => c.key === 'comfort-closing-cta').defaults },
    { type: 'certifications-marquee', content: componentDefs.find(c => c.key === 'certifications-marquee').defaults }
  ];

  const pageMergeRes = await DataService.merge([{
    row_guid: PAGE_GUID,
    sections_json: pageSections
  }], 'bizfire_page_contents');
  console.log('bizfire_page_contents merge result:', pageMergeRes.data?.status || pageMergeRes.status);

  console.log('All steps completed successfully!');
}

run().catch(err => {
  console.error('Migration failed:', err.response?.data || err.message);
});
