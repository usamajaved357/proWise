// ── Agency Profile Data — background module ─────────────────────────────────
// Reads an Upwork agency profile's Vuex store + one Vue component's local
// $data (work history isn't in Vuex at all — see readWorkHistory below) via
// MAIN-world execution, the same reason GET_PORTFOLIO_DATA does for freelancers.

export async function handleGetAgencyData(msg, sender) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    world: 'MAIN',
    func: async () => {
      // The initial SSR snapshot on window.__NUXT__ has an EMPTY staffs array
      // for every team — the real member roster only populates on the live
      // window.$nuxt.$store after a client-side fetch post-hydration. The
      // portfolio (projects.edges) turned out to have the same problem: it
      // read fully populated during manual console exploration (which
      // happens several seconds after navigation, across multiple tool
      // round-trips), but came back empty from the real content script,
      // which fires much sooner at document_idle — so the wait condition
      // below now also blocks on portfolio, not just staff.
      let store = null;
      for (let i = 0; i < 15; i++) {
        store = window.$nuxt && window.$nuxt.$store;
        const ap = store && store.state && store.state.agencyProfile;
        const teams = ap && ap.agency && ap.agency.teams;
        const staffsReady = Array.isArray(teams) && teams[0] && teams[0].staffs && (teams[0].staffs.staffs || []).length > 0;
        // totalCount === 0 is a legitimate "this agency has no portfolio
        // items" state, not a not-loaded-yet state — only block on a
        // mismatch between a non-zero totalCount and empty edges.
        const projectsReady = ap && ap.projects && Array.isArray(ap.projects.edges) &&
          (!ap.projects.totalCount || ap.projects.edges.length > 0);
        if (staffsReady && projectsReady) break;
        await new Promise(r => setTimeout(r, 300));
      }
      if (!store) return null;

      const ap = store.state.agencyProfile || {};
      if (ap.projects && ap.projects.totalCount > 0 && (!ap.projects.edges || !ap.projects.edges.length)) {
        console.warn('[SnagAI] Agency portfolio never hydrated — totalCount:', ap.projects.totalCount, 'edges:', ap.projects.edges);
      }
      const agency = ap.agency || {};

      const allStaff = (agency.teams || []).flatMap(t => (t.staffs && t.staffs.staffs) || []);
      const toMember = s => ({
        name: (s.personalData || {}).name || '',
        jss: (s.personalData || {}).jobSuccessScore ?? null,
        topRatedStatus: (s.personalData || {}).topRatedStatus || null,
        topRatedPlusStatus: (s.personalData || {}).topRatedPlusStatus || null,
        agencyOwner: !!s.agencyOwner,
      });
      // Upwork's own distinction — MANAGER = "Business managers" section,
      // CONTRACTOR = "Agency members" section on the rendered profile page.
      const managers = allStaff.filter(s => s.memberType === 'MANAGER').map(toMember);
      const members  = allStaff.filter(s => s.memberType === 'CONTRACTOR').map(toMember);

      const portfolio = ((ap.projects || {}).edges || []).map(e => e.node).filter(Boolean).map(p => ({
        title: p.title || '',
        description: p.description || '',
        url: p.projectUrl || '',
      }));

      const services = (agency.services || []).map(s => ({
        occupation: s.occupationName || '',
        description: s.description || '',
      }));

      const featuredClients = (agency.featuredClients || []).map(c => ({
        name: c.name || '',
        description: c.description || '',
      }));

      const locations = (ap.locations || []).map(l => ({
        country: l.country || '', state: l.state || '', city: l.city || '',
      }));

      // clientFocus comes back as enum strings like "LARGE_BUSINESS"
      const humanize = s => s.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');

      // Work history is NOT in the Vuex store at all — it's local $data on
      // the Vue component that renders the "Work history" section, found
      // via the heading text since there's no other reliable public hook.
      // Only the first page loaded by default (~10 closed + ~10 active) is
      // captured, same "sample of reviews" tradeoff the freelancer flow
      // already makes — closedTotal/activeTotal carry the true scale even
      // though item-level detail is a sample, not the full history.
      function readWorkHistory() {
        try {
          const headingEl = Array.from(document.querySelectorAll('h1,h2,h3,h4'))
            .find(el => el.children.length === 0 && /^work history$/i.test((el.textContent || '').trim()));
          const section = headingEl && headingEl.closest('.air3-card-section');
          const vm = section && section.__vue__;
          const d = vm && vm.$data && vm.$data.data;
          if (!d) return { closedTotal: 0, activeTotal: 0, items: [] };
          const closed = (d.closed || {}).workHistoryList || [];
          const active = (d.active || {}).workHistoryList || [];
          const toItem = c => ({
            title: c.title || '',
            status: c.status || '',
            jobType: c.jobType || '',
            startedOn: c.startedOnDateTime || null,
            endedOn: c.endedOnDateTime || null,
            totalCost: c.totalCost ?? null,
            totalHours: c.totalHours ?? null,
            hourlyRate: c.hourlyRate ?? null,
            rating: c.feedback ? c.feedback.score : null,
            review: (c.feedback && c.feedback.commentPublic) ? (c.feedback.comment || '') : '',
          });
          return {
            closedTotal: (d.closed || {}).totalCount || 0,
            activeTotal: (d.active || {}).totalCount || 0,
            items: [...closed, ...active].map(toItem),
          };
        } catch (e) {
          return { closedTotal: 0, activeTotal: 0, items: [] };
        }
      }

      const owner = agency.ownerStaff && agency.ownerStaff.personalData;

      return {
        name: agency.name || '',
        photo: agency.photo || '',
        description: agency.description || '',
        summary: agency.summary || '',
        jobSuccessScore: agency.jobSuccessScore ?? null,
        topRatedStatus: agency.topRatedStatus || null,
        topRatedPlusStatus: agency.topRatedPlusStatus || null,
        vetted: !!agency.vetted,
        minRate: agency.minRate ?? null,
        maxRate: agency.maxRate ?? null,
        minimumProjectSize: agency.minimumProjectSize || null,
        totalJobs: agency.totalJobs || '0',
        totalEarnings: agency.totalEarnings ?? null,
        totalHours: agency.totalHours ?? null,
        memberSinceDateTime: agency.memberSinceDateTime || null,
        numberOfEmployees: agency.numberOfEmployees || null,
        agencyYearFounded: agency.agencyYearFounded || null,
        clientFocus: (agency.clientFocus || []).map(humanize),
        languages: (agency.languages || [])
          .map(l => [(l.language || {}).englishName, (l.proficiencyLevel || {}).proficiencyTitle].filter(Boolean).join(': '))
          .filter(Boolean),
        awards: (agency.awards || []).map(a => ({ name: a.name || '', description: a.description || '' })),
        skills: (agency.skills || []).map(s => s.preferredLabel).filter(Boolean),
        services,
        featuredClients,
        portfolio,
        workHistory: readWorkHistory(),
        owner: owner ? {
          name: owner.name || '',
          jss: owner.jobSuccessScore ?? null,
          topRatedStatus: owner.topRatedStatus || null,
          topRatedPlusStatus: owner.topRatedPlusStatus || null,
        } : null,
        managers,
        members,
        locations,
      };
    },
  });
  return results?.[0]?.result || null;
}
