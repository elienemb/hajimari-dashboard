    /* ── Sakura petals ── */
    const container = document.getElementById('petals');
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'petal';
      const sz = 5 + Math.random() * 8;
      p.style.cssText = `left:${Math.random()*100}%;--sz:${sz}px;--dur:${7+Math.random()*9}s;--delay:${Math.random()*14}s;--drift:${(Math.random()-.3)*160}px;--spin:${300+Math.random()*600}deg;`;
      container.appendChild(p);
    }

    /* ── Chart helpers ── */
    let emailChart = null;
    function buildChart(data) {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const today = new Date();
      const labels = [];
      for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate()-i); labels.push(days[d.getDay()]); }
      const ti = data.length - 1;
      const bg  = data.map((_,i) => i===ti ? 'rgba(244,194,74,.95)' : 'rgba(52,211,153,.35)');
      const hov = data.map((_,i) => i===ti ? 'rgba(244,194,74,1)'   : 'rgba(52,211,153,.55)');
      document.getElementById('chart-today-label').textContent = labels[ti] + ' (' + data[ti] + ' emails)';
      const ctx = document.getElementById('emailVolumeChart').getContext('2d');
      if (emailChart) emailChart.destroy();
      emailChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Emails received', data, backgroundColor: bg, hoverBackgroundColor: hov, borderRadius: 6, borderSkipped: false }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor:'#0e2016', borderColor:'rgba(200,230,200,.15)', borderWidth:1, titleColor:'#c8dbc0', bodyColor:'rgba(200,219,192,.7)', padding:12, callbacks:{ label: c=>` ${c.parsed.y} emails received` } }
          },
          scales: {
            x: { grid:{display:false}, border:{display:false}, ticks:{color:'rgba(200,219,192,.5)', font:{family:"'Space Mono',monospace",size:11}} },
            y: { beginAtZero:true, grid:{color:'rgba(52,211,153,.07)'}, border:{display:false,dash:[4,4]}, ticks:{color:'rgba(200,219,192,.4)', font:{family:"'Space Mono',monospace",size:10}, maxTicksLimit:5, stepSize:5} }
          }
        }
      });
    }
    buildChart([12, 5, 8, 20, 3, 15, 9]); // mock data — replaced after login

    /* ── Google Sign-In ── */
    const CLIENT_ID = '939178720273-qtjjoa75suvs88glgpgujveermlh51mf.apps.googleusercontent.com';
    const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly openid profile email';
    let tokenClient, accessToken = null;

    window.addEventListener('load', () => {
      // Set dynamic date
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      const dateFmt = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      document.getElementById('topbar-date').textContent = dateFmt;
      document.getElementById('infobar-date').textContent = now.toLocaleDateString('en-US', { day:'numeric', month:'long' });

      // Live clock in info bar
      function updateClock() {
        const t = new Date();
        const hh = String(t.getHours()).padStart(2,'0');
        const mm = String(t.getMinutes()).padStart(2,'0');
        document.getElementById('infobar-time').textContent = `${hh}:${mm}`;
      }
      updateClock();
      setInterval(updateClock, 30000);

      // Wait for GSI to be ready
      const initGSI = () => {
        if (!window.google) { setTimeout(initGSI, 200); return; }
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: handleToken,
        });
      };
      initGSI();
    });

    document.getElementById('google-login-btn').addEventListener('click', () => {
      const btn = document.getElementById('google-login-btn');
      btn.disabled = true;
      btn.textContent = 'Waiting...';
      if (tokenClient) tokenClient.requestAccessToken();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      accessToken = null;
      google.accounts.oauth2.revoke(accessToken, () => {});
      document.getElementById('user-badge').classList.remove('visible');
      document.getElementById('login-overlay').classList.remove('hidden');
      const btn = document.getElementById('google-login-btn');
      btn.disabled = false;
      btn.innerHTML = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.017 17.64 11.71 17.64 9.2z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/></svg> Sign in with Google';
    });

    async function handleToken(resp) {
      if (resp.error) { console.error(resp.error); const btn=document.getElementById('google-login-btn'); btn.disabled=false; btn.textContent='Sign in with Google'; return; }
      accessToken = resp.access_token;
      document.getElementById('login-overlay').classList.add('hidden');
      setLoadingState(true);
      
      // Clear mock data immediately upon login
      ['card-emails', 'card-meetings', 'card-tasks'].forEach(id => {
        const card = document.getElementById(id);
        if(card) {
          card.querySelector('.card-number').textContent = '-';
          card.querySelector('.card-sub').textContent = 'Loading...';
          card.querySelector('.progress-fill').style.width = '0%';
          card.querySelector('.progress-meta span:last-child').textContent = '-';
          const footerDot = card.querySelector('.card-footer-dot');
          if (footerDot) card.querySelector('.card-footer').innerHTML = '<span class="card-footer-dot"></span> Fetching...';
        }
      });
      document.getElementById('infobar-tasks').textContent = 'loading...';

      try {
        await Promise.all([
          fetchUserInfo().catch(e => console.error('User info error:', e)),
          fetchGmailData().catch(e => { console.error('Gmail error:', e); showError('card-emails', e.message); }),
          fetchCalendarData().catch(e => { console.error('Calendar error:', e); showError('card-meetings', e.message); }),
          fetchTasksData().catch(e => { console.error('Tasks error:', e); showError('card-tasks', 'API disabled or permission denied.'); })
        ]);
      } catch(e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoadingState(false);
      }
    }

    function showError(cardId, customMsg) {
      const card = document.getElementById(cardId);
      if(card) {
        card.querySelector('.card-number').textContent = '!';
        card.querySelector('.card-sub').textContent = customMsg || 'Error loading data.';
        card.querySelector('.card-badge').textContent = 'Error';
        card.querySelector('.card-footer').innerHTML = '<span class="card-footer-dot"></span> Check console logs';
      }
    }

    function setLoadingState(on) {
      ['card-emails','card-meetings','card-tasks'].forEach(id => {
        document.getElementById(id)?.querySelectorAll('.card-number,.card-sub,.card-footer').forEach(el => el.classList.toggle('is-loading', on));
      });
    }

    async function gFetch(url) {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
      return r.json();
    }

    async function fetchUserInfo() {
      const d = await gFetch('https://www.googleapis.com/oauth2/v3/userinfo');
      document.getElementById('user-avatar').src  = d.picture || '';
      document.getElementById('user-avatar').alt  = d.name   || '';
      document.getElementById('user-name').textContent = d.given_name || d.name || '';
      document.getElementById('user-badge').classList.add('visible');
    }

    function gmailDateQ(d) {
      return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    }

    async function fetchGmailData() {
      const today = new Date();

      // Fetch inbox stats + weekly counts in parallel
      const weekPromises = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const nd = new Date(d);    nd.setDate(d.getDate() + 1);
        weekPromises.push(gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox+after:${gmailDateQ(d)}+before:${gmailDateQ(nd)}&maxResults=1`));
      }
      const [inbox, imp, recent, ...weekResults] = await Promise.all([
        gFetch('https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX'),
        gFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread+is:important&maxResults=1'),
        gFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&labelIds=INBOX'),
        ...weekPromises
      ]);

      const unread   = inbox.messagesUnread || 0;
      const total    = inbox.messagesTotal  || 0;
      const impCount = imp.resultSizeEstimate || 0;

      // Update weekly chart with real counts
      const weekCounts = weekResults.map(r => r.resultSizeEstimate || 0);
      buildChart(weekCounts);

      let footerTxt = 'No recent emails';
      if (recent.messages?.length) {
        const msg = await gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${recent.messages[0].id}?format=metadata&metadataHeaders=Date`);
        const dateStr = msg.payload?.headers?.find(h => h.name === 'Date')?.value;
        if (dateStr) {
          const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
          footerTxt = mins < 60 ? `Last received ${mins} min ago` : mins < 1440 ? `Last received ${Math.floor(mins/60)}h ago` : 'Last received yesterday';
        }
      }
      const badge = impCount > 5 ? 'Urgent' : impCount > 0 ? 'Attention' : 'All good';
      const pct   = total > 0 ? Math.round(((total - unread) / total) * 100) : 0;
      const card  = document.getElementById('card-emails');
      card.querySelector('.card-number').textContent = impCount;
      card.querySelector('.card-label').textContent  = 'Important unread';
      card.querySelector('.card-sub').textContent    = `Out of ${unread} total unread email${unread!==1?'s':''}.`;
      card.querySelector('.card-badge').textContent  = badge;
      card.querySelector('.progress-meta span:last-child').textContent = `${total-unread} of ${total}`;
      card.querySelector('.progress-fill').style.width = pct + '%';
      card.querySelector('.card-footer').innerHTML = `<span class="card-footer-dot"></span> ${footerTxt}`;
    }

    async function fetchCalendarData() {
      const now   = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      const cal   = await gFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime&maxResults=20`);
      const events = cal.items || [];
      const past   = events.filter(e => new Date(e.end?.dateTime || e.end?.date) < now);
      const next   = events.find(e => new Date(e.start?.dateTime || e.start?.date) > now);
      let subTxt = 'No meetings left today';
      let footTxt = 'Free schedule for the rest of the day';
      if (next) {
        const s = new Date(next.start?.dateTime || next.start?.date);
        const hh = String(s.getHours()).padStart(2,'0');
        const mm = String(s.getMinutes()).padStart(2,'0');
        const minsLeft = Math.round((s - now) / 60000);
        subTxt = `Next: ${next.summary} at ${hh}:${mm}`;
        footTxt = minsLeft < 60 ? `Next in ${minsLeft} min` : `Next in ${Math.floor(minsLeft/60)}h ${minsLeft%60}min`;
      }
      const card = document.getElementById('card-meetings');
      card.querySelector('.card-number').textContent = events.length;
      card.querySelector('.card-sub').textContent    = subTxt;
      card.querySelector('.progress-meta span:last-child').textContent = `${past.length} of ${events.length}`;
      card.querySelector('.progress-fill').style.width = events.length > 0 ? Math.round((past.length/events.length)*100)+'%' : '0%';
      card.querySelector('.card-footer').innerHTML = `<span class="card-footer-dot"></span> ${footTxt}`;
    }

    async function fetchTasksData() {
      // Fetch all task lists then gather tasks from each
      const lists = await gFetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20');
      const taskLists = lists.items || [];
      const allFetches = taskLists.map(l =>
        gFetch(`https://tasks.googleapis.com/tasks/v1/lists/${l.id}/tasks?showCompleted=true&showHidden=true&maxResults=100`)
      );
      const results = await Promise.all(allFetches);
      const allTasks = results.flatMap(r => r.items || []);

      const today    = new Date();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const pending   = allTasks.filter(t => t.status !== 'completed' && t.status !== 'needsAction' || t.status === 'needsAction');
      const incomplete = allTasks.filter(t => t.status !== 'completed');
      const completed  = allTasks.filter(t => t.status === 'completed');
      const dueToday   = incomplete.filter(t => { if (!t.due) return false; return new Date(t.due) <= todayEnd; });

      const total = allTasks.length;
      const done  = completed.length;
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
      const badge = dueToday.length > 0 ? 'Urgent' : incomplete.length > 0 ? 'Pending' : 'Completed';
      const subTxt = dueToday.length > 0
        ? `${dueToday.length} due today. Don't let them slip!`
        : incomplete.length === 0 ? 'All done! 🎉' : 'No tasks due today.';

      const card = document.getElementById('card-tasks');
      card.querySelector('.card-number').textContent = incomplete.length;
      card.querySelector('.card-label').textContent  = 'Pending tasks';
      card.querySelector('.card-sub').textContent    = subTxt;
      card.querySelector('.card-badge').textContent  = badge;
      card.querySelector('.progress-meta span:last-child').textContent = `${done} of ${total}`;
      card.querySelector('.progress-fill').style.width = pct + '%';
      card.querySelector('.card-footer').innerHTML = `<span class="card-footer-dot"></span> Updated just now`;

      // Sync info bar summary
      const infoEl = document.getElementById('infobar-tasks');
      if (infoEl) infoEl.textContent = `${incomplete.length} pending, ${done} completed`;
    }
