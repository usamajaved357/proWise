// ── Snag AI Background — message router ───────────────────────────────────────
import { handleGenerate } from './modules/generate.js';
import { getStatus }      from './modules/status.js';

// Generate a stable device UUID on first install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['deviceId'], data => {
    if (!data.deviceId) {
      const id = crypto.randomUUID();
      chrome.storage.local.set({ deviceId: id });
      console.log('[SnagAI] Device ID generated:', id);
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GENERATE_PROPOSAL') {
    handleGenerate(msg.payload).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GET_STATUS') {
    getStatus().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'OPEN_OPTIONS_TAB') {
    const tab = msg.tab || 'subscription';
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') + '?tab=' + tab });
    sendResponse({ ok: true }); return true;
  }
  if (msg.type === 'OPEN_PRICING') {
    chrome.tabs.create({ url: 'https://snagai.netlify.app/#pricing' });
    sendResponse({ ok: true }); return true;
  }
  if (msg.type === 'OPEN_CHECKOUT') {
    chrome.tabs.create({ url: 'https://snagai.netlify.app/checkout.html?plan=' + (msg.plan || 'pro') });
    sendResponse({ ok: true }); return true;
  }
  if (msg.type === 'SET_PRIMARY_PROFILE') {
    chrome.storage.local.set({ primaryProfileId: msg.profileId }, () => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'GET_PRIMARY_PROFILE_ID') {
    chrome.storage.local.get(['primaryProfileId'], d => sendResponse({ primaryProfileId: d.primaryProfileId || null }));
    return true;
  }
  if (msg.type === 'GET_JOB_DATA') {
    // Reads job stats from window.__NUXT__.vuex.jobDetails — far more reliable than DOM parsing
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        try {
          const jd      = window.__NUXT__?.vuex?.jobDetails;
          if (!jd) return null;

          const job      = jd.job      || {};
          const buyer    = jd.buyer    || {};
          const activity = job.clientActivity || {};
          const quals    = job.qualifications || {};
          const stats    = buyer.stats  || {};
          const loc      = buyer.location || {};

          // Time posted
          const postedOn = job.postedOn ? new Date(job.postedOn) : null;
          const mins     = postedOn ? Math.round((Date.now() - postedOn.getTime()) / 60000) : null;
          function fmtAge(m) {
            if (!m) return null;
            if (m < 60)    return m + ' minutes ago';
            if (m < 1440)  return Math.floor(m / 60) + ' hours ago';
            if (m < 10080) return Math.floor(m / 1440) + ' days ago';
            return Math.floor(m / 10080) + ' weeks ago';
          }

          // Hire rate
          const jobsPosted      = (buyer.jobs || {}).postedCount || 0;
          const totalWithHires  = stats.totalJobsWithHires || 0;
          const clientHireRate  = jobsPosted > 0 ? Math.round((totalWithHires / jobsPosted) * 100) : null;

          // Client rating (null if never rated)
          const clientRating = (stats.feedbackCount || 0) > 0 ? stats.score : null;

          // Client spend
          const totalCharges  = stats.totalCharges;
          const clientSpentNum = totalCharges ? parseFloat(String(totalCharges).replace(/[,$]/g, '')) : 0;

          // English requirement
          const engMap = { 0: null, 1: 'Basic', 2: 'Conversational', 3: 'Fluent', 4: 'Native or Bilingual' };

          // Location restriction
          const hasLocationFilter = !!(quals.locationCheckRequired || quals.countries?.length || quals.regions?.length);
          const reqCountries      = quals.countries  || null;
          const reqRegions        = quals.regions    || null;

          // Talent type
          const talentMap = { 0: 'Any', 1: 'Independent', 2: 'Agency' };

          return {
            // Activity
            proposalCount:       activity.totalApplicants          ?? null,
            hiredCount:          activity.totalHired               ?? 0,
            interviewingCount:   activity.totalInvitedToInterview  ?? null,
            invitesSent:         activity.invitationsSent          ?? null,
            unansweredInvites:   activity.unansweredInvites        ?? null,
            numberOfPositions:   activity.numberOfPositionsToHire  ?? 1,

            // Time
            timePostedMinutes:   mins,
            timePosted:          fmtAge(mins),
            lastBuyerActivity:   activity.lastBuyerActivity        || null,

            // Client
            paymentVerified:     buyer.isPaymentMethodVerified     ?? null,
            clientHireRate,
            clientRating,
            clientTotalSpent:    totalCharges ? '$' + totalCharges : null,
            clientSpentNum,
            clientAvgRate:       buyer.avgHourlyJobsRate           || null,
            clientLocation:      loc.country                       || null,
            clientTimezone:      loc.countryTimezone               || null,
            clientIsTopClient:   buyer.isTopClient                 || false,
            clientTotalJobs:     jobsPosted,
            clientTotalHires:    totalWithHires,
            clientMemberSince:   (buyer.company || {}).contractDate || null,

            // Requirements
            reqJSS:             quals.minJobSuccessScore > 0 ? quals.minJobSuccessScore : null,
            reqEnglish:         engMap[quals.prefEnglishSkill || 0],
            reqTalentType:      talentMap[quals.type || 0],
            reqRisingTalent:    quals.risingTalent      || false,
            reqMinEarnings:     quals.earnings           || null,
            hasLocationFilter,
            reqCountries,
            reqRegions,

            // Job details
            contractorTier:     job.contractorTier      || null,
            jobType:            job.type === 1 ? 'fixed' : job.type === 2 ? 'hourly' : null,
            engagementDuration: (job.engagementDuration || {}).label || null,
            weeklyHours:        job.workload             || null,
            isContractToHire:   job.isContractToHire    || false,
            requiredConnects:   (jd.connects?.pricing?.price) || null,
          };
        } catch(e) { return null; }
      },
    }).then(results => sendResponse(results?.[0]?.result || null))
      .catch(() => sendResponse(null));
    return true;
  }
  if (msg.type === 'GET_PROFILE_PIC') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        // 1. Vuex store — profileViewer holds the VIEWED freelancer's data
        try {
          const store = document.getElementById('__nuxt').__vue__.$store;
          const pv = store?.state?.profileViewer;
          const url =
            pv?.profile?.profilePhoto?.publicUrl ||
            pv?.profile?.profilePhoto?.url ||
            pv?.model?.portrait?.publicUrl ||
            pv?.freelancerProfile?.profilePhoto?.publicUrl ||
            pv?.profile?.portrait?.publicUrl;
          if (url && url.startsWith('https://')) return url;
        } catch(e) {}

        // 2. OG image — Upwork sets this to the viewed profile's photo
        try {
          const og = document.querySelector('meta[property="og:image"]');
          if (og?.content?.startsWith('https://') && !/upwork-logo|placeholder/i.test(og.content)) {
            return og.content;
          }
        } catch(e) {}

        // 3. Target the profile content section specifically — skip nav header
        try {
          const sections = [
            document.querySelector('[data-test="portrait"]'),
            document.querySelector('[data-test="pib-portrait"]'),
            document.querySelector('.fe-profile-header'),
            document.querySelector('.pib-top'),
            document.querySelector('main'),
          ].filter(Boolean);
          for (const section of sections) {
            const imgs = section.querySelectorAll('img[src]');
            for (const img of imgs) {
              if (img.src.startsWith('https://') &&
                  !/placeholder|default|blank|logo|icon/i.test(img.src) &&
                  img.naturalWidth > 40) {
                return img.src;
              }
            }
          }
        } catch(e) {}
        return '';
      },
    }).then(results => sendResponse(results?.[0]?.result || ''))
      .catch(() => sendResponse(''));
    return true;
  }
  if (msg.type === 'GET_PORTFOLIO_DATA') {
    // Runs in the page's JS context (MAIN world) — bypasses CSP, can access __vue__
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: async () => {
        // Dispatch Vuex action to load all published portfolio projects
        // page:1 triggers a fresh full fetch — returns all projects in one call
        try {
          const store = document.getElementById('__nuxt').__vue__.$store;
          await store.dispatch('profileViewer/fetchPortfolioV2Items', { page: 1 });
        } catch(e) {}

        // Also load any additional pages (for profiles with many portfolios)
        const collected = [];
        const seen = new Set();
        let page = 1;
        const limit = 4;
        while (true) {
          try {
            const store = document.getElementById('__nuxt').__vue__.$store;
            const pv2   = store.state.profileViewer.portfolioV2;
            const batch = [...(pv2.publishedCurrentPageProjects || []), ...(pv2.draftCurrentPageProjects || [])];
            let addedNew = false;
            batch.forEach(p => {
              if (p && p.uid && !seen.has(p.uid)) { seen.add(p.uid); collected.push(p); addedNew = true; }
            });
            // If this page returned fewer than the limit, we've reached the end
            if (!addedNew || (pv2.publishedCurrentPageProjects || []).length < limit) break;
            // Load next page
            page++;
            if (page > 20) break; // safety cap
            await store.dispatch('profileViewer/fetchPortfolioV2Items', { page });
            await new Promise(r => setTimeout(r, 300));
          } catch(e) { break; }
        }

        return collected.filter(p => p && p.title).map(p => {
          const urls = [];
          if (p.projectUrl && /^https?:\/\//.test(p.projectUrl)) urls.push(p.projectUrl);
          (p.attachments || []).forEach(a => {
            const u = (a.type === 'embeddedLink' && /^https?:\/\//.test(a.link)) ? a.link : null;
            const o = /^https?:\/\//.test(a.originalAttachment || '') ? a.originalAttachment : null;
            const url = o || u;
            if (url && !urls.includes(url)) urls.push(url);
          });
          const skills = (p.tags || []).map(t => (t.ontologySkill && t.ontologySkill.prefLabel) || t.freeText || '').filter(Boolean);
          return { title: p.title.trim(), desc: (p.description || '').trim().slice(0, 500), role: (p.role || '').trim(), urls, skills, _autoRead: true };
        });
      },
    }).then(results => sendResponse(results?.[0]?.result || []))
      .catch(() => sendResponse([]));
    return true;
  }
});
