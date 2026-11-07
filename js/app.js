/* Giao diện: router theo hash + các trang. Mọi dữ liệu lấy qua window.api */
(function () {
  const $app = document.getElementById('app');
  const R = api.ref;
  const P = R.pricing;
  const CID = 'hoalac';

  // ---------- Tiện ích ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const money = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
  function timeAgo(t) {
    const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    if (s < 86400 * 30) return Math.floor(s / 86400) + ' ngày trước';
    return new Date(t).toLocaleDateString('vi-VN');
  }
  function timeLeft(t) {
    const s = Math.floor((t - Date.now()) / 1000);
    if (s <= 0) return 'đã hết hạn';
    if (s < 3600) return Math.ceil(s / 60) + ' phút';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ';
    return Math.ceil(s / 86400) + ' ngày';
  }
  const fmtTime = t => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = t => new Date(t).toLocaleDateString('vi-VN');
  const areaName = a => (R.area(CID, a) || {}).name || '';
  const qs = o => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null && v !== false) p.set(k, v); }); const s = p.toString(); return s ? '?' + s : ''; };
  const go = h => { location.hash = h; };

  function priceLabel(l) {
    if (l.type === 'free') return '<span class="price free">0đ · Cho tặng</span>';
    if (l.type === 'trade') return '<span class="price trade">Trao đổi</span>' + (l.price ? ` <small class="muted">hoặc ${money(l.price)}</small>` : '');
    return `<span class="price">${money(l.price)}</span>`;
  }
  const typeBadge = { sell: '<span class="badge b-sell">Bán</span>', trade: '<span class="badge b-trade">Trao đổi</span>', free: '<span class="badge b-free">Cho tặng</span>' };
  const doneLabel = l => ({ sell: 'Đã bán', free: 'Đã cho tặng', trade: 'Đã trao đổi' }[l.type] || 'Đã bán');
  const statusOverlay = l => ({
    sold: doneLabel(l), expired: 'Đã tự ẩn', hidden: 'Đang bị ẩn', removed: 'Đã bị gỡ',
  }[l.status]);

  function avatar(u, size) {
    if (!u) return '';
    const initials = u.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
    let h = 0; for (const ch of u.id) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `<span class="avatar ${size || ''}" style="background:hsl(${h} 55% 45%)">${esc(initials)}</span>`;
  }
  // Xác thực email chỉ để quản lý tài khoản, không phải cam kết an toàn giao dịch
  function emailBadge(u) {
    if (!u) return '';
    return u.emailVerified
      ? '<span class="vbadge ok" title="Xác thực email giúp quản lý tài khoản, không bảo đảm chất lượng giao dịch">✔ Email đã xác thực</span>'
      : '<span class="vbadge no">Chưa xác thực email</span>';
  }

  function thumb(l, cls) {
    const cat = R.category(l.cat) || R.categories[0];
    if (l.images && l.images.length) return `<div class="thumb ${cls || ''}"><img src="${l.images[0]}" alt="${esc(l.title)}" loading="lazy"></div>`;
    return `<div class="thumb ph ${cls || ''}" style="background:linear-gradient(135deg,${cat.color[0]},${cat.color[1]})"><span>${cat.icon}</span></div>`;
  }

  function card(l) {
    const seller = api.getUser(l.seller);
    const ov = statusOverlay(l);
    return `<a class="card" href="#/item/${l.id}">
      <div class="card-img">
        ${thumb(l)}
        <div class="card-badges">${typeBadge[l.type]}</div>
        ${l.boosted ? '<span class="badge b-boost corner">⚡ Ưu tiên</span>' : ''}
        ${ov ? `<div class="overlay">${ov}</div>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${esc(l.title)}</div>
        <div>${priceLabel(l)}</div>
        <div class="card-meta">📍 ${esc(areaName(l.area))} · ${l.distance != null ? l.distance + ' km' : ''}</div>
        <div class="card-meta">${esc(seller ? seller.name : '')} · ${timeAgo(l.createdAt)}</div>
      </div>
    </a>`;
  }
  const grid = (ls, empty) => ls.length ? `<div class="grid">${ls.map(card).join('')}</div>` : `<div class="empty">${empty || 'Chưa có tin đăng nào.'}</div>`;

  // ---------- Toast & Modal ----------
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  function modal(title, bodyHtml, onMount) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="Đóng">✕</button></div>
      <div class="modal-body">${bodyHtml}</div></div></div>`;
    const close = () => { root.innerHTML = ''; };
    root.querySelector('.modal-bg').addEventListener('click', e => { if (e.target.classList.contains('modal-bg') || e.target.hasAttribute('data-close')) close(); });
    if (onMount) onMount(root.querySelector('.modal'), close);
    return close;
  }

  function guard(fn) {
    return function (...args) {
      try { return fn.apply(this, args); } catch (e) { toast(e.message, 'err'); }
    };
  }

  function requireLogin(msg) {
    if (api.currentUser()) return true;
    toast(msg || 'Bạn cần đăng nhập trước.', 'err');
    go('/login' + qs({ next: location.hash.slice(1) }));
    return false;
  }

  // ---------- Header ----------
  function renderHeader() {
    const me = api.currentUser();
    const admin = api.isAdmin(me);
    const unread = api.totalUnread();
    const notifs = me ? api.notifications() : [];
    const unreadN = notifs.filter(n => !n.read).length;
    document.getElementById('header').innerHTML = `
      <div class="container header-inner">
        <a href="#/" class="logo"><span class="logo-mark">♻</span><span>ReMarket</span></a>
        <a class="cluster-pill" href="#/search" title="ReMarket giai đoạn đầu phục vụ khu vực Hòa Lạc">📍 Hòa Lạc</a>
        <form class="search" id="headerSearch">
          <input name="q" placeholder="Tìm quạt, bàn học, tai nghe, giáo trình..." value="${esc(currentQuery().q || '')}" autocomplete="off">
          <button aria-label="Tìm">🔍</button>
        </form>
        <nav class="header-actions">
          ${admin ? '<a href="#/admin" class="hdr-link">🛡 Kiểm duyệt</a>' : ''}
          <a href="#/pricing" class="hdr-link hide-sm">💎 Bảng giá</a>
          ${me ? `<div class="menu-wrap">
            <button class="icon-btn" id="bellBtn" title="Thông báo">🔔${unreadN ? `<span class="dot">${unreadN}</span>` : ''}</button>
            <div class="menu notif-menu" id="bellMenu">
              <div class="menu-head notif-head">Thông báo ${unreadN ? `<button class="link-btn small" id="readAll">Đánh dấu đã đọc</button>` : ''}</div>
              ${notifs.length ? notifs.slice(0, 6).map(notifRow).join('') : '<div class="small muted pad">Chưa có thông báo.</div>'}
              <a href="#/notifications" class="menu-foot">Xem tất cả thông báo</a>
            </div></div>
            <a href="#/chat" class="icon-btn hide-sm" title="Tin nhắn">💬${unread ? `<span class="dot">${unread}</span>` : ''}</a>` : ''}
          ${admin ? '' : '<a href="#/post" class="btn primary hide-sm">+ Đăng tin</a>'}
          ${me ? `<div class="menu-wrap"><button class="avatar-btn" id="meBtn">${avatar(me)}</button>
            <div class="menu" id="meMenu">
              <div class="menu-head">${esc(me.name)}<div class="small muted">${esc(me.email)}</div></div>
              ${admin ? '<a href="#/admin">Kiểm duyệt báo cáo</a>' : `<a href="#/me">Tin của tôi</a>
              <a href="#/me?tab=payments">Gói đã mua & thanh toán</a>`}
              <a href="#/notifications">Thông báo</a>
              <a href="#/pricing">Bảng giá dịch vụ</a>
              <a href="#/me?tab=account">Tài khoản</a>
              <a href="#/user/${me.id}">Trang cá nhân công khai</a>
              <button id="logoutBtn">Đăng xuất</button>
            </div></div>` : `<a href="#/login" class="btn ghost hide-sm">Đăng nhập</a>`}
        </nav>
      </div>`;

    document.getElementById('bottomNav').innerHTML = `
      <a href="#/" data-nav="/">🏠<span>Trang chủ</span></a>
      <a href="${me ? '#/notifications' : '#/login'}" data-nav="/notifications">🔔<span>Thông báo</span>${unreadN ? `<i class="dot">${unreadN}</i>` : ''}</a>
      <a href="#/post" class="post" data-nav="/post">＋<span>Đăng</span></a>
      <a href="#/chat" data-nav="/chat">💬<span>Tin nhắn</span>${unread ? `<i class="dot">${unread}</i>` : ''}</a>
      <a href="${me ? (admin ? '#/admin' : '#/me') : '#/login'}" data-nav="${admin ? '/admin' : '/me'}">👤<span>${admin ? 'Kiểm duyệt' : 'Tôi'}</span></a>`;
    const p = currentPath();
    document.querySelectorAll('#bottomNav a').forEach(a => { if (a.dataset.nav === '/' ? p === '/' : p.startsWith(a.dataset.nav)) a.classList.add('active'); });

    document.getElementById('headerSearch').onsubmit = e => {
      e.preventDefault();
      go('/search' + qs({ q: e.target.q.value.trim() }));
    };
    const meBtn = document.getElementById('meBtn');
    if (meBtn) {
      meBtn.onclick = e => { e.stopPropagation(); document.getElementById('bellMenu').classList.remove('open'); document.getElementById('meMenu').classList.toggle('open'); };
      document.getElementById('logoutBtn').onclick = () => { api.logout(); toast('Đã đăng xuất'); go('/'); render(); };
    }
    const bellBtn = document.getElementById('bellBtn');
    if (bellBtn) {
      bellBtn.onclick = e => { e.stopPropagation(); document.getElementById('meMenu').classList.remove('open'); document.getElementById('bellMenu').classList.toggle('open'); };
      document.getElementById('bellMenu').onclick = e => e.stopPropagation();
      bindNotifRows(document.getElementById('bellMenu'));
      const ra = document.getElementById('readAll');
      if (ra) ra.onclick = () => { api.markNotificationsRead(); renderHeader(); if (currentPath() === '/notifications') render(); };
    }
  }
  document.addEventListener('click', () => { ['meMenu', 'bellMenu'].forEach(id => { const m = document.getElementById(id); if (m) m.classList.remove('open'); }); });

  const notifIcon = { status: '📌', report: '🚩', pay: '💳', system: '📣' };
  function notifRow(n) {
    return `<a href="${esc(n.link || '#/notifications')}" class="notif ${n.read ? '' : 'unread'}" data-nid="${n.id}">
      <span class="notif-ic k-${n.kind}">${notifIcon[n.kind] || '🔔'}</span>
      <span class="notif-main"><span class="notif-text">${esc(n.text)}</span><span class="small muted">${timeAgo(n.at)}</span></span>
    </a>`;
  }
  function bindNotifRows(root) {
    root.querySelectorAll('[data-nid]').forEach(a => a.addEventListener('click', () => api.markNotificationsRead(a.dataset.nid)));
  }

  // ---------- Trang chủ ----------
  let heroTimer = null;
  let maps = [];

  // Liên hệ người bán: chat trên web; SĐT chỉ hiện khi người bán tự chọn hiển thị
  function sellerContact(u, listingId) {
    const phone = u.phone && u.showPhone ? u.phone : '';
    return `<div class="contact">
      ${listingId ? `<button type="button" class="btn primary" data-chat="${listingId}">💬 Nhắn tin người bán</button>` : ''}
      ${phone ? `<button type="button" class="btn call" data-phone="${esc(phone)}">📞 <span>${esc(phone.slice(0, 4) + ' ' + phone.slice(4, 7))} ***</span><small>Bấm để hiện số</small></button>` : ''}
    </div>`;
  }
  function bindContact(root) {
    root.querySelectorAll('[data-phone]').forEach(b => b.onclick = e => {
      e.preventDefault(); e.stopPropagation();
      if (!requireLogin('Đăng nhập để xem số điện thoại người bán.')) return;
      const ph = b.dataset.phone;
      b.outerHTML = `<a class="btn call shown" href="tel:${esc(ph)}">📞 <span>${esc(ph.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3'))}</span><small>Bấm để gọi</small></a>`;
    });
    root.querySelectorAll('[data-chat]').forEach(b => b.onclick = guard(e => {
      e.preventDefault(); e.stopPropagation();
      if (!requireLogin('Đăng nhập để nhắn tin người bán.')) return;
      go('/chat/' + api.startConversation(b.dataset.chat).id);
    }));
  }

  // Ô tin ưu tiên: 1 ô lớn bằng 4 ô thường (2×2) + 4 tin ưu tiên khác
  function featuredBlock() {
    const me = api.currentUser();
    const fs = api.featuredListings();
    const cta = `<a href="#/pricing" class="feat-cta"><span class="pc-ic">⚡</span><b>Vị trí ưu tiên còn trống</b><span class="small">Tin của bạn hiển thị ở đây chỉ ${money(P.featured.price)}/${P.featured.days} ngày</span><span class="btn small primary">Xem bảng giá</span></a>`;
    const head = `<div class="section-head"><h2>⚡ Tin ưu tiên</h2><a href="#/pricing">Đưa tin lên đây – ${money(P.featured.price)}/${P.featured.days} ngày →</a></div>`;
    if (!fs.length) return `<section class="section">${head}<div class="featured">${cta}</div></section>`;
    const big = fs[0];
    const small = fs.slice(1, 5);
    const s = api.getUser(big.seller);
    const mine = me && me.id === s.id;
    return `<section class="section">${head}
      <div class="featured">
        <div class="feat-big">
          <a href="#/item/${big.id}" class="feat-img">
            ${thumb(big, 'feat')}
            <div class="card-badges">${typeBadge[big.type]}</div>
            <span class="badge b-boost corner">⚡ Ưu tiên</span>
          </a>
          <div class="feat-body">
            <a href="#/item/${big.id}" class="feat-title">${esc(big.title)}</a>
            <div class="feat-price">${priceLabel(big)}</div>
            <div class="small muted">📍 ${esc(areaName(big.area))} · ~${big.distance} km · ${timeAgo(big.createdAt)}</div>
            ${big.desc ? `<p class="feat-desc">${esc(big.desc)}</p>` : ''}
            <div class="feat-seller">
              <a href="#/user/${s.id}" class="fs-user">${avatar(s, 'lg')}<div><b>${esc(s.name)}</b><div class="small muted">${esc(s.school)}</div></div></a>
              ${mine ? '<div class="small muted">Đây là tin của bạn.</div>' : sellerContact(s, big.id)}
            </div>
          </div>
        </div>
        ${small.map(card).join('')}
        ${small.length < 4 ? cta : ''}
      </div>
    </section>`;
  }

  // Banner đối tác: tách khỏi danh mục tin C2C, gắn nhãn Quảng cáo
  function adCard(p) {
    return `<a href="#/pricing" class="ad-card" style="background:linear-gradient(160deg,${p.color[0]},${p.color[1]})">
      <span class="ad-tag">Quảng cáo · Đối tác</span><span class="ad-ic">${p.icon}</span>
      <b>${esc(p.ad)}</b><span class="ad-name">${esc(p.name)}</span><span class="ad-phone">☎ ${esc(p.phone)}</span></a>`;
  }
  const adSlot = side => `<a href="#/pricing?banner=${side}" class="ad-slot"><b>🪧 Banner đối tác</b><span>${money(P.banner.price)}/${P.banner.unit}/vị trí</span><span class="small">160 × 600 px</span></a>`;
  function renderSideAds(show) {
    const ps = R.advertisers;
    document.getElementById('adLeft').innerHTML = show ? (ps[0] ? adCard(ps[0]) : adSlot('left')) : '';
    document.getElementById('adRight').innerHTML = show ? (ps[1] ? adCard(ps[1]) : adSlot('right')) : '';
  }
  function inlineAds() {
    return `<div class="inline-ads">${R.advertisers.slice(0, 2).map(adCard).join('')}${adSlot('left')}</div>`;
  }

  // ---------- Bản đồ (Leaflet + OpenStreetMap) ----------
  function listingLatLng(l) {
    const a = R.area(CID, l.area);
    if (!a || a.lat == null) return null;
    let h = 7; for (const ch of String(l.id)) h = (h * 131 + ch.charCodeAt(0)) % 1000003;
    return [a.lat + ((h % 97) / 97 - 0.5) * 0.004, a.lng + ((Math.floor(h / 97) % 89) / 89 - 0.5) * 0.004];
  }
  const gMapsEmbed = (q, z) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${z || 14}&hl=vi&output=embed`;
  const gMapsLink = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  function mountMap(el, listings, opts) {
    if (!el) return null;
    if (!window.L) { el.innerHTML = '<div class="map-fallback">🗺 Không tải được bản đồ – kiểm tra kết nối Internet.</div>'; return null; }
    opts = opts || {};
    const cl = R.cluster(CID);
    const map = L.map(el, { scrollWheelZoom: false }).setView(opts.center || cl.center, opts.zoom || cl.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    if (!opts.single) cl.areas.forEach(a => L.circle([a.lat, a.lng], { radius: 280, color: '#0f8a5f', weight: 1, fillOpacity: 0.07 }).addTo(map).bindTooltip(a.name));
    (cl.landmarks || []).forEach(m => L.marker([m.lat, m.lng], { icon: L.divIcon({ className: 'pin-lm', html: '🏫', iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map).bindTooltip(m.name));
    listings.forEach(l => {
      const ll = opts.single ? opts.center : listingLatLng(l);
      if (!ll) return;
      const cat = R.category(l.cat) || R.categories[0];
      L.marker(ll, { icon: L.divIcon({ className: 'pin' + (l.boosted ? ' hot' : ''), html: `<span style="background:${cat.color[1]}"><i>${cat.icon}</i></span>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }) })
        .addTo(map)
        .bindPopup(`<a href="#/item/${l.id}" class="map-pop"><b>${esc(l.title)}</b><br>${priceLabel(l)}<br><small>📍 ${esc(areaName(l.area))}</small></a>`);
    });
    if (opts.single) L.circle(opts.center, { radius: 300, color: '#0f8a5f', weight: 1, fillOpacity: 0.1 }).addTo(map);
    maps.push(map);
    return map;
  }

  function viewHome() {
    const me = api.currentUser();
    const cl = R.cluster(CID);
    const st = api.stats();
    const near = api.searchListings({ sort: 'priority' }).slice(0, 6);
    const fresh = api.searchListings({ sort: 'new' }).slice(0, 6);
    const free = api.searchListings({ type: 'free', sort: 'near' }).slice(0, 4);
    const all = api.searchListings({});

    const slides = [
      ['s-green', `<h1>Đồ cũ ở <span class="hl">Hòa Lạc</span>,<br>tìm gần – bán nhanh – tặng dễ.</h1>
        <p class="lead">Mua, bán, trao đổi và cho tặng đồ đã qua sử dụng giữa sinh viên, người đi làm và cư dân Hòa Lạc. Gặp trực tiếp, kiểm tra tận tay rồi mới trả tiền.</p>
        <div class="hero-stats">
          <div><b>${st.active}</b><span>tin đang hiển thị</span></div>
          <div><b>${st.free}</b><span>món cho tặng</span></div>
          <div><b>${st.users}</b><span>người dùng</span></div>
          <div><b>${st.done}</b><span>đã bán / cho tặng</span></div>
        </div>`],
      ['s-orange', `<span class="slide-tag">Đăng tin</span><h2>${P.freePosts} tin đầu mỗi tháng miễn phí</h2>
        <p class="lead">Cần đăng nhiều hơn? Chỉ <b>${money(P.extraPosts.price)} cho ${P.extraPosts.posts} tin</b>. ReMarket không thu hoa hồng trên giá món đồ.</p><a href="#/post" class="btn light">+ Đăng tin ngay</a>`],
      ['s-purple', `<span class="slide-tag">Tin ưu tiên</span><h2>Hiển thị nổi bật chỉ ${money(P.featured.price)}/${P.featured.days} ngày</h2>
        <p class="lead">Lên ô lớn trang chủ và đầu kết quả tìm kiếm. Đẩy tin lên đầu mục Mới đăng chỉ ${money(P.bump.price)}/lượt.</p><a href="#/pricing" class="btn light">Xem bảng giá</a>`],
    ];
    const byArea = {};
    all.forEach(l => { byArea[l.area] = (byArea[l.area] || 0) + 1; });
    const q = me ? api.quota() : null;

    return `
    <div class="container">
      <section class="hero2">
        <div class="carousel" id="heroCarousel">
          <div class="slides">${slides.map(([c, h], i) => `<div class="slide ${c} ${i ? '' : 'active'}">${h}</div>`).join('')}</div>
          <button class="car-nav prev" data-dir="-1" aria-label="Trước">‹</button><button class="car-nav next" data-dir="1" aria-label="Sau">›</button>
          <div class="car-dots">${slides.map((s, i) => `<button data-i="${i}" class="${i ? '' : 'on'}" aria-label="Banner ${i + 1}"></button>`).join('')}</div>
        </div>
        <div class="hero-card">
          ${me ? `<div class="hc-user">${avatar(me, 'lg')}<div><b>Chào ${esc(me.name.split(' ').pop())}!</b>
            <div class="small">${esc(me.school)} · ${esc(areaName(me.area))}</div>${emailBadge(me)}</div></div>
            ${!me.emailVerified ? '<a href="#/verify" class="notice warn">Xác thực email để bắt đầu đăng tin →</a>' : ''}
            ${api.isAdmin(me) ? `<a href="#/admin" class="btn primary block">🛡 Vào trang kiểm duyệt</a>` : `
            <div class="small muted">📝 Còn <b>${q.freeLeft}/${P.freePosts}</b> tin miễn phí tháng này${q.credits ? ` · ${q.credits} lượt đã mua` : ''}</div>
            <a href="#/post" class="btn primary block">+ Đăng tin mới</a>
            <a href="#/me" class="btn ghost block">Quản lý tin của tôi</a>`}`
          : `<h3>Bắt đầu trong 1 phút</h3>
            <ol class="steps-mini"><li>Đăng ký bằng email, không bắt buộc email trường</li><li>Xác thực email</li><li>Đăng ${P.freePosts} tin miễn phí mỗi tháng</li></ol>
            <a href="#/register" class="btn primary block">Tạo tài khoản</a>
            <a href="#/login" class="btn ghost block">Đăng nhập</a>`}
        </div>
      </section>

      <section class="cats">
        ${R.categories.map(c => `<a href="#/search${qs({ cat: c.id })}" class="cat"><span class="cat-ic" style="background:${c.color[0]}">${c.icon}</span><span>${c.name}</span></a>`).join('')}
        <a href="#/search${qs({ type: 'free' })}" class="cat"><span class="cat-ic" style="background:#d1fae5">🎁</span><span>Cho tặng</span></a>
        <a href="#/search${qs({ type: 'trade' })}" class="cat"><span class="cat-ic" style="background:#fef3c7">🔁</span><span>Trao đổi</span></a>
      </section>

      ${featuredBlock()}

      ${inlineAds()}

      <div class="duo">
        <section class="section">
          <div class="section-head"><h2>📍 Gợi ý gần bạn</h2><a href="#/search${qs({ sort: 'priority' })}">Xem tất cả →</a></div>
          <p class="muted small sub">Ưu tiên tin ưu tiên, cùng khu trọ, cùng trường và khoảng cách gần.</p>
          ${grid(near)}
        </section>
        <section class="section">
          <div class="section-head"><h2>🆕 Mới đăng</h2><a href="#/search${qs({ sort: 'new' })}">Xem tất cả →</a></div>
          <p class="muted small sub">Tin vừa đăng hoặc vừa được đẩy lên.</p>
          ${grid(fresh)}
        </section>
      </div>

      <section class="section">
        <div class="section-head"><h2>🗺 Bản đồ đồ cũ khu Hòa Lạc</h2><span class="small muted">${esc(cl.address)}</span></div>
        <div class="map-wrap">
          <div class="map-main">
            <div class="seg map-tabs">
              <label><input type="radio" name="mapTab" value="list" checked><span>📍 Tin đăng trên bản đồ</span></label>
              <label><input type="radio" name="mapTab" value="google"><span>🌏 Google Maps</span></label>
            </div>
            <div id="homeMap" class="map"></div>
            <iframe id="gMap" class="map gmap" hidden title="Google Maps khu Hòa Lạc" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
          </div>
          <aside class="map-side">
            <b>Khu trọ / KTX</b>
            ${cl.areas.map(a => `<button class="area-row" data-area="${a.id}"><span>📍 ${esc(a.name)}</span><span class="count">${byArea[a.id] || 0} tin</span></button>`).join('')}
            <a id="gMapLink" class="btn ghost block small" href="${gMapsLink(cl.address)}" target="_blank" rel="noopener">Mở trong Google Maps ↗</a>
            <p class="small muted">Vị trí trên bản đồ là gần đúng theo khu vực, không phải địa chỉ chính xác của người bán.</p>
          </aside>
        </div>
      </section>

      ${free.length ? `<section class="section">
        <div class="section-head"><h2>🎁 Cho tặng 0đ</h2><a href="#/search${qs({ type: 'free' })}">Xem tất cả →</a></div>
        ${grid(free)}
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h2>💎 Dịch vụ trả phí</h2><a href="#/pricing">Xem bảng giá chi tiết →</a></div>
        ${pricingCards()}
      </section>

      <section class="section how">
        <h2>ReMarket hoạt động thế nào?</h2>
        <div class="how-grid">
          ${[
            ['📝', 'Đăng ký bằng email', 'Sinh viên, người đi làm hay cư dân đều dùng được, chỉ cần xác thực email.'],
            ['📸', 'Đăng tin chuẩn', `Ảnh thật, giá, tình trạng, lỗi nếu có, khu vực. Tin hiển thị ngay, kiểm duyệt sau.`],
            ['🔎', 'Tìm đồ gần', 'Lọc theo khu trọ, danh mục, giá, tình trạng; xem trên bản đồ.'],
            ['💬', 'Nhắn tin, hẹn gặp', 'Hai bên tự thỏa thuận chỗ gặp, cách kiểm tra và thanh toán.'],
            ['🤝', 'Kiểm tra rồi trả tiền', 'ReMarket không giữ tiền, không giao hàng. Không chuyển cọc cho người lạ.'],
            ['✔', 'Cập nhật đã bán', `Chỉ người bán đổi trạng thái. Tin không cập nhật sau ${R.listingDays} ngày sẽ tự ẩn.`],
          ].map(([i, t, d], n) => `<div class="how-step"><span class="how-n">${n + 1}</span><div class="how-ic">${i}</div><b>${t}</b><p>${d}</p></div>`).join('')}
        </div>
      </section>
    </div>`;
  }
  function mountHome() {
    // Banner xoay
    const car = document.getElementById('heroCarousel');
    const slides = car.querySelectorAll('.slide');
    const dots = car.querySelectorAll('.car-dots button');
    let cur = 0;
    const show = i => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('active', k === cur));
      dots.forEach((d, k) => d.classList.toggle('on', k === cur));
    };
    const start = () => { clearInterval(heroTimer); heroTimer = setInterval(() => show(cur + 1), 5000); };
    dots.forEach(d => d.onclick = () => { show(Number(d.dataset.i)); start(); });
    car.querySelectorAll('.car-nav').forEach(b => b.onclick = () => { show(cur + Number(b.dataset.dir)); start(); });
    car.onmouseenter = () => clearInterval(heroTimer);
    car.onmouseleave = start;
    start();

    bindContact($app);
    bindBuy($app);

    const cl = R.cluster(CID);
    const map = mountMap(document.getElementById('homeMap'), api.searchListings({}));
    // Google Maps nhúng (iframe, không cần API key) — chỉ tải khi mở tab
    const gMap = document.getElementById('gMap');
    const gLink = document.getElementById('gMapLink');
    let gQuery = { q: cl.address, z: 14 };
    const setG = (q, z) => {
      gQuery = { q, z };
      gLink.href = gMapsLink(q);
      if (!gMap.hidden) gMap.src = gMapsEmbed(q, z);
    };
    document.querySelectorAll('input[name=mapTab]').forEach(r => r.onchange = () => {
      const google = r.value === 'google' && r.checked;
      gMap.hidden = !google;
      document.getElementById('homeMap').hidden = google;
      if (google) gMap.src = gMapsEmbed(gQuery.q, gQuery.z);
      else if (map) map.invalidateSize();
    });
    document.querySelectorAll('.area-row').forEach(b => b.onclick = () => {
      document.querySelectorAll('.area-row').forEach(x => x.classList.toggle('sel', x === b));
      const a = R.area(CID, b.dataset.area);
      setG(`${a.lat},${a.lng}`, 16);
      if (map) map.flyTo([a.lat, a.lng], 16);
      else if (gMap.hidden) go('/search' + qs({ area: a.id }));
    });
  }

  // ---------- Bảng giá & thanh toán ----------
  function pricingCards() {
    const items = [
      ['📝', 'Mua thêm tin', money(P.extraPosts.price), `/ gói ${P.extraPosts.posts} tin`, `${P.freePosts} tin đầu mỗi tháng miễn phí. Hết lượt thì mua thêm theo gói.`, 'posts', 'Mua gói'],
      ['🔝', 'Đẩy tin', money(P.bump.price), '/ lượt', 'Làm mới tin, đưa bài lên đầu mục “Mới đăng”.', 'bump', 'Chọn tin để đẩy'],
      ['⚡', 'Tin ưu tiên', money(P.featured.price), `/ ${P.featured.days} ngày`, 'Hiển thị nổi bật có thời hạn: ô lớn trang chủ và đầu kết quả tìm kiếm.', 'featured', 'Chọn tin'],
      ['🪧', 'Banner đối tác', money(P.banner.price), `/ ${P.banner.unit} / vị trí`, 'Dành cho cửa hàng, doanh nghiệp địa phương. Quảng cáo nằm riêng, không lẫn vào tin đồ cũ.', 'banner', 'Đặt banner'],
    ];
    return `<div class="price-grid">${items.map(([ic, t, pr, unit, d, k, btn]) => `<div class="price-card ${k === 'featured' ? 'best' : ''}">
      <div class="pc-ic">${ic}</div><b>${t}</b>
      <div><span class="price">${pr}</span> <span class="muted small">${unit}</span></div>
      <p class="small muted">${d}</p>
      <button class="btn ${k === 'featured' ? 'primary' : 'ghost'} block small" data-buy="${k}">${btn}</button></div>`).join('')}</div>`;
  }

  // Thu tiền dịch vụ bằng chuyển khoản; chỉ kích hoạt khi khoản thu được xác nhận (demo: xác nhận ngay)
  function openCheckout(desc, amount, onPaid) {
    const code = 'RM' + Date.now().toString().slice(-6);
    modal('💳 Thanh toán chuyển khoản', `
      <div class="checkout-sum"><span>${esc(desc)}</span><b class="price">${money(amount)}</b></div>
      <div class="panel">
        <div class="small muted">Chuyển khoản tới</div>
        <b>Tài khoản ReMarket · [Ngân hàng] · [Số tài khoản]</b>
        <div class="small">Nội dung chuyển khoản: <b>${code}</b></div>
      </div>
      <p class="small muted">Lượt đăng hoặc hiển thị chỉ được kích hoạt sau khi nhóm xác nhận khoản thu.</p>
      <button class="btn primary block" id="payBtn">Tôi đã chuyển khoản ${money(amount)}</button>
      <p class="small muted">* Bản demo: khoản thu được xác nhận ngay, không trừ tiền thật.</p>`, (m, close) => {
      const btn = m.querySelector('#payBtn');
      btn.onclick = () => {
        btn.disabled = true; btn.textContent = 'Đang xác nhận khoản thu...';
        setTimeout(() => {
          close();
          try { onPaid(); } catch (e) { toast(e.message, 'err'); }
        }, 900);
      };
    });
  }
  function openBuyPosts(after) {
    openCheckout(`Gói thêm ${P.extraPosts.posts} tin đăng`, P.extraPosts.price, () => {
      api.pay('posts');
      toast(`Đã thêm ${P.extraPosts.posts} lượt đăng tin`, 'ok');
      if (after) after();
    });
  }
  function serviceName(kind) { return kind === 'bump' ? 'Đẩy tin 1 lượt' : `Tin ưu tiên ${P.featured.days} ngày`; }
  function openServices(l) {
    modal('💎 Dịch vụ cho tin đăng', `
      <p class="muted">“<b>${esc(l.title)}</b>”</p>
      <div class="plans">
        <button class="plan" data-kind="bump"><b>🔝 Đẩy tin</b><span class="price">${money(P.bump.price)}</span><span class="small muted">/ lượt</span><span class="small">Làm mới tin, đưa lên đầu mục “Mới đăng”</span></button>
        <button class="plan best" data-kind="featured"><b>⚡ Tin ưu tiên</b><span class="price">${money(P.featured.price)}</span><span class="small muted">/ ${P.featured.days} ngày</span><span class="small">Ô lớn trang chủ, ưu tiên đầu kết quả tìm kiếm</span></button>
      </div>
      ${l.boosted ? `<p class="small">Tin đang ưu tiên thêm ${timeLeft(l.boostUntil)} — mua thêm sẽ cộng dồn.</p>` : ''}
      <p class="small muted">Dịch vụ trả phí chỉ tăng mức hiển thị, không thay đổi trách nhiệm mô tả trung thực sản phẩm.</p>`, (m, close) => {
      m.querySelectorAll('.plan').forEach(b => b.onclick = () => { close(); buyService(b.dataset.kind, l); });
    });
  }
  function buyService(kind, l) {
    openCheckout(`${serviceName(kind)} – ${l.title}`, P[kind].price, () => {
      api.pay(kind, { listingId: l.id });
      toast(kind === 'bump' ? 'Đã đẩy tin lên đầu 🔝' : 'Tin đã lên mục ưu tiên ⚡', 'ok');
      render();
    });
  }
  function pickListing(kind) {
    const me = api.currentUser();
    const ls = api.searchListings({ seller: me.id, sort: 'new' });
    if (!ls.length) { toast('Bạn chưa có tin nào đang hiển thị.', 'err'); go('/post'); return; }
    modal(kind === 'bump' ? '🔝 Chọn tin để đẩy' : '⚡ Chọn tin ưu tiên', `
      <div class="radio-list">${ls.map((l, i) => `<label class="radio-row"><input type="radio" name="lid" value="${l.id}" ${i ? '' : 'checked'}> <span class="grow ellipsis">${esc(l.title)}</span>${l.boosted ? '<span class="badge b-boost">⚡</span>' : ''}</label>`).join('')}</div>
      <button class="btn primary block" id="pickBtn">Tiếp tục</button>`, (m, close) => {
      m.querySelector('#pickBtn').onclick = () => {
        const id = m.querySelector('input[name=lid]:checked').value;
        close();
        buyService(kind, api.getListing(id));
      };
    });
  }
  function openBannerForm(side) {
    modal('🪧 Đặt banner đối tác', `
      <p class="small muted">Banner hiển thị ở hai bên trang chủ, tìm kiếm và chi tiết tin, gắn nhãn “Quảng cáo”. Hàng hóa của đối tác không được đưa vào danh mục đồ cũ cá nhân.</p>
      <form id="adForm" class="form">
        <label>Tên cửa hàng / doanh nghiệp<input name="shop" required placeholder="VD: Quán in Tân Photo"></label>
        <label>Số điện thoại liên hệ<input name="phone" required pattern="0[0-9 ]{9,12}" placeholder="09xxxxxxxx"></label>
        <div class="row2">
          <label>Vị trí<select name="side"><option value="left" ${side === 'right' ? '' : 'selected'}>Bên trái</option><option value="right" ${side === 'right' ? 'selected' : ''}>Bên phải</option></select></label>
          <label>Thời hạn<select name="months"><option value="1">1 tháng</option><option value="2">2 tháng</option><option value="3">3 tháng</option></select></label>
        </div>
        <div class="checkout-sum"><span>Tổng</span><b class="price" id="adTotal">${money(P.banner.price)}</b></div>
        <button class="btn primary block">Tiếp tục thanh toán</button>
      </form>`, (m, close) => {
      const f = m.querySelector('#adForm');
      f.months.onchange = () => { m.querySelector('#adTotal').textContent = money(P.banner.price * Number(f.months.value)); };
      f.onsubmit = e => {
        e.preventDefault();
        const opts = { shop: f.shop.value.trim(), phone: f.phone.value.trim(), side: f.side.value, months: Number(f.months.value) };
        close();
        openCheckout(`Banner ${opts.side === 'right' ? 'bên phải' : 'bên trái'} ${opts.months} tháng`, P.banner.price * opts.months, () => {
          api.pay('banner', opts);
          toast('Đã nhận đăng ký banner! Nội dung sẽ được duyệt trước khi hiển thị.', 'ok');
          renderHeader();
        });
      };
    });
  }
  function bindBuy(root) {
    root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      if (!requireLogin('Đăng nhập để mua dịch vụ.')) return;
      const k = b.dataset.buy;
      if (k === 'posts') openBuyPosts(render);
      else if (k === 'bump' || k === 'featured') pickListing(k);
      else openBannerForm();
    });
  }

  function viewPricing() {
    const me = api.currentUser();
    const q = me ? api.quota() : null;
    return `<div class="container page">
      <div class="pricing-hero">
        <h1>💎 Bảng giá dịch vụ</h1>
        <p class="muted">Người mua xem, tìm và liên hệ hoàn toàn miễn phí. Người bán có ${P.freePosts} tin miễn phí mỗi tháng; dịch vụ trả phí chỉ khi bạn cần đăng thêm hoặc tăng hiển thị.</p>
        ${q && !api.isAdmin(me) ? `<div class="notice">📝 Tháng này bạn còn <b>${q.freeLeft}/${P.freePosts}</b> tin miễn phí · <b>${q.credits}</b> lượt đã mua · <a href="#/me?tab=payments">Lịch sử thanh toán</a></div>` : ''}
      </div>
      ${pricingCards()}
      <section class="section panel">
        <h3>Toàn bộ bảng giá</h3>
        <table class="pay-table">
          <tr><th>Dịch vụ</th><th>Đơn giá / chính sách</th><th>Ghi chú</th></tr>
          <tr><td>Đăng cơ bản</td><td>${P.freePosts} tin miễn phí / tài khoản / tháng</td><td>Sửa tin và gia hạn tin không tốn lượt</td></tr>
          <tr><td>Mua thêm tin</td><td>${money(P.extraPosts.price)} / gói ${P.extraPosts.posts} tin</td><td>Lượt đã mua không hết hạn</td></tr>
          <tr><td>Đẩy tin</td><td>${money(P.bump.price)} / lượt</td><td>Lên đầu mục “Mới đăng”</td></tr>
          <tr><td>Tin ưu tiên</td><td>${money(P.featured.price)} / ${P.featured.days} ngày</td><td>Hiển thị nổi bật có thời hạn</td></tr>
          <tr><td>Banner đối tác</td><td>${money(P.banner.price)} / ${P.banner.unit} / vị trí</td><td>Bán quảng cáo, không bán gói cửa hàng trên sàn</td></tr>
          <tr><td><b>Hoa hồng giao dịch</b></td><td><b>0đ</b></td><td>Không thu theo giá trị món đồ</td></tr>
        </table>
      </section>
      <section class="section two-col">
        <div class="panel"><h3>🪧 Dành cho cửa hàng & doanh nghiệp</h3>
          <p class="muted small">Quán in, sửa đồ, chuyển trọ, vệ sinh phòng quanh Hòa Lạc có thể đặt banner hai bên trang (${money(P.banner.price)}/${P.banner.unit}/vị trí). Banner được tách khỏi danh mục tin đăng C2C để người dùng không nhầm với tin bán đồ cũ.</p>
          <div class="btn-row"><button class="btn primary" data-buy="banner">Đặt banner</button></div>
        </div>
        <div class="panel"><h3>❓ Câu hỏi thường gặp</h3>
          <p class="small"><b>Tin miễn phí tính thế nào?</b> Mỗi tài khoản được ${P.freePosts} tin mới mỗi tháng dương lịch. Sửa tin và gia hạn tin không tốn lượt.</p>
          <p class="small"><b>Tin có hết hạn không?</b> Tin không được cập nhật sau ${R.listingDays} ngày sẽ tự ẩn. Bạn gia hạn miễn phí nếu món đồ vẫn còn.</p>
          <p class="small"><b>Thanh toán thế nào?</b> Chuyển khoản theo nội dung hướng dẫn; dịch vụ kích hoạt khi khoản thu được xác nhận.</p>
        </div>
      </section>
    </div>`;
  }
  function mountPricing(q) {
    bindBuy($app);
    if (q.banner && requireLogin('Đăng nhập để đặt banner.')) openBannerForm(q.banner);
  }

  // ---------- Thông báo ----------
  function viewNotifications(q) {
    if (!api.currentUser()) return loginWall('Đăng nhập để xem thông báo.');
    const f = q.f || '';
    const all = api.notifications();
    const ns = f ? all.filter(n => n.kind === f) : all;
    const filters = [['', 'Tất cả'], ['status', '📌 Tin đăng'], ['report', '🚩 Kiểm duyệt'], ['pay', '💳 Thanh toán'], ['system', '📣 Hệ thống']];
    return `<div class="container page narrow">
      <div class="results-head"><h1>🔔 Thông báo</h1>${all.some(n => !n.read) ? '<button class="btn ghost small" id="readAll2">Đánh dấu tất cả đã đọc</button>' : ''}</div>
      <div class="chips nf">${filters.map(([k, t]) => `<a href="#/notifications${qs({ f: k })}" class="chip ${f === k ? 'on' : ''}">${t}</a>`).join('')}</div>
      <div class="panel notif-list">${ns.length ? ns.map(notifRow).join('') : '<div class="empty">Không có thông báo nào.</div>'}</div>
    </div>`;
  }
  function mountNotifications() {
    bindNotifRows($app);
    const b = document.getElementById('readAll2');
    if (b) b.onclick = () => { api.markNotificationsRead(); render(); };
  }

  // ---------- Tìm kiếm ----------
  function viewSearch(q) {
    const cl = R.cluster(CID);
    const rs = api.searchListings(q);
    const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(cur || '') === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
    const activeCount = ['cat', 'type', 'min', 'max', 'school', 'area', 'dist', 'cond'].filter(k => q[k]).length;

    return `<div class="container page">
      <div class="search-layout">
        <aside class="filters ${q._open ? 'open' : ''}" id="filters">
          <form id="filterForm">
            <div class="filters-head"><b>Bộ lọc</b><a href="#/search${qs({ q: q.q })}" class="small">Xóa lọc</a></div>
            <label>Từ khóa<input name="q" value="${esc(q.q || '')}" placeholder="VD: quạt"></label>
            <label>Hình thức
              <div class="seg">
                ${[['', 'Tất cả'], ['sell', 'Bán'], ['trade', 'Đổi'], ['free', 'Tặng']].map(([v, t]) => `<label><input type="radio" name="type" value="${v}" ${(q.type || '') === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}
              </div>
            </label>
            <label>Danh mục<select name="cat">${opt('', 'Tất cả danh mục', q.cat)}${R.categories.map(c => opt(c.id, c.icon + ' ' + c.name, q.cat)).join('')}</select></label>
            <label>Khoảng giá (đ)
              <div class="row2"><input name="min" type="number" min="0" step="10000" placeholder="Từ" value="${esc(q.min || '')}"><input name="max" type="number" min="0" step="10000" placeholder="Đến" value="${esc(q.max || '')}"></div>
              <div class="chips">${[[0, 100000, '< 100k'], [100000, 300000, '100–300k'], [300000, 1000000, '300k–1tr'], [1000000, '', '> 1tr']].map(([a, b, t]) => `<button type="button" class="chip" data-min="${a}" data-max="${b}">${t}</button>`).join('')}</div>
            </label>
            <label>Khu trọ / KTX<select name="area">${opt('', 'Tất cả khu vực', q.area)}${cl.areas.map(a => opt(a.id, a.name, q.area)).join('')}</select></label>
            <label>Trường / nhóm người dùng<select name="school">${opt('', 'Tất cả', q.school)}${cl.schools.map(s => opt(s, s, q.school)).join('')}</select></label>
            <label>Khoảng cách tối đa<select name="dist">${opt('', 'Không giới hạn', q.dist)}${[1, 2, 3, 5].map(d => opt(d, 'Trong ' + d + ' km', q.dist)).join('')}</select></label>
            <label>Tình trạng<select name="cond">${opt('', 'Mọi tình trạng', q.cond)}${R.conditions.map(c => opt(c, c, q.cond)).join('')}</select></label>
            <input type="hidden" name="sort" value="${esc(q.sort || '')}">
            <button class="btn primary block">Áp dụng</button>
          </form>
        </aside>
        <section>
          <div class="results-head">
            <div><h2>${q.q ? `Kết quả cho “${esc(q.q)}”` : 'Tất cả tin đăng'}</h2><div class="muted small">${rs.length} tin đang hiển thị tại Hòa Lạc · tin đã bán hoặc đã tự ẩn không hiện ở đây</div></div>
            <div class="results-tools">
              <button class="btn ghost show-sm" id="toggleFilters">⚙ Lọc${activeCount ? ` (${activeCount})` : ''}</button>
              <select id="sortSel">
                ${opt('priority', 'Phù hợp nhất', q.sort || 'priority')}${opt('near', 'Gần nhất', q.sort)}${opt('new', 'Mới nhất', q.sort)}${opt('priceAsc', 'Giá thấp → cao', q.sort)}${opt('priceDesc', 'Giá cao → thấp', q.sort)}
              </select>
            </div>
          </div>
          ${grid(rs, 'Không tìm thấy tin phù hợp. Thử bỏ bớt bộ lọc.')}
        </section>
      </div>
    </div>`;
  }
  function mountSearch(q) {
    const f = document.getElementById('filterForm');
    const submit = () => {
      const d = Object.fromEntries(new FormData(f).entries());
      go('/search' + qs(d));
    };
    f.onsubmit = e => { e.preventDefault(); submit(); };
    f.querySelectorAll('input[type=radio], select').forEach(el => el.onchange = submit);
    f.querySelectorAll('.chip').forEach(c => c.onclick = () => { f.min.value = c.dataset.min; f.max.value = c.dataset.max; submit(); });
    document.getElementById('sortSel').onchange = e => go('/search' + qs(Object.assign({}, q, { sort: e.target.value })));
    document.getElementById('toggleFilters').onclick = () => document.getElementById('filters').classList.toggle('open');
  }

  // ---------- Chi tiết tin ----------
  function viewItem(id) {
    const l = api.getListing(id, true);
    if (!l) return notFound('Tin đăng không tồn tại hoặc đã bị xóa.');
    const me = api.currentUser();
    const admin = api.isAdmin(me);
    const seller = api.getUser(l.seller);
    const cat = R.category(l.cat);
    const mine = me && me.id === l.seller;
    if ((l.status === 'removed' || l.status === 'hidden') && !mine && !admin) return notFound('Tin này đã bị ẩn hoặc gỡ do vi phạm quy định cộng đồng.');
    const similar = api.searchListings({ cat: l.cat, exclude: l.id }).slice(0, 4);
    const imgs = l.images && l.images.length ? l.images : [null];
    const sellerListings = api.searchListings({ seller: seller.id }).length;

    let statusNote = '';
    if (l.status === 'sold') statusNote = `<div class="notice">✔ ${doneLabel(l)} ${l.soldAt ? timeAgo(l.soldAt) : ''}.</div>`;
    if (l.status === 'expired') statusNote = `<div class="notice warn">Tin đã tự ẩn vì ${R.listingDays} ngày chưa cập nhật.${mine ? ' Gia hạn miễn phí nếu món đồ vẫn còn.' : ''}</div>`;
    if (l.status === 'hidden') statusNote = `<div class="notice warn">🚩 Tin đang bị ẩn: ${esc(l.modNote)}${mine ? ' Sửa tin để hiển thị lại.' : ''}</div>`;
    if (l.status === 'removed') statusNote = `<div class="notice warn">🚩 Tin đã bị gỡ: ${esc(l.modNote)}</div>`;

    let actions = '';
    if (mine) {
      if (l.status === 'available') actions = `<a href="#/post?edit=${l.id}" class="btn ghost">✏ Sửa tin</a>
        <button class="btn primary" data-act="sold">✔ ${doneLabel(l)}</button>
        <button class="btn boost" data-act="boost">⚡ Đẩy tin / Tin ưu tiên</button>
        <button class="btn ghost" data-act="renew">↻ Gia hạn ${R.listingDays} ngày</button>`;
      else if (l.status === 'expired') actions = `<button class="btn primary" data-act="renew">↻ Gia hạn miễn phí</button><button class="btn ghost" data-act="sold">✔ ${doneLabel(l)}</button>`;
      else if (l.status === 'hidden') actions = `<a href="#/post?edit=${l.id}" class="btn primary">✏ Sửa tin để hiển thị lại</a>`;
      else if (l.status === 'sold') actions = `<button class="btn ghost" data-act="reopen">↺ Mở bán lại</button>`;
    } else if (l.status === 'available' && !admin) {
      actions = `<button class="btn primary" data-act="chat">💬 Nhắn tin người bán</button>`;
    }

    return `<div class="container page">
      <nav class="crumbs"><a href="#/">Trang chủ</a> › <a href="#/search${qs({ cat: l.cat })}">${cat.name}</a> › <span>${esc(l.title)}</span></nav>
      <div class="item-layout">
          <div class="gallery">
            <div class="gallery-main" id="galMain">${imgs[0] ? `<img src="${imgs[0]}" alt="">` : thumb(l, 'big')}</div>
            ${imgs.length > 1 ? `<div class="gallery-thumbs">${imgs.map((s, i) => `<button data-i="${i}" class="${i === 0 ? 'sel' : ''}"><img src="${s}" alt=""></button>`).join('')}</div>` : ''}
          </div>

          <div class="item-details">
          <div class="panel">
            <h3>Mô tả</h3>
            <p class="desc">${esc(l.desc || 'Người bán chưa viết mô tả.').replace(/\n/g, '<br>')}</p>
            <div class="specs">
              <div><span>Danh mục</span><b>${cat.icon} ${cat.name}</b></div>
              <div><span>Tình trạng</span><b>${esc(l.condition)}</b></div>
              <div><span>Đã sử dụng</span><b>${esc(l.usedTime || '—')}</b></div>
              <div><span>Trường / nhóm</span><b>${esc(l.school || '—')}</b></div>
              <div><span>Khu vực</span><b>${esc(areaName(l.area))}</b></div>
              <div><span>Khoảng cách</span><b>~${l.distance} km</b></div>
            </div>
            ${l.type === 'trade' ? `<div class="notice trade">🔁 <b>Muốn đổi lấy:</b> ${esc(l.tradeFor)}</div>` : ''}
          </div>

          <div class="panel">
            <h3>🗺 Khu vực giao dịch</h3>
            <p class="small muted">📍 ${esc(areaName(l.area))}, ${esc(R.cluster(CID).address)} · Vị trí gần đúng – hãy hẹn gặp ở nơi công cộng. <a href="${gMapsLink((R.area(CID, l.area) || {}).lat + ',' + (R.area(CID, l.area) || {}).lng)}" target="_blank" rel="noopener">Xem trên Google Maps ↗</a></p>
            <div id="itemMap" class="map sm"></div>
          </div>
          </div>

        <aside class="item-side">
          <div class="panel">
            <div class="item-badges">${typeBadge[l.type]}${l.boosted ? '<span class="badge b-boost">⚡ Ưu tiên</span>' : ''}</div>
            <h1 class="item-title">${esc(l.title)}</h1>
            <div class="item-price">${priceLabel(l)}</div>
            <div class="muted small">📍 ${esc(areaName(l.area))} · ~${l.distance} km · Đăng ${timeAgo(l.createdAt)} · 👁 ${l.views}</div>
            ${mine && l.status === 'available' ? `<div class="small muted">Tự ẩn sau ${timeLeft(l.expiresAt)} nếu không cập nhật.</div>` : ''}
            ${statusNote}
            <div class="item-actions">${actions}</div>
            ${!mine && !admin && l.status === 'available' ? `<button class="link-btn small" data-act="report">🚩 Báo cáo tin đăng</button>` : ''}
          </div>

          <div class="panel">
            <a class="seller" href="#/user/${seller.id}">
              ${avatar(seller, 'lg')}
              <div>
                <b>${esc(seller.name)}</b>
                <div>${emailBadge(seller)}</div>
                <div class="small muted">${esc(seller.school)} · ${sellerListings} tin đang hiển thị · Tham gia ${fmtDate(seller.joinedAt)}</div>
              </div>
            </a>
            ${mine || admin || l.status !== 'available' ? '' : sellerContact(seller)}
          </div>

          <div class="panel safety">
            <b>🛡 Giao dịch an toàn</b>
            <ul>
              <li>Hẹn gặp ở nơi công cộng: cổng trường, thư viện, căng tin.</li>
              <li>Kiểm tra kỹ hàng rồi mới trả tiền.</li>
              <li>Không chuyển khoản đặt cọc cho người lạ.</li>
              <li>ReMarket không giữ tiền và không bảo đảm chất lượng hàng; xác thực email không thay thế việc kiểm tra hàng.</li>
            </ul>
          </div>
        </aside>
      </div>

      ${similar.length ? `<section class="section"><div class="section-head"><h2>Tin tương tự gần bạn</h2></div>${grid(similar)}</section>` : ''}
    </div>`;
  }
  function mountItem(id) {
    const l = api.getListing(id);
    if (!l) return;
    const main = document.getElementById('galMain');
    document.querySelectorAll('.gallery-thumbs button').forEach(b => b.onclick = () => {
      main.innerHTML = `<img src="${l.images[b.dataset.i]}" alt="">`;
      document.querySelectorAll('.gallery-thumbs button').forEach(x => x.classList.toggle('sel', x === b));
    });
    const act = {
      chat: guard(() => { if (!requireLogin('Đăng nhập để nhắn tin người bán.')) return; const c = api.startConversation(id); go('/chat/' + c.id); }),
      sold: () => openMarkSold(l),
      reopen: guard(() => { api.reopen(id); toast('Tin đã hiển thị lại', 'ok'); render(); }),
      renew: guard(() => { api.renew(id); toast(`Đã gia hạn miễn phí ${R.listingDays} ngày`, 'ok'); render(); }),
      boost: () => openServices(l),
      report: () => { if (requireLogin('Đăng nhập để gửi báo cáo.')) openReport(l); },
    };
    document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act[b.dataset.act]());
    bindContact($app);
    const ll = listingLatLng(l);
    if (ll) mountMap(document.getElementById('itemMap'), [l], { center: ll, zoom: 15, single: true });
  }

  function openMarkSold(l) {
    modal(`✔ ${doneLabel(l)}?`, `
      <p class="muted">“<b>${esc(l.title)}</b>” sẽ được đánh dấu <b>${doneLabel(l).toLowerCase()}</b> để người tìm kiếm không liên hệ nhầm. Chỉ bạn mới thay đổi được trạng thái này.</p>
      <button class="btn primary block" id="soldBtn">Xác nhận ${doneLabel(l).toLowerCase()}</button>`, (m, close) => {
      m.querySelector('#soldBtn').onclick = guard(() => {
        api.markSold(l.id);
        close();
        toast(`Đã cập nhật: ${doneLabel(l).toLowerCase()} 🎉`, 'ok');
        render();
      });
    });
  }

  function openReport(l) {
    const reasons = ['Đòi đặt cọc / chuyển khoản trước', 'Ảnh không thật, sai thông tin', 'Hàng cấm, hàng không được phép đăng', 'Tin rác, spam thương mại', 'Đã bán nhưng chưa cập nhật', 'Khác'];
    modal('🚩 Báo cáo tin đăng', `
      <form id="repForm" class="form">
        <div class="radio-list">${reasons.map((r, i) => `<label class="radio-row"><input type="radio" name="reason" value="${esc(r)}" ${i === 0 ? 'checked' : ''}> ${r}</label>`).join('')}</div>
        <label>Mô tả thêm (không bắt buộc)<textarea name="note" rows="3"></textarea></label>
        <p class="small muted">Báo cáo được quản trị viên kiểm tra trong vòng 24 giờ.</p>
        <button class="btn danger block">Gửi báo cáo</button>
      </form>`, (m, close) => {
      m.querySelector('#repForm').onsubmit = guard(e => {
        e.preventDefault();
        api.report(l.id, e.target.reason.value, e.target.note.value);
        close();
        toast('Cảm ơn bạn! Quản trị viên sẽ kiểm tra tin này trong 24 giờ.', 'ok');
        renderHeader();
      });
    });
  }

  // ---------- Đăng / sửa tin ----------
  let draftImages = [];

  function viewPost(q) {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập để đăng tin bán, trao đổi hoặc cho tặng.');
    if (api.isAdmin(me)) return notFound('Tài khoản quản trị không đăng tin.');
    if (!me.emailVerified) return `<div class="container page narrow"><div class="empty big">✉<p>Xác thực email trước khi đăng tin.</p><a class="btn primary" href="#/verify">Xác thực email</a></div></div>`;
    const editing = q.edit ? api.getListing(q.edit) : null;
    if (q.edit && (!editing || editing.seller !== me.id || editing.status === 'removed')) return notFound('Không thể sửa tin này.');
    if (!editing && me.restricted) return notFound('Tài khoản đang bị hạn chế đăng tin do vi phạm quy định nhiều lần.');
    const cl = R.cluster(CID);
    const l = editing || {
      type: q.type || 'sell', title: '', cat: '', price: '', tradeFor: '', condition: 'Tốt', usedTime: '', desc: '',
      school: me.school, area: me.area, images: [],
    };
    draftImages = (l.images || []).slice();
    const opt = (v, t, cur) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(t)}</option>`;

    return `<div class="container page narrow">
      <h1>${editing ? 'Sửa tin đăng' : 'Đăng tin mới'}</h1>
      <p class="muted">Tin hợp lệ được hiển thị ngay và kiểm duyệt sau. Ghi rõ tình trạng, lỗi nếu có và khu vực giao dịch để người mua không phải hỏi lại.</p>
      ${editing && editing.status === 'hidden' ? `<div class="notice warn">🚩 Tin đang bị ẩn: ${esc(editing.modNote)} Lưu thay đổi để hiển thị lại.</div>` : ''}
      ${editing ? '' : quotaBox()}
      <form id="postForm" class="form panel">
        <label>Hình thức
          <div class="seg big">
            ${[['sell', '💰 Bán'], ['trade', '🔁 Trao đổi'], ['free', '🎁 Cho tặng (0đ)']].map(([v, t]) => `<label><input type="radio" name="type" value="${v}" ${l.type === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}
          </div>
        </label>

        <label>Ảnh thật của sản phẩm * <span class="muted small">(tối đa 6 ảnh, ảnh đầu là ảnh bìa; không dùng ảnh mạng)</span>
          <div class="uploader" id="uploader"></div>
          <input type="file" id="fileInput" accept="image/*" multiple hidden>
        </label>

        <label>Tiêu đề *<input name="title" maxlength="80" value="${esc(l.title)}" placeholder="VD: Quạt đứng Senko còn chạy êm"></label>

        <div class="row2">
          <label>Danh mục *<select name="cat">${opt('', '— Chọn danh mục —', l.cat)}${R.categories.map(c => opt(c.id, c.icon + ' ' + c.name, l.cat)).join('')}</select></label>
          <label>Tình trạng *<select name="condition">${R.conditions.map(c => opt(c, c, l.condition)).join('')}</select></label>
        </div>

        <div class="row2">
          <label data-show="sell trade">Giá <span data-show="trade" class="muted small">(tùy chọn, nếu chấp nhận bán)</span><input name="price" type="number" min="0" step="1000" value="${esc(l.price || '')}" placeholder="VD: 120000"></label>
          <label>Thời gian đã sử dụng<input name="usedTime" value="${esc(l.usedTime)}" placeholder="VD: 1 năm, 6 tháng"></label>
        </div>

        <label data-show="trade">Muốn đổi lấy *<input name="tradeFor" value="${esc(l.tradeFor || '')}" placeholder="VD: Chuột không dây, sách IELTS..."></label>

        <label>Mô tả tình trạng và lỗi<textarea name="desc" rows="4" placeholder="Tình trạng chi tiết, lỗi (nếu có), phụ kiện đi kèm, lý do bán, thời gian có thể gặp...">${esc(l.desc)}</textarea></label>

        <div class="row2">
          <label>Trường / nhóm<select name="school">${cl.schools.map(s => opt(s, s, l.school)).join('')}</select></label>
          <label>Khu vực giao dịch *<select name="area">${cl.areas.map(a => opt(a.id, a.name, l.area)).join('')}</select></label>
        </div>

        <p class="small muted">Không đăng hàng cấm, hàng không rõ nguồn gốc, giấy tờ hoặc tài khoản mua bán trái phép. Tin vi phạm sẽ bị yêu cầu chỉnh sửa, ẩn hoặc gỡ; tái phạm có thể bị hạn chế quyền đăng.</p>

        <div class="form-actions">
          ${editing ? `<button type="button" class="btn danger ghost" id="delBtn">Xóa tin</button>` : '<span></span>'}
          <button class="btn primary">${editing ? 'Lưu thay đổi' : 'Đăng tin'}</button>
        </div>
      </form>
    </div>`;
  }
  function quotaBox() {
    const q = api.quota();
    const ok = q.freeLeft || q.credits;
    return `<div class="quota ${ok ? '' : 'out'}" id="quotaBox">
      <span>📝 Tháng này còn <b>${q.freeLeft}/${P.freePosts}</b> tin miễn phí · <b>${q.credits}</b> lượt đã mua${ok ? '' : ' — <b>cần mua thêm để đăng</b>'}</span>
      <button type="button" class="btn small boost" id="buyPosts">+ Mua ${P.extraPosts.posts} tin – ${money(P.extraPosts.price)}</button>
    </div>`;
  }

  function mountPost(q) {
    const f = document.getElementById('postForm');
    if (!f) return;
    const up = document.getElementById('uploader');
    const fileInput = document.getElementById('fileInput');

    const renderImages = () => {
      up.innerHTML = draftImages.map((s, i) => `<div class="up-img"><img src="${s}" alt="">${i === 0 ? '<span class="cover">Bìa</span>' : ''}<button type="button" data-rm="${i}">✕</button></div>`).join('')
        + (draftImages.length < 6 ? `<button type="button" class="up-add" id="upAdd">📷<span>Thêm ảnh</span></button>` : '');
      up.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { draftImages.splice(Number(b.dataset.rm), 1); renderImages(); });
      const add = document.getElementById('upAdd');
      if (add) add.onclick = () => fileInput.click();
    };
    fileInput.onchange = async () => {
      const files = [...fileInput.files].slice(0, 6 - draftImages.length);
      for (const file of files) draftImages.push(await resizeImage(file, 900, 0.72));
      fileInput.value = '';
      renderImages();
    };
    renderImages();

    const applyType = () => {
      const t = f.type.value;
      f.querySelectorAll('[data-show]').forEach(el => { el.hidden = !el.dataset.show.split(' ').includes(t); });
    };
    f.querySelectorAll('input[name=type]').forEach(r => r.onchange = applyType);
    applyType();

    const refreshQuota = () => {
      const box = document.getElementById('quotaBox');
      if (box) { box.outerHTML = quotaBox(); document.getElementById('buyPosts').onclick = () => openBuyPosts(refreshQuota); }
    };
    refreshQuota();

    const submitPost = () => {
      const type = f.type.value;
      const data = {
        type, title: f.title.value.trim(), cat: f.cat.value, condition: f.condition.value,
        price: type === 'free' ? 0 : Number(f.price.value || 0), usedTime: f.usedTime.value.trim(),
        tradeFor: type === 'trade' ? f.tradeFor.value.trim() : '', desc: f.desc.value.trim(),
        school: f.school.value, area: f.area.value, images: draftImages.slice(),
      };
      const saved = q.edit ? api.updateListing(q.edit, data) : api.createListing(data);
      toast(q.edit ? 'Đã lưu thay đổi' : 'Đăng tin thành công 🎉 Tin đã hiển thị.', 'ok');
      go('/item/' + saved.id);
    };
    f.onsubmit = e => {
      e.preventDefault();
      try { submitPost(); } catch (err) {
        toast(err.message, 'err');
        // Hết lượt miễn phí → mua gói 5.000đ/2 tin rồi tự đăng tiếp
        if (err.code === 'QUOTA') openBuyPosts(() => { refreshQuota(); guard(submitPost)(); });
      }
    };

    const del = document.getElementById('delBtn');
    if (del) del.onclick = guard(() => {
      if (!confirm('Xóa vĩnh viễn tin này?')) return;
      api.deleteListing(q.edit);
      toast('Đã xóa tin');
      go('/me');
    });
  }

  function resizeImage(file, max, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- Trang của tôi ----------
  function viewMe(q) {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập để quản lý tin đăng.');
    const admin = api.isAdmin(me);
    const tab = admin ? 'account' : (q.tab || 'listings');
    const mine = admin ? [] : api.searchListings({ seller: me.id, statuses: ['available', 'expired', 'hidden', 'removed', 'sold'], sort: 'new' });
    const tabs = admin ? [['account', 'Tài khoản', 0]] : [['listings', 'Tin của tôi', mine.length], ['payments', 'Gói & thanh toán', 0], ['account', 'Tài khoản', 0]];

    let body = '';
    if (tab === 'listings') {
      const groups = [
        ['available', 'Đang hiển thị'],
        ['expired', `Đã tự ẩn (quá ${R.listingDays} ngày chưa cập nhật)`],
        ['hidden', 'Bị ẩn – cần chỉnh sửa'],
        ['sold', 'Đã bán / cho tặng / trao đổi'],
        ['removed', 'Bị gỡ do vi phạm'],
      ];
      body = `${me.restricted ? '<div class="notice warn">Tài khoản đang bị hạn chế đăng tin mới do vi phạm quy định nhiều lần.</div>' : ''}` + (mine.length ? groups.map(([s, t]) => {
        const ls = mine.filter(l => l.status === s);
        if (!ls.length) return '';
        return `<h3 class="group-title">${t} <span class="muted">(${ls.length})</span></h3>
          <div class="rows">${ls.map(l => `<div class="row-item">
              <a href="#/item/${l.id}" class="row-thumb">${thumb(l)}</a>
              <div class="row-main">
                <a href="#/item/${l.id}"><b>${esc(l.title)}</b></a>
                <div>${priceLabel(l)} ${typeBadge[l.type]} ${l.boosted ? `<span class="badge b-boost">⚡ còn ${timeLeft(l.boostUntil)}</span>` : ''}</div>
                <div class="small muted">👁 ${l.views} · Đăng ${timeAgo(l.createdAt)}
                  ${s === 'available' ? ` · Tự ẩn sau ${timeLeft(l.expiresAt)}` : ''}
                  ${(s === 'hidden' || s === 'removed') && l.modNote ? ` · Lý do: ${esc(l.modNote)}` : ''}</div>
              </div>
              <div class="row-actions">
                ${s === 'available' ? `<a class="btn ghost small" href="#/post?edit=${l.id}">Sửa</a><button class="btn ghost small" data-renew="${l.id}">↻ Gia hạn</button><button class="btn boost small" data-boost="${l.id}">⚡ Đẩy</button><button class="btn primary small" data-sold="${l.id}">${doneLabel(l)}</button>` : ''}
                ${s === 'expired' ? `<button class="btn primary small" data-renew="${l.id}">↻ Gia hạn miễn phí</button><button class="btn ghost small" data-sold="${l.id}">${doneLabel(l)}</button>` : ''}
                ${s === 'hidden' ? `<a class="btn primary small" href="#/post?edit=${l.id}">Sửa tin</a>` : ''}
                ${s === 'sold' ? `<button class="btn ghost small" data-reopen="${l.id}">Mở bán lại</button>` : ''}
              </div>
            </div>`).join('')}</div>`;
      }).join('') : `<div class="empty">Bạn chưa có tin nào. <a href="#/post">Đăng tin đầu tiên</a></div>`);
    } else if (tab === 'payments') {
      const qt = api.quota();
      const ps = api.myPayments();
      const hot = mine.filter(l => l.boosted);
      body = `<div class="two-col">
        <div class="panel"><h3>📝 Lượt đăng tin</h3>
          <div class="quota-big"><div><b>${qt.freeLeft}/${P.freePosts}</b><span>tin miễn phí còn lại tháng này</span></div><div><b>${qt.credits}</b><span>lượt đã mua</span></div></div>
          <button class="btn boost block" id="buyPosts2">+ Mua ${P.extraPosts.posts} tin – ${money(P.extraPosts.price)}</button></div>
        <div class="panel"><h3>⚡ Tin đang ưu tiên</h3>
          ${hot.length ? hot.map(l => `<div class="mini-row"><a href="#/item/${l.id}" class="ellipsis">${esc(l.title)}</a><span class="badge b-boost">còn ${timeLeft(l.boostUntil)}</span></div>`).join('') : `<p class="muted small">Chưa có tin nào ưu tiên. Chỉ ${money(P.featured.price)}/${P.featured.days} ngày.</p>`}
          <a href="#/pricing" class="btn ghost block small">Xem bảng giá</a></div>
      </div>
      <h3 class="group-title">Lịch sử thanh toán</h3>
      ${ps.length ? `<div class="panel table-wrap"><table class="pay-table"><tr><th>Thời gian</th><th>Dịch vụ</th><th>Phương thức</th><th class="r">Số tiền</th></tr>
        ${ps.map(x => `<tr><td>${fmtDate(x.at)} ${fmtTime(x.at)}</td><td>${esc(x.desc)}${x.listingId ? ` · <a href="#/item/${x.listingId}">xem tin</a>` : ''}</td><td>${esc(x.method)}</td><td class="r"><b>${money(x.amount)}</b></td></tr>`).join('')}
      </table></div>` : '<div class="empty">Chưa có giao dịch thanh toán nào.</div>'}`;
    } else {
      const cl = R.cluster(CID);
      body = `<div class="two-col">
        <form id="profileForm" class="form panel">
          <h3>Thông tin cá nhân</h3>
          <label>Họ tên<input name="name" value="${esc(me.name)}" required></label>
          <label>Giới thiệu<textarea name="bio" rows="2">${esc(me.bio || '')}</textarea></label>
          <div class="row2">
            <label>Trường / nhóm<select name="school">${cl.schools.map(s => `<option ${s === me.school ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
            <label>Khu trọ / KTX<select name="area">${cl.areas.map(a => `<option value="${a.id}" ${a.id === me.area ? 'selected' : ''}>${a.name}</option>`).join('')}</select></label>
          </div>
          <label>Số điện thoại liên hệ <span class="small muted">(không bắt buộc)</span><input name="phone" value="${esc(me.phone || '')}" placeholder="09xxxxxxxx"></label>
          <label class="check"><input type="checkbox" name="showPhone" ${me.showPhone ? 'checked' : ''}> Hiển thị số điện thoại trên tin đăng của tôi</label>
          <button class="btn primary">Lưu</button>
        </form>
        <div class="panel">
          <h3>Xác thực tài khoản</h3>
          <div class="verify-item ${me.emailVerified ? 'done' : ''}">
            <div><b>✉ Email</b><div class="small muted">${esc(me.email)}</div></div>
            ${me.emailVerified ? '<span class="vbadge ok">✔ Đã xác thực</span>' : '<a class="btn primary small" href="#/verify">Xác thực</a>'}
          </div>
          <p class="small muted">ReMarket chỉ cần email để quản lý tài khoản, không yêu cầu email trường, ảnh căn cước hay số điện thoại. Xác thực email không đồng nghĩa người dùng chắc chắn trung thực: hãy kiểm tra hàng trước khi trả tiền.</p>
        </div>
      </div>`;
    }

    return `<div class="container page">
      <div class="profile-head panel">
        ${avatar(me, 'xl')}
        <div class="grow"><h1>${esc(me.name)}</h1><div>${emailBadge(me)}</div>
          <div class="small muted">${esc(me.school)} · ${esc(areaName(me.area))} · Hòa Lạc</div></div>
        ${admin ? '<a href="#/admin" class="btn primary">🛡 Kiểm duyệt</a>' : '<a href="#/post" class="btn primary">+ Đăng tin</a>'}
      </div>
      <div class="tabs">${tabs.map(([k, t, n]) => `<a href="#/me?tab=${k}" class="${k === tab ? 'active' : ''}">${t}${n ? ` <span class="count">${n}</span>` : ''}</a>`).join('')}</div>
      <div class="tab-body">${body}</div>
    </div>`;
  }

  function mountMe() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(b => b.onclick = guard(() => fn(b)));
    on('[data-boost]', b => openServices(api.getListing(b.dataset.boost)));
    on('[data-sold]', b => openMarkSold(api.getListing(b.dataset.sold)));
    on('[data-reopen]', b => { api.reopen(b.dataset.reopen); toast('Tin đã hiển thị lại', 'ok'); render(); });
    on('[data-renew]', b => { api.renew(b.dataset.renew); toast(`Đã gia hạn miễn phí ${R.listingDays} ngày`, 'ok'); render(); });
    const bp = document.getElementById('buyPosts2');
    if (bp) bp.onclick = () => openBuyPosts(render);

    const pf = document.getElementById('profileForm');
    if (pf) {
      pf.onsubmit = guard(e => {
        e.preventDefault();
        api.updateProfile({ name: pf.name.value.trim(), bio: pf.bio.value.trim(), school: pf.school.value, area: pf.area.value, phone: pf.phone.value.trim(), showPhone: pf.showPhone.checked && !!pf.phone.value.trim() });
        toast('Đã lưu hồ sơ', 'ok');
        render();
      });
    }
  }

  // ---------- Kiểm duyệt (quản trị viên) ----------
  function viewAdmin(q) {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập bằng tài khoản quản trị để kiểm duyệt.');
    if (!api.isAdmin(me)) return notFound('Chỉ quản trị viên mới truy cập được trang này.');
    const st = api.adminStats();
    const all = api.adminReports();
    const tab = q.tab || 'open';
    const open = all.filter(r => r.status === 'open');
    const done = all.filter(r => r.status === 'resolved');
    const moderated = api.moderatedListings();
    const actionName = { edit: 'Ẩn, yêu cầu chỉnh sửa', remove: 'Gỡ tin', dismiss: 'Không vi phạm' };

    const reportRow = r => {
      const l = r.listing;
      const seller = l ? api.getUser(l.seller) : null;
      const deadline = r.at + 24 * 3600 * 1000;
      const viol = seller ? api.violationCount(seller.id) : 0;
      return `<div class="row-item">
        ${l ? `<a href="#/item/${l.id}" class="row-thumb">${thumb(l)}</a>` : ''}
        <div class="row-main">
          ${l ? `<a href="#/item/${l.id}"><b>${esc(l.title)}</b></a>` : '<b>Tin đã bị xóa</b>'}
          <div><span class="badge b-sell">🚩 ${esc(r.reason)}</span> ${l ? priceLabel(l) : ''}</div>
          ${r.note ? `<div class="small">“${esc(r.note)}”</div>` : ''}
          <div class="small muted">Người báo cáo: ${esc(r.reporter ? r.reporter.name : 'Ẩn danh')} · ${timeAgo(r.at)}
            ${seller ? ` · Người bán: <a href="#/user/${seller.id}">${esc(seller.name)}</a>${viol ? ` (đã vi phạm ${viol} lần)` : ''}${seller.restricted ? ' · <b>đang bị hạn chế</b>' : ''}` : ''}</div>
          ${r.status === 'open'
            ? `<div class="small ${deadline < Date.now() ? 'bold' : 'muted'}">⏱ ${deadline > Date.now() ? `Còn ${timeLeft(deadline)} trong hạn xử lý 24 giờ` : 'Đã quá hạn xử lý 24 giờ'}</div>`
            : `<div class="small muted">✔ ${actionName[r.action] || r.action} · xử lý sau ${Math.max(1, Math.round((r.handledAt - r.at) / 3600000))} giờ${r.modNote ? ` · ${esc(r.modNote)}` : ''}</div>`}
        </div>
        ${r.status === 'open' && l ? `<div class="row-actions"><button class="btn primary small" data-mod="${r.id}">Xử lý</button></div>` : ''}
      </div>`;
    };

    let body;
    if (tab === 'open') body = open.length ? `<div class="rows">${open.map(reportRow).join('')}</div>` : '<div class="empty">Không có báo cáo nào chờ xử lý 🎉</div>';
    else if (tab === 'done') body = done.length ? `<div class="rows">${done.map(reportRow).join('')}</div>` : '<div class="empty">Chưa có báo cáo nào được xử lý.</div>';
    else body = moderated.length ? `<div class="rows">${moderated.map(l => {
      const seller = api.getUser(l.seller);
      return `<div class="row-item"><a href="#/item/${l.id}" class="row-thumb">${thumb(l)}</a>
        <div class="row-main"><a href="#/item/${l.id}"><b>${esc(l.title)}</b></a>
          <div class="small muted">${l.status === 'removed' ? 'Đã gỡ' : 'Đang ẩn chờ chỉnh sửa'} · ${esc(l.modNote || '')} · Người bán: ${esc(seller ? seller.name : '')}</div></div>
        <div class="row-actions"><button class="btn ghost small" data-restore="${l.id}">Khôi phục</button>
          ${seller ? `<button class="btn ghost small" data-restrict="${seller.id}" data-v="${seller.restricted ? '' : '1'}">${seller.restricted ? 'Bỏ hạn chế' : 'Hạn chế đăng tin'}</button>` : ''}</div></div>`;
    }).join('')}</div>` : '<div class="empty">Không có tin nào đang bị ẩn hoặc gỡ.</div>';

    return `<div class="container page">
      <h1>🛡 Kiểm duyệt sau đăng</h1>
      <p class="muted">Tin đăng hiển thị ngay để người bán không phải chờ duyệt. Quản trị viên tiếp nhận báo cáo, đối chiếu quy định và xử lý trong vòng 24 giờ.</p>
      <div class="quota-big panel">
        <div><b>${st.open}</b><span>báo cáo chờ xử lý</span></div>
        <div><b>${st.within24}%</b><span>xử lý trong 24 giờ</span></div>
        <div><b>${st.avgHours} giờ</b><span>thời gian xử lý trung bình</span></div>
        <div><b>${st.activeListings}</b><span>tin đang hiển thị</span></div>
        <div><b>${st.restricted}</b><span>tài khoản bị hạn chế</span></div>
      </div>
      <div class="tabs">
        <a href="#/admin?tab=open" class="${tab === 'open' ? 'active' : ''}">Chờ xử lý${open.length ? ` <span class="count">${open.length}</span>` : ''}</a>
        <a href="#/admin?tab=done" class="${tab === 'done' ? 'active' : ''}">Đã xử lý</a>
        <a href="#/admin?tab=listings" class="${tab === 'listings' ? 'active' : ''}">Tin bị ẩn / gỡ</a>
      </div>
      <div class="tab-body">${body}</div>
    </div>`;
  }
  function mountAdmin() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(b => b.onclick = guard(() => fn(b)));
    on('[data-mod]', b => openModerate(b.dataset.mod));
    on('[data-restore]', b => { api.restoreListing(b.dataset.restore); toast('Đã khôi phục tin', 'ok'); render(); });
    on('[data-restrict]', b => { api.setRestricted(b.dataset.restrict, !!b.dataset.v); toast(b.dataset.v ? 'Đã hạn chế đăng tin' : 'Đã bỏ hạn chế', 'ok'); render(); });
  }
  function openModerate(reportId) {
    const r = api.adminReports().find(x => x.id === reportId);
    if (!r || !r.listing) return;
    const seller = api.getUser(r.listing.seller);
    const viol = api.violationCount(seller.id);
    modal('🛡 Xử lý báo cáo', `
      <p class="muted">“<b>${esc(r.listing.title)}</b>” · ${esc(r.reason)}</p>
      <form id="modForm" class="form">
        <div class="radio-list">
          <label class="radio-row"><input type="radio" name="action" value="edit" checked> Ẩn tin, yêu cầu người bán chỉnh sửa</label>
          <label class="radio-row"><input type="radio" name="action" value="remove"> Gỡ tin</label>
          <label class="radio-row"><input type="radio" name="action" value="dismiss"> Không vi phạm, giữ nguyên</label>
        </div>
        <label>Lý do gửi người bán<input name="note" value="${esc(r.reason.startsWith('Đòi đặt cọc') ? 'Yêu cầu chuyển cọc trước, ảnh không phải ảnh thật, từ chối cho xem hàng.' : '')}" placeholder="VD: Ảnh lấy trên mạng, đòi đặt cọc trước"></label>
        <label class="check"><input type="checkbox" name="restrict" ${viol ? 'checked' : ''}> Hạn chế quyền đăng tin của ${esc(seller.name)}${viol ? ` (đã vi phạm ${viol} lần)` : ''}</label>
        <button class="btn primary block">Xác nhận</button>
      </form>`, (m, close) => {
      m.querySelector('#modForm').onsubmit = guard(e => {
        e.preventDefault();
        const f = e.target;
        api.moderate(reportId, f.action.value, f.note.value, f.action.value !== 'dismiss' && f.restrict.checked);
        close();
        toast({ edit: 'Đã ẩn tin và yêu cầu chỉnh sửa', remove: 'Đã gỡ tin', dismiss: 'Đã đóng báo cáo' }[f.action.value], 'ok');
        render();
      });
    });
  }

  // ---------- Trang cá nhân công khai ----------
  function viewUser(id) {
    const u = api.getUser(id);
    if (!u) return notFound('Không tìm thấy người dùng.');
    const ls = api.searchListings({ seller: u.id, sort: 'new' });
    const sold = api.searchListings({ seller: u.id, statuses: ['sold'] }).length;
    const me = api.currentUser();
    return `<div class="container page">
      <div class="profile-head panel">
        ${avatar(u, 'xl')}
        <div class="grow"><h1>${esc(u.name)}</h1><div>${emailBadge(u)}</div>
          <div class="small muted">${esc(u.school)} · ${esc(areaName(u.area))} · Tham gia ${fmtDate(u.joinedAt)}</div>
          ${u.bio ? `<p>${esc(u.bio)}</p>` : ''}
          ${me && me.id === u.id ? '' : sellerContact(u)}
        </div>
        <div class="profile-stats"><div><b>${ls.length}</b><span>đang hiển thị</span></div><div><b>${sold}</b><span>đã bán / cho tặng</span></div></div>
      </div>
      <section class="section"><div class="section-head"><h2>Tin đang hiển thị</h2></div>${grid(ls, 'Người dùng chưa có tin nào đang hiển thị.')}</section>
    </div>`;
  }

  // ---------- Tin nhắn ----------
  function viewChat(id) {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập để xem tin nhắn.');
    const convs = api.conversations();
    const cur = id ? api.getConversation(id) : null;
    if (cur) api.markRead(cur.id);

    const list = convs.length ? convs.map(c => {
      const other = api.getUser(c.members.find(m => m !== me.id));
      const l = api.getListing(c.listingId);
      const last = c.messages[c.messages.length - 1];
      const un = api.unreadCount(c);
      return `<a href="#/chat/${c.id}" class="conv ${cur && cur.id === c.id ? 'active' : ''}">
        ${avatar(other)}
        <div class="conv-main"><div class="conv-top"><b>${esc(other.name)}</b><span class="small muted">${last ? timeAgo(last.at) : ''}</span></div>
          <div class="small muted ellipsis">${l ? esc(l.title) : 'Tin đã xóa'}</div>
          <div class="small ellipsis ${un ? 'bold' : ''}">${last ? (last.from === me.id ? 'Bạn: ' : '') + esc(last.text) : 'Bắt đầu trò chuyện'}</div></div>
        ${un ? `<span class="dot static">${un}</span>` : ''}
      </a>`;
    }).join('') : '<div class="empty small">Chưa có cuộc trò chuyện nào. Nhắn tin người bán từ trang sản phẩm.</div>';

    let pane = '<div class="chat-empty">💬<p>Chọn một cuộc trò chuyện</p></div>';
    if (cur) {
      const other = api.getUser(cur.members.find(m => m !== me.id));
      const l = api.getListing(cur.listingId);
      const statusText = l ? (l.status === 'available' ? 'Còn hàng' : statusOverlay(l)) : '';
      let lastDay = '';
      pane = `
        <div class="chat-head">
          <a href="#/chat" class="icon-btn show-sm">←</a>
          <a href="#/user/${other.id}" class="chat-user">${avatar(other)}<div><b>${esc(other.name)}</b><div class="small">${esc(other.school)}</div></div></a>
        </div>
        ${l ? `<a href="#/item/${l.id}" class="chat-listing">${thumb(l, 'xs')}<div><div class="ellipsis">${esc(l.title)}</div>${priceLabel(l)}</div>
          <span class="badge ${l.status === 'available' ? 'b-free' : 'b-sell'}">${statusText}</span></a>` : ''}
        <div class="notice small">🛡 Gặp ở nơi công cộng, kiểm tra hàng rồi mới trả tiền. Không chuyển cọc cho người lạ.</div>
        <div class="messages" id="messages">
          ${cur.messages.map(m => {
            const day = fmtDate(m.at);
            const sep = day !== lastDay ? `<div class="day-sep">${day}</div>` : '';
            lastDay = day;
            return sep + `<div class="msg ${m.from === me.id ? 'me' : ''}"><div class="bubble">${esc(m.text)}</div><span class="small muted">${fmtTime(m.at)}</span></div>`;
          }).join('')}
          <div class="typing" id="typing" hidden><span></span><span></span><span></span></div>
        </div>
        <div class="quick">${['Còn hàng không bạn?', 'Có bớt không bạn?', 'Hẹn gặp ở đâu tiện bạn?', 'Mình qua xem được không?'].map(t => `<button class="chip" data-q="${t}">${t}</button>`).join('')}</div>
        <form class="composer" id="composer"><input name="text" placeholder="Nhập tin nhắn..." autocomplete="off"><button class="btn primary">Gửi</button></form>`;
    }

    return `<div class="container page">
      <div class="chat ${cur ? 'has-cur' : ''}">
        <aside class="conv-list"><h2>Tin nhắn</h2>${list}</aside>
        <section class="chat-pane">${pane}</section>
      </div>
    </div>`;
  }
  function mountChat(id) {
    const f = document.getElementById('composer');
    if (!f) return;
    const box = document.getElementById('messages');
    box.scrollTop = box.scrollHeight;
    const send = text => {
      if (!text.trim()) return;
      api.sendMessage(id, text);
      render();
      const typing = document.getElementById('typing');
      if (typing) { typing.hidden = false; document.getElementById('messages').scrollTop = 1e9; }
      setTimeout(() => {
        api.simulateReply(id);
        if (currentPath() === '/chat/' + id) { api.markRead(id); render(); }
        else renderHeader();
      }, 1400);
    };
    f.onsubmit = e => { e.preventDefault(); send(f.text.value); };
    document.querySelectorAll('.quick .chip').forEach(c => c.onclick = () => send(c.dataset.q));
    f.text.focus();
  }

  // ---------- Đăng nhập / Đăng ký / Xác thực email ----------
  function viewLogin(q) {
    const demos = ['u5', 'u4', 'u11', 'u0', 'u1'].map(api.getUser).filter(Boolean);
    const roleOf = { u5: 'Người bán – sắp ra trường', u4: 'Người mua – tân sinh viên', u11: 'Người bán đáng ngờ (Màn 5)', u0: 'Quản trị viên kiểm duyệt', u1: 'Người bán có tin đã tự ẩn' };
    return `<div class="container page auth">
      <div class="panel auth-card">
        <h1>Đăng nhập</h1>
        <form id="loginForm" class="form">
          <label>Email<input name="email" type="email" required placeholder="ten@gmail.com"></label>
          <label>Mật khẩu<input name="password" type="password" required></label>
          <button class="btn primary block">Đăng nhập</button>
        </form>
        <p class="center small">Chưa có tài khoản? <a href="#/register${qs({ next: q.next })}">Đăng ký</a></p>
        <div class="divider"><span>hoặc dùng tài khoản demo</span></div>
        <div class="demo-list">${demos.map(u => `<button class="demo" data-id="${u.id}">${avatar(u)}<div><b>${esc(u.name)}</b><div class="small muted">${roleOf[u.id]}</div></div></button>`).join('')}</div>
      </div>
    </div>`;
  }
  function mountLogin(q) {
    const next = q.next || '/';
    document.getElementById('loginForm').onsubmit = guard(e => {
      e.preventDefault();
      const u = api.login(e.target.email.value, e.target.password.value);
      toast('Xin chào ' + u.name, 'ok');
      go(api.isAdmin(u) && next === '/' ? '/admin' : next);
    });
    document.querySelectorAll('.demo').forEach(b => b.onclick = () => { const u = api.loginAs(b.dataset.id); toast('Xin chào ' + u.name, 'ok'); go(api.isAdmin(u) && next === '/' ? '/admin' : next); });
  }

  function viewRegister(q) {
    const cl = R.cluster(CID);
    return `<div class="container page auth">
      <div class="panel auth-card wide">
        <h1>Tạo tài khoản</h1>
        <p class="muted small">Chỉ cần email để đăng ký. Sinh viên, người đi làm và cư dân Hòa Lạc đều dùng được, không bắt buộc email trường.</p>
        <form id="regForm" class="form">
          <label>Họ và tên<input name="name" required></label>
          <div class="row2">
            <label>Email<input name="email" type="email" required placeholder="ten@gmail.com"></label>
            <label>Mật khẩu<input name="password" type="password" minlength="6" required></label>
          </div>
          <div class="row2">
            <label>Trường / nhóm<select name="school">${cl.schools.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
            <label>Khu trọ / KTX gần bạn<select name="area">${cl.areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></label>
          </div>
          <label class="check"><input type="checkbox" required> Tôi đồng ý với quy định cộng đồng: không đăng hàng cấm, mô tả trung thực, tự kiểm tra hàng khi giao dịch.</label>
          <button class="btn primary block">Đăng ký</button>
        </form>
        <p class="center small">Đã có tài khoản? <a href="#/login${qs({ next: q.next })}">Đăng nhập</a></p>
      </div>
    </div>`;
  }
  function mountRegister(q) {
    const f = document.getElementById('regForm');
    f.onsubmit = guard(e => {
      e.preventDefault();
      api.register({ name: f.name.value, email: f.email.value, password: f.password.value, school: f.school.value, area: f.area.value });
      toast('Đã gửi mã xác thực tới email của bạn.', 'ok');
      go('/verify' + qs({ next: q.next }));
    });
  }

  function viewVerify() {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập để xác thực email.');
    if (me.emailVerified) return `<div class="container page narrow"><div class="empty big">✔<p>Email ${esc(me.email)} đã được xác thực.</p><a class="btn primary" href="#/post">Đăng tin</a></div></div>`;
    return `<div class="container page auth">
      <div class="panel auth-card">
        <h1>✉ Xác thực email</h1>
        <p class="muted">Mã xác thực đã được gửi tới <b>${esc(me.email)}</b>.</p>
        <form id="verifyForm" class="form">
          <label>Mã 6 số<input name="code" inputmode="numeric" maxlength="6" required placeholder="______"></label>
          <button class="btn primary block">Xác thực</button>
        </form>
        <p class="center small"><button class="link-btn small" id="resend">Gửi lại mã</button></p>
        <p class="small muted">Bản demo: mã luôn là <b>123456</b>.</p>
      </div>
    </div>`;
  }
  function mountVerify(q) {
    const f = document.getElementById('verifyForm');
    if (!f) return;
    f.onsubmit = guard(e => {
      e.preventDefault();
      api.verifyEmail(f.code.value);
      toast('Đã xác thực email ✔ Bạn có 2 tin đăng miễn phí.', 'ok');
      go(q.next || '/post');
    });
    document.getElementById('resend').onclick = () => toast('Đã gửi lại mã (demo: 123456)');
    f.code.focus();
  }

  // ---------- Khác ----------
  function loginWall(msg) {
    return `<div class="container page"><div class="empty big">🔒<p>${msg}</p><a class="btn primary" href="#/login${qs({ next: location.hash.slice(1) })}">Đăng nhập</a> <a class="btn ghost" href="#/register">Đăng ký</a></div></div>`;
  }
  function notFound(msg) {
    return `<div class="container page"><div class="empty big">🤷<p>${msg || 'Không tìm thấy trang.'}</p><a class="btn primary" href="#/">Về trang chủ</a></div></div>`;
  }

  // ---------- Router ----------
  function currentPath() { return (location.hash.slice(1) || '/').split('?')[0]; }
  function currentQuery() { return Object.fromEntries(new URLSearchParams((location.hash.split('?')[1]) || '')); }

  const routes = [
    [/^\/$/, () => [viewHome(), mountHome]],
    [/^\/search$/, q => [viewSearch(q), () => mountSearch(q)]],
    [/^\/item\/([\w-]+)$/, (q, id) => [viewItem(id), () => mountItem(id)]],
    [/^\/post$/, q => [viewPost(q), () => mountPost(q)]],
    [/^\/me$/, q => [viewMe(q), mountMe]],
    [/^\/admin$/, q => [viewAdmin(q), mountAdmin]],
    [/^\/user\/([\w-]+)$/, (q, id) => [viewUser(id), () => bindContact($app)]],
    [/^\/chat(?:\/([\w-]+))?$/, (q, id) => [viewChat(id), () => mountChat(id)]],
    [/^\/pricing$/, q => [viewPricing(q), () => mountPricing(q)]],
    [/^\/notifications$/, q => [viewNotifications(q), mountNotifications]],
    [/^\/login$/, q => [viewLogin(q), () => mountLogin(q)]],
    [/^\/register$/, q => [viewRegister(q), () => mountRegister(q)]],
    [/^\/verify$/, q => [viewVerify(q), () => mountVerify(q)]],
  ];

  let lastPath = null;
  function render() {
    const path = currentPath();
    const q = currentQuery();
    renderHeader();
    renderSideAds(path === '/' || path === '/search' || path.startsWith('/item/') || path === '/pricing');
    clearInterval(heroTimer);
    maps.forEach(m => m.remove());
    maps = [];
    document.getElementById('modal-root').innerHTML = '';
    let html = notFound(), mount = null;
    for (const [re, fn] of routes) {
      const m = path.match(re);
      if (m) { [html, mount] = fn(q, m[1]); break; }
    }
    const keepScroll = path === lastPath;
    const y = window.scrollY;
    $app.innerHTML = html;
    if (mount) mount();
    window.scrollTo(0, keepScroll ? y : 0);
    lastPath = path;
  }

  window.addEventListener('hashchange', render);
  document.getElementById('resetDemo').onclick = e => {
    e.preventDefault();
    if (confirm('Khôi phục toàn bộ dữ liệu mẫu? Tin bạn đã đăng sẽ bị xóa.')) { api.resetDemo(); toast('Đã khôi phục dữ liệu mẫu'); go('/'); render(); }
  };
  render();
})();
