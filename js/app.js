/* Giao diện: router theo hash + các trang. Mọi dữ liệu lấy qua window.api */
(function () {
  const $app = document.getElementById('app');
  const R = api.ref;

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
  const areaName = (c, a) => (R.area(c, a) || {}).name || '';
  const qs = o => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null && v !== false) p.set(k, v); }); const s = p.toString(); return s ? '?' + s : ''; };
  const go = h => { location.hash = h; };

  function priceLabel(l) {
    if (l.type === 'free') return '<span class="price free">Miễn phí</span>';
    if (l.type === 'trade') return '<span class="price trade">Trao đổi</span>' + (l.price ? ` <small class="muted">hoặc ${money(l.price)}</small>` : '');
    return `<span class="price">${money(l.price)}</span>`;
  }
  const typeBadge = { sell: '<span class="badge b-sell">Bán</span>', trade: '<span class="badge b-trade">Trao đổi</span>', free: '<span class="badge b-free">Cho tặng</span>' };

  function avatar(u, size) {
    if (!u) return '';
    const initials = u.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
    let h = 0; for (const ch of u.id) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `<span class="avatar ${size || ''}" style="background:hsl(${h} 55% 45%)">${esc(initials)}</span>`;
  }
  function stars(avg, count) {
    if (!count) return '<span class="muted small">Chưa có đánh giá</span>';
    const full = Math.round(avg);
    return `<span class="stars">${'★'.repeat(full)}<span class="off">${'★'.repeat(5 - full)}</span></span> <span class="small">${avg.toFixed(1)} (${count})</span>`;
  }
  function verifiedBadge(u, compact) {
    if (!u) return '';
    if (u.verified.student) return `<span class="vbadge ok" title="Đã xác thực sinh viên">✔${compact ? '' : ' Sinh viên đã xác thực'}</span>`;
    if (u.verified.phone) return `<span class="vbadge mid" title="Đã xác thực số điện thoại">☎${compact ? '' : ' Đã xác thực SĐT'}</span>`;
    return `<span class="vbadge no" title="Chưa xác thực">!${compact ? '' : ' Chưa xác thực'}</span>`;
  }

  function thumb(l, cls) {
    const cat = R.category(l.cat) || R.categories[0];
    if (l.images && l.images.length) return `<div class="thumb ${cls || ''}"><img src="${l.images[0]}" alt="${esc(l.title)}" loading="lazy"></div>`;
    return `<div class="thumb ph ${cls || ''}" style="background:linear-gradient(135deg,${cat.color[0]},${cat.color[1]})"><span>${cat.icon}</span></div>`;
  }

  function card(l) {
    const seller = api.getUser(l.seller);
    return `<a class="card" href="#/item/${l.id}">
      <div class="card-img">
        ${thumb(l)}
        <div class="card-badges">
          ${typeBadge[l.type]}
          ${l.combo && l.combo.length ? '<span class="badge b-combo">Combo</span>' : ''}
          ${l.movingSale ? '<span class="badge b-moving">Thanh lý</span>' : ''}
        </div>
        ${l.boosted ? '<span class="badge b-boost corner">⚡ Nổi bật</span>' : ''}
        ${l.status === 'reserved' ? '<div class="overlay">Đang được giữ</div>' : ''}
        ${l.status === 'sold' ? '<div class="overlay">Đã giao dịch</div>' : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${esc(l.title)}</div>
        <div>${priceLabel(l)}</div>
        <div class="card-meta">📍 ${esc(areaName(l.cluster, l.area))} · ${l.distance != null ? l.distance + ' km' : ''}</div>
        <div class="card-meta">${verifiedBadge(seller, true)} ${esc(seller ? seller.name : '')} · ${timeAgo(l.createdAt)}</div>
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
    const cl = R.cluster(api.activeClusterId());
    const unread = api.totalUnread();
    const notifs = me ? api.notifications() : [];
    const unreadN = notifs.filter(n => !n.read).length;
    document.getElementById('header').innerHTML = `
      <div class="container header-inner">
        <a href="#/" class="logo"><span class="logo-mark">♻</span><span>ReMarket</span></a>
        <button class="cluster-pill" id="clusterBtn" title="Đổi cụm giao dịch">📍 ${esc(cl.name)} <span class="caret">▾</span></button>
        <form class="search" id="headerSearch">
          <input name="q" placeholder="Tìm bàn học, nồi cơm, giáo trình..." value="${esc(currentQuery().q || '')}" autocomplete="off">
          <button aria-label="Tìm">🔍</button>
        </form>
        <nav class="header-actions">
          <a href="#/moving" class="hdr-link hide-sm">📦 Thanh lý</a>
          <a href="#/pricing" class="hdr-link hide-sm">💎 Gói dịch vụ</a>
          ${me ? `<div class="menu-wrap">
            <button class="icon-btn" id="bellBtn" title="Thông báo">🔔${unreadN ? `<span class="dot">${unreadN}</span>` : ''}</button>
            <div class="menu notif-menu" id="bellMenu">
              <div class="menu-head notif-head">Thông báo ${unreadN ? `<button class="link-btn small" id="readAll">Đánh dấu đã đọc</button>` : ''}</div>
              ${notifs.length ? notifs.slice(0, 6).map(notifRow).join('') : '<div class="small muted pad">Chưa có thông báo.</div>'}
              <a href="#/notifications" class="menu-foot">Xem tất cả thông báo</a>
            </div></div>
            <a href="#/reviews" class="icon-btn hide-sm" title="Đánh giá">⭐</a>
            <a href="#/chat" class="icon-btn hide-sm" title="Tin nhắn">💬${unread ? `<span class="dot">${unread}</span>` : ''}</a>` : ''}
          <a href="#/post" class="btn primary hide-sm">+ Đăng tin</a>
          ${me ? `<div class="menu-wrap"><button class="avatar-btn" id="meBtn">${avatar(me)}</button>
            <div class="menu" id="meMenu">
              <div class="menu-head">${esc(me.name)}<div class="small muted">${esc(me.email)}</div></div>
              <a href="#/me">Tin của tôi</a>
              <a href="#/me?tab=reserved">Đang đặt giữ</a>
              <a href="#/reviews">Đánh giá</a>
              <a href="#/notifications">Thông báo</a>
              <a href="#/me?tab=payments">Gói đã mua & thanh toán</a>
              <a href="#/pricing">Bảng giá dịch vụ</a>
              <a href="#/me?tab=account">Tài khoản & xác thực</a>
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
      <a href="${me ? '#/me' : '#/login'}" data-nav="/me">👤<span>Tôi</span></a>`;
    const p = currentPath();
    document.querySelectorAll('#bottomNav a').forEach(a => { if (a.dataset.nav === '/' ? p === '/' : p.startsWith(a.dataset.nav)) a.classList.add('active'); });

    document.getElementById('headerSearch').onsubmit = e => {
      e.preventDefault();
      go('/search' + qs({ q: e.target.q.value.trim() }));
    };
    document.getElementById('clusterBtn').onclick = openClusterPicker;
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

  const notifIcon = { deal: '📌', review: '⭐', pay: '💳', system: '📣' };
  function notifRow(n) {
    return `<a href="${esc(n.link || '#/notifications')}" class="notif ${n.read ? '' : 'unread'}" data-nid="${n.id}">
      <span class="notif-ic k-${n.kind}">${notifIcon[n.kind] || '🔔'}</span>
      <span class="notif-main"><span class="notif-text">${esc(n.text)}</span><span class="small muted">${timeAgo(n.at)}</span></span>
    </a>`;
  }
  function bindNotifRows(root) {
    root.querySelectorAll('[data-nid]').forEach(a => a.addEventListener('click', () => api.markNotificationsRead(a.dataset.nid)));
  }

  function openClusterPicker() {
    const cur = api.activeClusterId();
    modal('Chọn cụm giao dịch', `
      <p class="muted">Mỗi cụm là một chợ riêng để bạn chỉ thấy đồ ở gần, dễ giao nhận.</p>
      <div class="cluster-choices">
        ${R.clusters.map(c => `<button class="cluster-choice ${c.id === cur ? 'sel' : ''}" data-id="${c.id}">
          <b>📍 ${c.name}</b><span>${c.tagline}</span></button>`).join('')}
      </div>
      ${api.currentUser() ? '<p class="small muted">Đổi cụm sẽ cập nhật trường và khu trọ mặc định trong hồ sơ của bạn.</p>' : ''}`,
    (m, close) => {
      m.querySelectorAll('.cluster-choice').forEach(b => b.onclick = () => {
        api.setActiveCluster(b.dataset.id);
        close();
        toast('Đã chuyển sang cụm ' + R.cluster(b.dataset.id).name, 'ok');
        render();
      });
    });
  }

  // ---------- Trang chủ ----------
  const P = R.pricing;
  let heroTimer = null;
  let maps = [];

  // Thông tin liên hệ người bán: SĐT che bớt (bấm để hiện, như Chợ Tốt) + nút chat
  function sellerContact(u, listingId) {
    const phone = u.phone && u.verified.phone ? u.phone : '';
    return `<div class="contact">
      ${phone ? `<button type="button" class="btn call" data-phone="${esc(phone)}">📞 <span>${esc(phone.slice(0, 4) + ' ' + phone.slice(4, 7))} ***</span><small>Bấm để hiện số</small></button>`
        : '<div class="small muted">Người bán chưa xác thực SĐT – liên hệ qua chat.</div>'}
      ${listingId ? `<button type="button" class="btn primary" data-chat="${listingId}">💬 Chat với người bán</button>` : ''}
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

  // Ô nổi bật: 1 ô lớn bằng 4 ô thường (2×2) kèm liên hệ người bán + 4 tin nổi bật khác
  function featuredBlock(cid) {
    const me = api.currentUser();
    const fs = api.featuredListings(cid);
    const cta = `<a href="#/pricing" class="feat-cta"><span class="pc-ic">⚡</span><b>Vị trí nổi bật còn trống</b><span class="small">Tin của bạn hiển thị ở đây chỉ ${money(P.featured.price)}/${P.featured.days} ngày</span><span class="btn small primary">Đăng ký ngay</span></a>`;
    const head = `<div class="section-head"><h2>⚡ Tin nổi bật</h2><a href="#/pricing">Đưa tin lên đây – ${money(P.featured.price)}/${P.featured.days} ngày →</a></div>`;
    if (!fs.length) return `<section class="section">${head}<div class="featured">${cta}</div></section>`;
    const big = fs[0];
    const small = fs.slice(1, 5);
    const s = api.getUser(big.seller);
    const rt = api.rating(s.id);
    const sold = api.searchListings({ cluster: cid, seller: s.id, includeSold: true }).filter(l => l.status === 'sold').length;
    const mine = me && me.id === s.id;
    return `<section class="section">${head}
      <div class="featured">
        <div class="feat-big">
          <a href="#/item/${big.id}" class="feat-img">
            ${thumb(big, 'feat')}
            <div class="card-badges">${typeBadge[big.type]}${big.combo && big.combo.length ? '<span class="badge b-combo">Combo</span>' : ''}${big.movingSale ? '<span class="badge b-moving">Thanh lý</span>' : ''}</div>
            <span class="badge b-boost corner">⚡ Nổi bật</span>
          </a>
          <div class="feat-body">
            <a href="#/item/${big.id}" class="feat-title">${esc(big.title)}</a>
            <div class="feat-price">${priceLabel(big)}</div>
            <div class="small muted">📍 ${esc(areaName(big.cluster, big.area))} · ~${big.distance} km · ${timeAgo(big.createdAt)}</div>
            ${big.desc ? `<p class="feat-desc">${esc(big.desc)}</p>` : ''}
            <div class="feat-seller">
              <a href="#/user/${s.id}" class="fs-user">${avatar(s, 'lg')}<div><b>${esc(s.name)}</b> ${verifiedBadge(s, true)}<div>${stars(rt.avg, rt.count)}</div><div class="small muted">${esc(s.school)} · ${sold} đã giao dịch</div></div></a>
              ${mine ? '<div class="small muted">Đây là tin của bạn.</div>' : sellerContact(s, big.id)}
            </div>
          </div>
        </div>
        ${small.map(card).join('')}
        ${small.length < 4 ? cta : ''}
      </div>
    </section>`;
  }

  // Quảng cáo banner: 2 bên (màn hình rộng) hoặc dải ngang (màn hình hẹp)
  function adCard(p) {
    return `<a href="#/pricing" class="ad-card" style="background:linear-gradient(160deg,${p.color[0]},${p.color[1]})">
      <span class="ad-tag">Quảng cáo · Đối tác</span><span class="ad-ic">${p.icon}</span>
      <b>${esc(p.ad)}</b><span class="ad-name">${esc(p.name)}</span><span class="ad-phone">☎ ${esc(p.phone)}</span></a>`;
  }
  const adSlot = side => `<a href="#/pricing?banner=${side}" class="ad-slot"><b>🪧 Đặt banner tại đây</b><span>${money(P.banner.price)}/${P.banner.unit}</span><span class="small">160 × 600 px</span></a>`;
  function renderSideAds(show) {
    const cid = api.activeClusterId();
    const ps = R.partners.filter(p => p.cluster === cid && p.ad);
    document.getElementById('adLeft').innerHTML = show ? (ps[0] ? adCard(ps[0]) : '') + adSlot('left') : '';
    document.getElementById('adRight').innerHTML = show ? (ps[1] ? adCard(ps[1]) : '') + adSlot('right') : '';
  }
  function inlineAds(cid) {
    const ps = R.partners.filter(p => p.cluster === cid && p.ad);
    return `<div class="inline-ads">${ps.slice(0, 2).map(adCard).join('')}${adSlot('left')}</div>`;
  }

  // ---------- Bản đồ (Leaflet + OpenStreetMap) ----------
  function listingLatLng(l) {
    const a = R.area(l.cluster, l.area);
    if (!a || a.lat == null) return null;
    let h = 7; for (const ch of String(l.id)) h = (h * 131 + ch.charCodeAt(0)) % 1000003;
    return [a.lat + ((h % 97) / 97 - 0.5) * 0.004, a.lng + ((Math.floor(h / 97) % 89) / 89 - 0.5) * 0.004];
  }
  const gMapsEmbed = (q, z) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${z || 14}&hl=vi&output=embed`;
  const gMapsLink = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  function mountMap(el, clusterId, listings, opts) {
    if (!el) return null;
    if (!window.L) { el.innerHTML = '<div class="map-fallback">🗺 Không tải được bản đồ – kiểm tra kết nối Internet.</div>'; return null; }
    opts = opts || {};
    const cl = R.cluster(clusterId);
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
        .bindPopup(`<a href="#/item/${l.id}" class="map-pop"><b>${esc(l.title)}</b><br>${priceLabel(l)}<br><small>📍 ${esc(areaName(l.cluster, l.area))}</small></a>`);
    });
    if (opts.single) L.circle(opts.center, { radius: 300, color: '#0f8a5f', weight: 1, fillOpacity: 0.1 }).addTo(map);
    maps.push(map);
    return map;
  }

  function viewHome() {
    const me = api.currentUser();
    const cid = api.activeClusterId();
    const cl = R.cluster(cid);
    const st = api.stats(cid);
    const near = api.searchListings({ sort: 'priority' }).slice(0, 6);
    const fresh = api.searchListings({ sort: 'new' }).slice(0, 6);
    const free = api.searchListings({ type: 'free', sort: 'near' }).slice(0, 4);
    const movers = api.movingSellers(cid);
    const pending = me ? api.pendingReviews() : [];
    const all = api.searchListings({});
    const recent = api.recentReviews(cid, 6);

    const slides = [
      ['s-green', `<h1>Đồ cũ sinh viên <span class="hl">${esc(cl.name)}</span>,<br>mua gần – bán nhanh – tặng dễ.</h1>
        <p class="lead">Bán, trao đổi và cho tặng đồ dùng giữa sinh viên cùng trường, cùng khu trọ. Gặp trực tiếp, kiểm tra tận tay rồi mới trả tiền.</p>
        <div class="hero-stats">
          <div><b>${st.active}</b><span>tin đang đăng</span></div>
          <div><b>${st.free}</b><span>món cho tặng</span></div>
          <div><b>${st.verifiedUsers}</b><span>SV đã xác thực</span></div>
          <div><b>${st.done}</b><span>giao dịch xong</span></div>
        </div>`],
      ['s-orange', `<span class="slide-tag">Gói đăng tin</span><h2>${P.freePosts} tin đầu mỗi tháng miễn phí</h2>
        <p class="lead">Cần đăng nhiều hơn? Chỉ <b>${money(P.extraPosts.price)} cho ${P.extraPosts.posts} tin</b>.</p><a href="#/post" class="btn light">+ Đăng tin ngay</a>`],
      ['s-purple', `<span class="slide-tag">Tin nổi bật</span><h2>Lên ô lớn trang chủ chỉ ${money(P.featured.price)}/${P.featured.days} ngày</h2>
        <p class="lead">Hiển thị kèm số điện thoại của bạn, ưu tiên đầu kết quả tìm kiếm. Đẩy tin chỉ ${money(P.bump.price)}/lượt.</p><a href="#/pricing" class="btn light">Xem bảng giá</a>`],
      ['s-red', `<span class="slide-tag">Thanh lý chuyển trọ</span><h2>Sắp chuyển phòng hay ra trường?</h2>
        <p class="lead">Đăng cả combo đồ phòng, người mua ngay gần qua lấy – không phải vận chuyển, không phải bỏ lại.</p><a href="#/moving" class="btn light">📦 Vào khu thanh lý</a>`],
    ];
    const byArea = {};
    all.forEach(l => { byArea[l.area] = (byArea[l.area] || 0) + 1; });

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
            <div class="small">${esc(me.school)} · ${esc(areaName(me.cluster, me.area))}</div>${verifiedBadge(me)}</div></div>
            ${!me.verified.student ? '<a href="#/me?tab=account" class="notice warn">Xác thực sinh viên để tăng độ tin cậy cho tin đăng của bạn →</a>' : ''}
            ${pending.length ? `<a href="#/reviews" class="notice">⭐ Bạn có ${pending.length} giao dịch chưa đánh giá →</a>` : ''}
            ${(() => { const q = api.quota(); return `<div class="small muted">📝 Còn <b>${q.freeLeft}/${P.freePosts}</b> tin miễn phí tháng này${q.credits ? ` · ${q.credits} lượt đã mua` : ''}</div>`; })()}
            <a href="#/post" class="btn primary block">+ Đăng tin mới</a>
            <a href="#/moving" class="btn ghost block">📦 Tôi sắp chuyển trọ</a>`
          : `<h3>Bắt đầu trong 1 phút</h3>
            <ol class="steps-mini"><li>Đăng ký, chọn cụm ${esc(cl.name)}</li><li>Xác thực sinh viên</li><li>Đăng ${P.freePosts} tin miễn phí mỗi tháng</li></ol>
            <a href="#/register" class="btn primary block">Tạo tài khoản</a>
            <a href="#/login" class="btn ghost block">Đăng nhập</a>`}
        </div>
      </section>

      <section class="cats">
        ${R.categories.map(c => `<a href="#/search${qs({ cat: c.id })}" class="cat"><span class="cat-ic" style="background:${c.color[0]}">${c.icon}</span><span>${c.name}</span></a>`).join('')}
        <a href="#/search${qs({ type: 'free' })}" class="cat"><span class="cat-ic" style="background:#d1fae5">🎁</span><span>Cho tặng</span></a>
        <a href="#/search${qs({ type: 'trade' })}" class="cat"><span class="cat-ic" style="background:#fef3c7">🔁</span><span>Trao đổi</span></a>
      </section>

      ${movers.length ? `<a href="#/moving" class="moving-banner">
        <div><b>📦 ${movers.length} bạn đang thanh lý chuyển trọ</b>
        <div>Mua theo combo rẻ hơn mua lẻ · Người gần nhất chuyển đi trong ${timeLeft(movers[0].user.moving.date)}</div></div>
        <span class="btn light">Xem ngay →</span></a>` : ''}

      ${featuredBlock(cid)}

      ${inlineAds(cid)}

      <div class="duo">
        <section class="section">
          <div class="section-head"><h2>📍 Gợi ý gần bạn</h2><a href="#/search${qs({ sort: 'priority' })}">Xem tất cả →</a></div>
          <p class="muted small sub">Ưu tiên tin nổi bật, cùng khu trọ, cùng trường và khoảng cách gần.</p>
          ${grid(near)}
        </section>
        <section class="section">
          <div class="section-head"><h2>🆕 Mới đăng</h2><a href="#/search${qs({ sort: 'new' })}">Xem tất cả →</a></div>
          <p class="muted small sub">Tin vừa đăng hoặc vừa được đẩy lên trong cụm ${esc(cl.name)}.</p>
          ${grid(fresh)}
        </section>
      </div>

      <section class="section">
        <div class="section-head"><h2>🗺 Bản đồ đồ cũ khu ${esc(cl.name)}</h2><span class="small muted">${esc(cl.address || '')}</span></div>
        <div class="map-wrap">
          <div class="map-main">
            <div class="seg map-tabs">
              <label><input type="radio" name="mapTab" value="list" checked><span>📍 Tin đăng trên bản đồ</span></label>
              <label><input type="radio" name="mapTab" value="google"><span>🌏 Google Maps</span></label>
            </div>
            <div id="homeMap" class="map"></div>
            <iframe id="gMap" class="map gmap" hidden title="Google Maps khu ${esc(cl.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
          </div>
          <aside class="map-side">
            <b>Khu trọ / KTX</b>
            ${cl.areas.map(a => `<button class="area-row" data-area="${a.id}"><span>📍 ${esc(a.name)}</span><span class="count">${byArea[a.id] || 0} tin</span></button>`).join('')}
            <a id="gMapLink" class="btn ghost block small" href="${gMapsLink(cl.address || cl.name)}" target="_blank" rel="noopener">Mở trong Google Maps ↗</a>
            <p class="small muted">Vị trí trên bản đồ là gần đúng theo khu vực, không phải địa chỉ chính xác của người bán.</p>
          </aside>
        </div>
      </section>

      ${free.length ? `<section class="section">
        <div class="section-head"><h2>🎁 Cho tặng miễn phí</h2><a href="#/search${qs({ type: 'free' })}">Xem tất cả →</a></div>
        ${grid(free)}
      </section>` : ''}

      ${recent.length ? `<section class="section">
        <div class="section-head"><h2>⭐ Đánh giá người bán gần đây</h2><a href="#/reviews">Đánh giá của bạn →</a></div>
        <p class="muted small sub">Người mua và người bán chấm điểm nhau sau mỗi giao dịch – xem ai uy tín trước khi hẹn gặp.</p>
        <div class="rev-strip">${recent.map(r => {
          const a = api.getUser(r.from), b = api.getUser(r.to);
          const item = reviewItem(r);
          return `<a href="#/user/${b.id}" class="rev-card"><div class="rev-top">${avatar(a, 'sm')}<span class="small"><b>${esc(a.name)}</b> → ${esc(b.name)}</span></div>
            <span class="stars">${'★'.repeat(r.stars)}<span class="off">${'★'.repeat(5 - r.stars)}</span></span><p>“${esc(r.text)}”</p>
            ${item ? `<span class="rev-item small">🛍 Giao dịch: ${esc(item)}</span>` : ''}<span class="small muted">${timeAgo(r.createdAt)}</span></a>`;
        }).join('')}</div>
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h2>💎 Gói dịch vụ</h2><a href="#/pricing">Xem bảng giá chi tiết →</a></div>
        ${pricingCards()}
      </section>

      <section class="section how">
        <h2>Sàn hoạt động thế nào?</h2>
        <div class="how-grid">
          ${[
            ['📝', 'Đăng ký & chọn cụm', 'Chọn Hòa Lạc hoặc Cầu Giấy, xác thực email/thẻ sinh viên.'],
            ['📸', 'Đăng tin chuẩn', `Ảnh, giá, tình trạng, vị trí. ${P.freePosts} tin miễn phí mỗi tháng.`],
            ['🔎', 'Tìm đồ gần', 'Lọc theo trường, khu trọ, danh mục, giá, xem trên bản đồ.'],
            ['💬', 'Nhắn tin & đặt giữ', 'Thương lượng, đặt giữ và hẹn điểm gặp công khai.'],
            ['🤝', 'Gặp & kiểm tra', 'Xem hàng tận tay rồi mới trả tiền.'],
            ['⭐', 'Đánh giá nhau', 'Cập nhật đã giao dịch và đánh giá để xây dựng uy tín.'],
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

    const cid = api.activeClusterId();
    const cl = R.cluster(cid);
    const map = mountMap(document.getElementById('homeMap'), cid, api.searchListings({}));
    // Google Maps nhúng (iframe, không cần API key) — chỉ tải khi mở tab
    const gMap = document.getElementById('gMap');
    const gLink = document.getElementById('gMapLink');
    let gQuery = { q: cl.address || cl.name, z: 14 };
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
      const a = R.area(cid, b.dataset.area);
      setG(`${a.lat},${a.lng}`, 16);
      if (map) map.flyTo([a.lat, a.lng], 16);
      else if (gMap.hidden) go('/search' + qs({ area: a.id }));
    });
  }

  // ---------- Bảng giá & thanh toán ----------
  function pricingCards() {
    const items = [
      ['📝', 'Đăng thêm tin', money(P.extraPosts.price), `/ ${P.extraPosts.posts} tin`, `${P.freePosts} tin đầu mỗi tháng miễn phí. Từ tin thứ ${P.freePosts + 1}, mua thêm theo gói.`, 'posts', 'Mua gói'],
      ['🔝', 'Đẩy tin', money(P.bump.price), '/ lượt', 'Làm mới tin, đưa bài lên vị trí đầu mục “Mới đăng”.', 'bump', 'Chọn tin để đẩy'],
      ['⚡', 'Tin nổi bật', money(P.featured.price), `/ ${P.featured.days} ngày`, 'Ô lớn trang chủ kèm thông tin liên hệ, ưu tiên đầu kết quả tìm kiếm.', 'featured', 'Chọn tin'],
      ['🏪', 'Đối tác cửa hàng', money(P.partner.price), `/ ${P.partner.unit}`, 'Gắn nhãn đối tác, hiển thị cửa hàng/dịch vụ quanh khu trọ trong mục Đối tác.', 'partner', 'Đăng ký'],
      ['🪧', 'Banner 2 bên', money(P.banner.price), `/ ${P.banner.unit}`, 'Banner dọc 160×600 hai bên trang chủ, tìm kiếm và chi tiết tin.', 'banner', 'Đặt banner'],
    ];
    return `<div class="price-grid">${items.map(([ic, t, pr, unit, d, k, btn]) => `<div class="price-card ${k === 'featured' ? 'best' : ''}">
      ${k === 'featured' ? '<em>Phổ biến</em>' : ''}<div class="pc-ic">${ic}</div><b>${t}</b>
      <div><span class="price">${pr}</span> <span class="muted small">${unit}</span></div>
      <p class="small muted">${d}</p>
      <button class="btn ${k === 'featured' ? 'primary' : 'ghost'} block small" data-buy="${k}">${btn}</button></div>`).join('')}</div>`;
  }

  function openCheckout(desc, amount, onPaid) {
    modal('💳 Thanh toán', `
      <div class="checkout-sum"><span>${esc(desc)}</span><b class="price">${money(amount)}</b></div>
      <div class="radio-list">${['Ví MoMo', 'ZaloPay', 'VNPay QR', 'Chuyển khoản ngân hàng'].map((m, i) => `<label class="radio-row"><input type="radio" name="method" value="${m}" ${i ? '' : 'checked'}> ${m}</label>`).join('')}</div>
      <button class="btn primary block" id="payBtn">Thanh toán ${money(amount)}</button>
      <p class="small muted">* Thanh toán mô phỏng, không trừ tiền thật.</p>`, (m, close) => {
      const btn = m.querySelector('#payBtn');
      btn.onclick = () => {
        const method = m.querySelector('input[name=method]:checked').value;
        btn.disabled = true; btn.textContent = 'Đang xử lý...';
        setTimeout(() => {
          close();
          try { onPaid(method); } catch (e) { toast(e.message, 'err'); }
        }, 700);
      };
    });
  }
  function openBuyPosts(after) {
    openCheckout(`Gói thêm ${P.extraPosts.posts} tin đăng`, P.extraPosts.price, method => {
      api.pay('posts', { method });
      toast(`Đã thêm ${P.extraPosts.posts} lượt đăng tin`, 'ok');
      if (after) after();
    });
  }
  function openServices(l) {
    modal('💎 Dịch vụ cho tin đăng', `
      <p class="muted">“<b>${esc(l.title)}</b>”</p>
      <div class="plans">
        <button class="plan" data-kind="bump"><b>🔝 Đẩy tin</b><span class="price">${money(P.bump.price)}</span><span class="small muted">/ lượt</span><span class="small">Làm mới tin, đưa lên đầu mục “Mới đăng”</span></button>
        <button class="plan best" data-kind="featured"><em>Hiệu quả nhất</em><b>⚡ Tin nổi bật</b><span class="price">${money(P.featured.price)}</span><span class="small muted">/ ${P.featured.days} ngày</span><span class="small">Ô lớn trang chủ kèm SĐT, ưu tiên đầu kết quả tìm kiếm</span></button>
      </div>
      ${l.boosted ? `<p class="small">Tin đang nổi bật thêm ${timeLeft(l.boostUntil)} — mua thêm sẽ cộng dồn.</p>` : ''}`, (m, close) => {
      m.querySelectorAll('.plan').forEach(b => b.onclick = () => {
        const kind = b.dataset.kind;
        close();
        openCheckout(kind === 'bump' ? 'Đẩy tin 1 lượt' : `Tin nổi bật ${P.featured.days} ngày`, P[kind].price, method => {
          api.pay(kind, { listingId: l.id, method });
          toast(kind === 'bump' ? 'Đã đẩy tin lên đầu 🔝' : 'Tin đã lên mục nổi bật ⚡', 'ok');
          render();
        });
      });
    });
  }
  function pickListing(kind) {
    const me = api.currentUser();
    const ls = api.searchListings({ cluster: me.cluster, seller: me.id, sort: 'new' });
    if (!ls.length) { toast('Bạn chưa có tin nào đang đăng.', 'err'); go('/post'); return; }
    modal(kind === 'bump' ? '🔝 Chọn tin để đẩy' : '⚡ Chọn tin nổi bật', `
      <div class="radio-list">${ls.map((l, i) => `<label class="radio-row"><input type="radio" name="lid" value="${l.id}" ${i ? '' : 'checked'}> <span class="grow ellipsis">${esc(l.title)}</span>${l.boosted ? '<span class="badge b-boost">⚡</span>' : ''}</label>`).join('')}</div>
      <button class="btn primary block" id="pickBtn">Tiếp tục</button>`, (m, close) => {
      m.querySelector('#pickBtn').onclick = () => {
        const id = m.querySelector('input[name=lid]:checked').value;
        close();
        openServicesDirect(kind, api.getListing(id));
      };
    });
  }
  function openServicesDirect(kind, l) {
    openCheckout((kind === 'bump' ? 'Đẩy tin 1 lượt' : `Tin nổi bật ${P.featured.days} ngày`) + ` – ${l.title}`, P[kind].price, method => {
      api.pay(kind, { listingId: l.id, method });
      toast(kind === 'bump' ? 'Đã đẩy tin lên đầu 🔝' : 'Tin đã lên mục nổi bật ⚡', 'ok');
      render();
    });
  }
  function openAdForm(kind, side) {
    const isBanner = kind === 'banner';
    modal(isBanner ? '🪧 Đặt banner 2 bên' : '🏪 Đăng ký đối tác cửa hàng', `
      <form id="adForm" class="form">
        <label>Tên cửa hàng / dịch vụ<input name="shop" required placeholder="VD: Sửa xe Tân Xã"></label>
        <label>Số điện thoại liên hệ<input name="phone" required pattern="0[0-9 ]{9,12}" placeholder="09xxxxxxxx"></label>
        ${isBanner ? `<div class="row2">
          <label>Vị trí<select name="side"><option value="left" ${side === 'right' ? '' : 'selected'}>Bên trái</option><option value="right" ${side === 'right' ? 'selected' : ''}>Bên phải</option></select></label>
          <label>Thời gian<select name="weeks"><option value="1">1 tuần</option><option value="2">2 tuần</option><option value="4">4 tuần</option></select></label>
        </div>` : ''}
        <div class="checkout-sum"><span>Tổng</span><b class="price" id="adTotal">${money(isBanner ? P.banner.price : P.partner.price)}</b></div>
        <button class="btn primary block">Tiếp tục thanh toán</button>
      </form>`, (m, close) => {
      const f = m.querySelector('#adForm');
      if (isBanner) f.weeks.onchange = () => { m.querySelector('#adTotal').textContent = money(P.banner.price * Number(f.weeks.value)); };
      f.onsubmit = e => {
        e.preventDefault();
        const opts = { shop: f.shop.value.trim(), phone: f.phone.value.trim(), side: isBanner ? f.side.value : '', weeks: isBanner ? Number(f.weeks.value) : 0 };
        const amount = isBanner ? P.banner.price * opts.weeks : P.partner.price;
        close();
        openCheckout(isBanner ? `Banner ${opts.side === 'right' ? 'bên phải' : 'bên trái'} ${opts.weeks} tuần` : 'Gói đối tác cửa hàng 1 tháng', amount, method => {
          api.pay(kind, Object.assign(opts, { method }));
          toast('Đã nhận đăng ký! Banner/nhãn đối tác sẽ được duyệt trong 24 giờ.', 'ok');
          renderHeader();
        });
      };
    });
  }
  function bindBuy(root) {
    root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      if (!requireLogin('Đăng nhập để mua gói dịch vụ.')) return;
      const k = b.dataset.buy;
      if (k === 'posts') openBuyPosts(render);
      else if (k === 'bump' || k === 'featured') pickListing(k);
      else openAdForm(k);
    });
  }

  function viewPricing() {
    const me = api.currentUser();
    const q = me ? api.quota() : null;
    return `<div class="container page">
      <div class="pricing-hero">
        <h1>💎 Bảng giá dịch vụ</h1>
        <p class="muted">Đăng tin cơ bản luôn miễn phí. Các gói trả phí giúp tin của bạn được nhiều người thấy hơn.</p>
        ${q ? `<div class="notice">📝 Tháng này bạn còn <b>${q.freeLeft}/${P.freePosts}</b> tin miễn phí · <b>${q.credits}</b> lượt đã mua · <a href="#/me?tab=payments">Lịch sử thanh toán</a></div>` : ''}
      </div>
      ${pricingCards()}
      <section class="section panel">
        <h3>So sánh hiển thị</h3>
        <table class="pay-table">
          <tr><th></th><th>Tin thường</th><th>Đẩy tin</th><th>Tin nổi bật</th></tr>
          <tr><td>Giá</td><td>Miễn phí (${P.freePosts} tin/tháng)</td><td>${money(P.bump.price)}/lượt</td><td>${money(P.featured.price)}/${P.featured.days} ngày</td></tr>
          <tr><td>Vị trí trong “Mới đăng”</td><td>Theo thời gian đăng</td><td>✔ Lên đầu ngay</td><td>Theo thời gian đăng</td></tr>
          <tr><td>Ô lớn trang chủ kèm SĐT</td><td>—</td><td>—</td><td>✔</td></tr>
          <tr><td>Ưu tiên đầu kết quả tìm kiếm</td><td>—</td><td>—</td><td>✔</td></tr>
          <tr><td>Nhãn ⚡ Nổi bật</td><td>—</td><td>—</td><td>✔</td></tr>
        </table>
      </section>
      <section class="section two-col">
        <div class="panel"><h3>🏪 Dành cho cửa hàng & dịch vụ</h3>
          <p class="muted small">Cửa hàng sửa đồ, chuyển trọ, vệ sinh phòng, thu mua đồ cũ quanh Hòa Lạc có thể đăng ký gói đối tác (${money(P.partner.price)}/${P.partner.unit}) hoặc đặt banner hai bên trang (${money(P.banner.price)}/${P.banner.unit}).</p>
          <div class="btn-row"><button class="btn primary" data-buy="partner">Đăng ký đối tác</button><button class="btn ghost" data-buy="banner">Đặt banner</button></div>
        </div>
        <div class="panel"><h3>❓ Câu hỏi thường gặp</h3>
          <p class="small"><b>Tin miễn phí tính thế nào?</b> Mỗi tài khoản được ${P.freePosts} tin mới mỗi tháng dương lịch. Sửa tin không tốn lượt.</p>
          <p class="small"><b>Lượt mua thêm có hết hạn không?</b> Không, dùng khi nào hết lượt miễn phí.</p>
          <p class="small"><b>Gia hạn tin nổi bật?</b> Mua thêm sẽ cộng dồn thời gian. Bạn được thông báo khi còn dưới 24 giờ.</p>
        </div>
      </section>
    </div>`;
  }
  function mountPricing(q) {
    bindBuy($app);
    if (q.banner && requireLogin('Đăng nhập để đặt banner.')) openAdForm('banner', q.banner);
  }

  // ---------- Thông báo ----------
  function viewNotifications(q) {
    if (!api.currentUser()) return loginWall('Đăng nhập để xem thông báo.');
    const f = q.f || '';
    const all = api.notifications();
    const ns = f ? all.filter(n => n.kind === f) : all;
    const filters = [['', 'Tất cả'], ['deal', '📌 Giao dịch'], ['review', '⭐ Đánh giá'], ['pay', '💳 Thanh toán'], ['system', '📣 Hệ thống']];
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

  // ---------- Đánh giá ----------
  function viewReviews(q) {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập để xem và viết đánh giá.');
    const pending = api.pendingReviews();
    const received = api.reviewsFor(me.id);
    const written = api.reviewsBy(me.id);
    const tab = q.tab || (pending.length ? 'pending' : 'received');
    const rt = api.rating(me.id);
    const tabs = [['pending', 'Chờ đánh giá', pending.length], ['received', 'Đánh giá về tôi', received.length], ['written', 'Tôi đã đánh giá', written.length]];
    let body;
    if (tab === 'pending') {
      body = pending.length ? `<div class="rows">${pending.map(p => `
        <div class="row-item"><a href="#/item/${p.listing.id}" class="row-thumb">${thumb(p.listing)}</a>
          <div class="row-main"><b>${esc(p.listing.title)}</b><div class="small muted">${p.listing.seller === me.id ? 'Người mua' : 'Người bán'}: ${esc(p.other.name)} · Giao dịch ${p.listing.soldAt ? timeAgo(p.listing.soldAt) : ''}</div></div>
          <div class="row-actions"><button class="btn primary small" data-review="${p.listing.id}" data-to="${p.other.id}">⭐ Đánh giá</button></div></div>`).join('')}</div>`
        : '<div class="empty">Không có giao dịch nào chờ đánh giá 🎉</div>';
    } else if (tab === 'received') body = reviewList(received);
    else body = reviewList(written, true);
    return `<div class="container page">
      <h1>⭐ Đánh giá</h1>
      <div class="rev-summary panel">
        <div class="rev-avg"><b>${rt.count ? rt.avg.toFixed(1) : '–'}</b>${stars(rt.avg, rt.count)}<span class="small muted">${rt.count} đánh giá về bạn</span></div>
        <div class="rev-bars">${[5, 4, 3, 2, 1].map(n => { const c = received.filter(r => r.stars === n).length; return `<div class="bar-row"><span>${n}★</span><div class="bar"><i style="width:${received.length ? c / received.length * 100 : 0}%"></i></div><span class="small muted">${c}</span></div>`; }).join('')}</div>
        <p class="small muted rev-tip">Đánh giá sau mỗi giao dịch giúp cộng đồng biết ai uy tín. Người bán có nhiều đánh giá tốt sẽ được người mua tin tưởng hơn.</p>
      </div>
      <div class="tabs">${tabs.map(([k, t, n]) => `<a href="#/reviews?tab=${k}" class="${k === tab ? 'active' : ''}">${t}${n ? ` <span class="count">${n}</span>` : ''}</a>`).join('')}</div>
      <div class="tab-body">${body}</div>
    </div>`;
  }
  function mountReviews() {
    document.querySelectorAll('[data-review]').forEach(b => b.onclick = () => openReview(b.dataset.review, b.dataset.to));
  }

  // ---------- Tìm kiếm ----------
  function viewSearch(q) {
    const cid = api.activeClusterId();
    const cl = R.cluster(cid);
    const rs = api.searchListings(q);
    const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(cur || '') === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
    const activeCount = ['cat', 'type', 'min', 'max', 'school', 'area', 'dist', 'cond', 'moving'].filter(k => q[k]).length;

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
            <label>Trường<select name="school">${opt('', 'Tất cả trường', q.school)}${cl.schools.map(s => opt(s, s, q.school)).join('')}</select></label>
            <label>Khu trọ / KTX<select name="area">${opt('', 'Tất cả khu vực', q.area)}${cl.areas.map(a => opt(a.id, a.name, q.area)).join('')}</select></label>
            <label>Khoảng cách tối đa<select name="dist">${opt('', 'Không giới hạn', q.dist)}${[1, 2, 3, 5].map(d => opt(d, 'Trong ' + d + ' km', q.dist)).join('')}</select></label>
            <label>Tình trạng<select name="cond">${opt('', 'Mọi tình trạng', q.cond)}${R.conditions.map(c => opt(c, c, q.cond)).join('')}</select></label>
            <label class="check"><input type="checkbox" name="moving" value="1" ${q.moving ? 'checked' : ''}> Chỉ đồ thanh lý chuyển trọ</label>
            <input type="hidden" name="sort" value="${esc(q.sort || '')}">
            <button class="btn primary block">Áp dụng</button>
          </form>
        </aside>
        <section>
          <div class="results-head">
            <div><h2>${q.q ? `Kết quả cho “${esc(q.q)}”` : 'Tất cả tin đăng'}</h2><div class="muted small">${rs.length} tin tại cụm ${esc(cl.name)}</div></div>
            <div class="results-tools">
              <button class="btn ghost show-sm" id="toggleFilters">⚙ Lọc${activeCount ? ` (${activeCount})` : ''}</button>
              <select id="sortSel">
                ${opt('priority', 'Phù hợp nhất', q.sort || 'priority')}${opt('near', 'Gần nhất', q.sort)}${opt('new', 'Mới nhất', q.sort)}${opt('priceAsc', 'Giá thấp → cao', q.sort)}${opt('priceDesc', 'Giá cao → thấp', q.sort)}
              </select>
            </div>
          </div>
          ${grid(rs, 'Không tìm thấy tin phù hợp. Thử bỏ bớt bộ lọc hoặc <a href="#/post">đăng tin cần mua</a>.')}
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
    f.querySelectorAll('input[type=radio], select, input[type=checkbox]').forEach(el => el.onchange = submit);
    f.querySelectorAll('.chip').forEach(c => c.onclick = () => { f.min.value = c.dataset.min; f.max.value = c.dataset.max; submit(); });
    document.getElementById('sortSel').onchange = e => go('/search' + qs(Object.assign({}, q, { sort: e.target.value })));
    document.getElementById('toggleFilters').onclick = () => document.getElementById('filters').classList.toggle('open');
  }

  // ---------- Chi tiết tin ----------
  function viewItem(id) {
    const l = api.getListing(id, true);
    if (!l) return notFound('Tin đăng không tồn tại hoặc đã bị xóa.');
    const me = api.currentUser();
    const seller = api.getUser(l.seller);
    const rt = api.rating(seller.id);
    const cat = R.category(l.cat);
    const mine = me && me.id === l.seller;
    const reservedByMe = me && l.reservedBy === me.id;
    const similar = api.searchListings({ cluster: l.cluster, cat: l.cat, exclude: l.id }).slice(0, 4);
    const comboSum = l.combo ? l.combo.reduce((s, i) => s + Number(i.price || 0), 0) : 0;
    const imgs = l.images && l.images.length ? l.images : [null];

    let actions = '';
    if (mine) {
      actions = `<a href="#/post?edit=${l.id}" class="btn ghost">✏ Sửa tin</a>
        ${l.status !== 'sold' ? `<button class="btn primary" data-act="sold">✔ Đánh dấu đã giao dịch</button>` : `<button class="btn ghost" data-act="reopen">↺ Mở bán lại</button>`}
        ${l.status === 'reserved' ? `<button class="btn ghost" data-act="unreserve">Hủy giữ chỗ</button>` : ''}
        ${l.status !== 'sold' ? `<button class="btn boost" data-act="boost">⚡ Đẩy tin / Tin nổi bật</button>` : ''}`;
    } else if (l.status === 'sold') {
      actions = `<div class="notice">Sản phẩm này đã được giao dịch.</div>`;
    } else {
      actions = `<button class="btn primary" data-act="chat">💬 Nhắn tin người bán</button>
        ${l.status === 'available' ? `<button class="btn ghost" data-act="reserve">📌 Đặt giữ</button>` : ''}
        ${reservedByMe ? `<button class="btn ghost" data-act="unreserve">Hủy đặt giữ</button>` : ''}`;
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
              <div><span>Trường</span><b>${esc(l.school || '—')}</b></div>
              <div><span>Khu vực</span><b>${esc(areaName(l.cluster, l.area))} (${R.cluster(l.cluster).name})</b></div>
              <div><span>Khoảng cách</span><b>~${l.distance} km</b></div>
            </div>
            ${l.type === 'trade' ? `<div class="notice trade">🔁 <b>Muốn đổi lấy:</b> ${esc(l.tradeFor)}</div>` : ''}
          </div>

          <div class="panel">
            <h3>🗺 Khu vực giao dịch</h3>
            <p class="small muted">📍 ${esc(areaName(l.cluster, l.area))}, ${esc(R.cluster(l.cluster).address || R.cluster(l.cluster).name)} · Vị trí gần đúng – hãy hẹn gặp ở nơi công cộng. <a href="${gMapsLink((R.area(l.cluster, l.area) || {}).lat + ',' + (R.area(l.cluster, l.area) || {}).lng)}" target="_blank" rel="noopener">Xem trên Google Maps ↗</a></p>
            <div id="itemMap" class="map sm"></div>
          </div>

          <div class="panel">
            <div class="section-head"><h3>⭐ Đánh giá về người bán</h3><a href="#/user/${seller.id}" class="small">Xem tất cả (${rt.count}) →</a></div>
            ${reviewList(api.reviewsFor(seller.id).slice(0, 3))}
          </div>

          ${l.combo && l.combo.length ? `<div class="panel">
            <h3>📦 Combo gồm ${l.combo.length} món</h3>
            <table class="combo-table">
              ${l.combo.map(i => `<tr><td>${esc(i.name)}</td><td class="r muted">${money(i.price)}</td></tr>`).join('')}
              <tr class="sum"><td>Tổng mua lẻ</td><td class="r"><s>${money(comboSum)}</s></td></tr>
              <tr class="sum"><td><b>Giá combo</b></td><td class="r"><b class="price">${money(l.price)}</b>${comboSum > l.price ? ` <span class="badge b-free">Tiết kiệm ${money(comboSum - l.price)}</span>` : ''}</td></tr>
            </table>
          </div>` : ''}
          </div>

        <aside class="item-side">
          <div class="panel">
            <div class="item-badges">${typeBadge[l.type]}${l.movingSale ? '<span class="badge b-moving">Thanh lý chuyển trọ</span>' : ''}${l.boosted ? '<span class="badge b-boost">⚡ Nổi bật</span>' : ''}</div>
            <h1 class="item-title">${esc(l.title)}</h1>
            <div class="item-price">${priceLabel(l)}</div>
            <div class="muted small">📍 ${esc(areaName(l.cluster, l.area))} · ~${l.distance} km · Đăng ${timeAgo(l.createdAt)} · 👁 ${l.views}</div>
            ${l.status === 'reserved' ? `<div class="notice warn">📌 ${reservedByMe ? 'Bạn đang' : 'Đang có người'} giữ sản phẩm này · còn ${timeLeft(l.reservedUntil)}${(reservedByMe || mine) && l.meetPoint ? `<br>Điểm hẹn: <b>${esc(l.meetPoint)}</b>` : ''}</div>` : ''}
            <div class="item-actions">${actions}</div>
            ${!mine ? `<button class="link-btn small" data-act="report">🚩 Báo cáo tin đăng</button>` : ''}
          </div>

          <div class="panel">
            <a class="seller" href="#/user/${seller.id}">
              ${avatar(seller, 'lg')}
              <div>
                <b>${esc(seller.name)}</b>
                <div>${verifiedBadge(seller)}</div>
                <div>${stars(rt.avg, rt.count)}</div>
                <div class="small muted">${esc(seller.school)} · Tham gia ${fmtDate(seller.joinedAt)}</div>
              </div>
            </a>
            ${mine ? '' : sellerContact(seller)}
          </div>

          <div class="panel safety">
            <b>🛡 Giao dịch an toàn</b>
            <ul>
              <li>Hẹn gặp ở nơi công cộng: cổng trường, thư viện, căng tin.</li>
              <li>Kiểm tra kỹ hàng rồi mới trả tiền.</li>
              <li>Không chuyển khoản đặt cọc cho người lạ.</li>
              <li>Ưu tiên người bán đã xác thực sinh viên.</li>
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
      reserve: () => { if (requireLogin('Đăng nhập để đặt giữ.')) openReserve(l); },
      unreserve: guard(() => { if (!confirm('Hủy giữ chỗ sản phẩm này?')) return; api.cancelReservation(id); toast('Đã hủy giữ chỗ'); render(); }),
      sold: () => openMarkSold(l),
      reopen: guard(() => { api.reopen(id); toast('Tin đã mở bán lại', 'ok'); render(); }),
      boost: () => openServices(l),
      report: () => openReport(l),
    };
    document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act[b.dataset.act]());
    bindContact($app);
    const ll = listingLatLng(l);
    if (ll) mountMap(document.getElementById('itemMap'), l.cluster, [l], { center: ll, zoom: 15, single: true });
  }

  function openReserve(l) {
    const cl = R.cluster(l.cluster);
    modal('Đặt giữ sản phẩm', `
      <p class="muted">Người bán sẽ giữ “<b>${esc(l.title)}</b>” cho bạn trong thời gian đã chọn. Hết hạn mà chưa gặp, tin sẽ tự mở bán lại.</p>
      <form id="resForm" class="form">
        <label>Điểm gặp đề xuất
          <select name="meet">${cl.meetPoints.map(p => `<option>${esc(p)}</option>`).join('')}<option value="__other">Khác...</option></select>
        </label>
        <label id="otherWrap" hidden>Điểm gặp khác<input name="other" placeholder="VD: Cổng KTX dãy A"></label>
        <label>Giữ trong
          <div class="seg">${[[6, '6 giờ'], [24, '24 giờ'], [48, '48 giờ']].map(([v, t], i) => `<label><input type="radio" name="hours" value="${v}" ${i === 1 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        </label>
        <button class="btn primary block">Xác nhận đặt giữ</button>
      </form>`, (m, close) => {
      const f = m.querySelector('#resForm');
      f.meet.onchange = () => { m.querySelector('#otherWrap').hidden = f.meet.value !== '__other'; };
      f.onsubmit = guard(e => {
        e.preventDefault();
        const meet = f.meet.value === '__other' ? f.other.value.trim() : f.meet.value;
        if (!meet) throw new Error('Nhập điểm gặp.');
        api.reserve(l.id, meet, Number(f.hours.value));
        close();
        toast('Đã đặt giữ! Người bán đã nhận được tin nhắn.', 'ok');
        render();
      });
    });
  }

  function openMarkSold(l) {
    // Ứng viên người mua: người đang giữ + những người đã nhắn tin về tin này
    const convs = api.conversations().filter(c => c.listingId === l.id);
    const ids = new Set();
    if (l.reservedBy) ids.add(l.reservedBy);
    convs.forEach(c => c.members.forEach(m => { if (m !== l.seller) ids.add(m); }));
    const buyers = [...ids].map(api.getUser).filter(Boolean);
    modal('Hoàn tất giao dịch', `
      <form id="soldForm" class="form">
        <p class="muted">Chọn người đã nhận hàng để hai bên có thể đánh giá nhau.</p>
        <div class="radio-list">
          ${buyers.map((u, i) => `<label class="radio-row"><input type="radio" name="buyer" value="${u.id}" ${i === 0 ? 'checked' : ''}>${avatar(u, 'sm')} ${esc(u.name)} ${u.id === l.reservedBy ? '<span class="badge b-trade">Đang giữ</span>' : ''}</label>`).join('')}
          <label class="radio-row"><input type="radio" name="buyer" value="" ${buyers.length ? '' : 'checked'}> Người ngoài sàn / không xác định</label>
        </div>
        <button class="btn primary block">Xác nhận đã giao dịch</button>
      </form>`, (m, close) => {
      m.querySelector('#soldForm').onsubmit = guard(e => {
        e.preventDefault();
        const buyer = e.target.buyer.value || null;
        api.markSold(l.id, buyer);
        close();
        toast('Đã cập nhật: đã giao dịch 🎉', 'ok');
        if (buyer) go('/reviews'); else render();
      });
    });
  }

  function openReport(l) {
    const reasons = ['Lừa đảo / yêu cầu chuyển khoản trước', 'Sai thông tin, ảnh không đúng', 'Hàng cấm, hàng giả', 'Đã bán nhưng chưa cập nhật', 'Khác'];
    modal('🚩 Báo cáo tin đăng', `
      <form id="repForm" class="form">
        <div class="radio-list">${reasons.map((r, i) => `<label class="radio-row"><input type="radio" name="reason" value="${esc(r)}" ${i === 0 ? 'checked' : ''}> ${r}</label>`).join('')}</div>
        <label>Mô tả thêm (không bắt buộc)<textarea name="note" rows="3"></textarea></label>
        <button class="btn danger block">Gửi báo cáo</button>
      </form>`, (m, close) => {
      m.querySelector('#repForm').onsubmit = e => {
        e.preventDefault();
        api.report(l.id, e.target.reason.value, e.target.note.value);
        close();
        toast('Cảm ơn bạn! Đội ngũ sẽ kiểm tra tin này.', 'ok');
      };
    });
  }

  // ---------- Đăng / sửa tin ----------
  let draftImages = [];

  function viewPost(q) {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập để đăng tin bán, trao đổi hoặc cho tặng.');
    const editing = q.edit ? api.getListing(q.edit) : null;
    if (q.edit && (!editing || editing.seller !== me.id)) return notFound('Không thể sửa tin này.');
    const cl = R.cluster(me.cluster);
    const l = editing || {
      type: q.type || 'sell', title: '', cat: '', price: '', tradeFor: '', condition: 'Tốt', usedTime: '', desc: '',
      school: me.school, area: me.area, movingSale: !!q.moving || !!me.moving, combo: q.combo ? [{ name: '', price: '' }, { name: '', price: '' }] : null, images: [],
    };
    draftImages = (l.images || []).slice();
    const opt = (v, t, cur) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(t)}</option>`;

    return `<div class="container page narrow">
      <h1>${editing ? 'Sửa tin đăng' : 'Đăng tin mới'}</h1>
      <p class="muted">Tin chuẩn đủ ảnh, giá, tình trạng, vị trí và thời gian sử dụng sẽ được nhiều người xem hơn. Cụm: <b>${cl.name}</b></p>
      ${editing ? '' : quotaBox()}
      ${!me.verified.student ? '<div class="notice warn">Tài khoản chưa xác thực sinh viên — tin của bạn sẽ hiển thị nhãn “Chưa xác thực”. <a href="#/me?tab=account">Xác thực ngay</a></div>' : ''}
      <form id="postForm" class="form panel">
        <label>Hình thức
          <div class="seg big">
            ${[['sell', '💰 Bán'], ['trade', '🔁 Trao đổi'], ['free', '🎁 Cho tặng']].map(([v, t]) => `<label><input type="radio" name="type" value="${v}" ${l.type === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}
          </div>
        </label>

        <label>Ảnh sản phẩm <span class="muted small">(tối đa 6 ảnh, ảnh đầu là ảnh bìa)</span>
          <div class="uploader" id="uploader"></div>
          <input type="file" id="fileInput" accept="image/*" multiple hidden>
        </label>

        <label>Tiêu đề *<input name="title" maxlength="80" value="${esc(l.title)}" placeholder="VD: Nồi cơm điện Sharp 1.8L còn tốt"></label>

        <div class="row2">
          <label>Danh mục *<select name="cat">${opt('', '— Chọn danh mục —', l.cat)}${R.categories.map(c => opt(c.id, c.icon + ' ' + c.name, l.cat)).join('')}</select></label>
          <label>Tình trạng *<select name="condition">${R.conditions.map(c => opt(c, c, l.condition)).join('')}</select></label>
        </div>

        <div class="row2">
          <label data-show="sell trade">Giá <span data-show="trade" class="muted small">(tùy chọn, nếu chấp nhận bán)</span><input name="price" type="number" min="0" step="1000" value="${esc(l.price || '')}" placeholder="VD: 150000"></label>
          <label>Thời gian đã sử dụng<input name="usedTime" value="${esc(l.usedTime)}" placeholder="VD: 1 năm, 6 tháng"></label>
        </div>

        <label data-show="trade">Muốn đổi lấy *<input name="tradeFor" value="${esc(l.tradeFor || '')}" placeholder="VD: Chuột không dây, sách IELTS..."></label>

        <label>Mô tả<textarea name="desc" rows="4" placeholder="Tình trạng chi tiết, lỗi (nếu có), lý do bán, thời gian có thể gặp...">${esc(l.desc)}</textarea></label>

        <div class="row2">
          <label>Trường<select name="school">${cl.schools.map(s => opt(s, s, l.school)).join('')}</select></label>
          <label>Khu trọ / KTX *<select name="area">${cl.areas.map(a => opt(a.id, a.name, l.area)).join('')}</select></label>
        </div>

        <fieldset class="moving-box">
          <label class="check"><input type="checkbox" name="movingSale" ${l.movingSale ? 'checked' : ''}> 📦 Đây là đồ thanh lý chuyển trọ / ra trường</label>
          <label class="check" data-show="sell"><input type="checkbox" id="comboToggle" ${l.combo ? 'checked' : ''}> Bán theo combo nhiều món</label>
          <div id="comboBox" ${l.combo ? '' : 'hidden'} data-show="sell">
            <p class="small muted">Liệt kê từng món và giá lẻ tham khảo; giá combo nhập ở ô “Giá” phía trên.</p>
            <div id="comboRows">${(l.combo || []).map(comboRow).join('')}</div>
            <button type="button" class="btn ghost small" id="addCombo">+ Thêm món</button>
            <div class="small" id="comboSum"></div>
          </div>
        </fieldset>

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
  function comboRow(i) {
    i = i || {};
    return `<div class="combo-row"><input placeholder="Tên món" data-k="name" value="${esc(i.name || '')}"><input type="number" placeholder="Giá lẻ" data-k="price" min="0" step="1000" value="${esc(i.price || '')}"><button type="button" class="icon-btn" data-rm>✕</button></div>`;
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

    const comboBox = document.getElementById('comboBox');
    const comboRows = document.getElementById('comboRows');
    const comboToggle = document.getElementById('comboToggle');
    const updateSum = () => {
      const sum = [...comboRows.querySelectorAll('[data-k=price]')].reduce((s, i) => s + Number(i.value || 0), 0);
      const price = Number(f.price.value || 0);
      document.getElementById('comboSum').innerHTML = sum ? `Tổng giá lẻ: <b>${money(sum)}</b>${price && price < sum ? ` · Người mua tiết kiệm <b class="ok-text">${money(sum - price)}</b>` : ''}` : '';
    };
    const bindRows = () => {
      comboRows.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { b.parentElement.remove(); updateSum(); });
      comboRows.querySelectorAll('input').forEach(i => i.oninput = updateSum);
    };
    document.getElementById('addCombo').onclick = () => { comboRows.insertAdjacentHTML('beforeend', comboRow()); bindRows(); };
    comboToggle.onchange = () => {
      comboBox.hidden = !comboToggle.checked;
      if (comboToggle.checked && !comboRows.children.length) { comboRows.innerHTML = comboRow() + comboRow(); bindRows(); }
      applyType();
    };
    f.price.oninput = updateSum;
    bindRows(); updateSum();

    const applyType = () => {
      const t = f.type.value;
      f.querySelectorAll('[data-show]').forEach(el => {
        const show = el.dataset.show.split(' ').includes(t);
        if (el.id === 'comboBox') el.hidden = !show || !comboToggle.checked;
        else el.hidden = !show;
      });
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
      let combo = null;
      if (type === 'sell' && comboToggle.checked) {
        combo = [...comboRows.querySelectorAll('.combo-row')].map(r => ({ name: r.querySelector('[data-k=name]').value.trim(), price: Number(r.querySelector('[data-k=price]').value || 0) })).filter(i => i.name);
        if (combo.length < 2) throw new Error('Combo cần ít nhất 2 món.');
      }
      const data = {
        type, title: f.title.value.trim(), cat: f.cat.value, condition: f.condition.value,
        price: type === 'free' ? 0 : Number(f.price.value || 0), usedTime: f.usedTime.value.trim(),
        tradeFor: type === 'trade' ? f.tradeFor.value.trim() : '', desc: f.desc.value.trim(),
        school: f.school.value, area: f.area.value, movingSale: f.movingSale.checked, combo, images: draftImages.slice(),
      };
      const saved = q.edit ? api.updateListing(q.edit, data) : api.createListing(data);
      toast(q.edit ? 'Đã lưu thay đổi' : 'Đăng tin thành công 🎉', 'ok');
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

  // ---------- Thanh lý chuyển trọ ----------
  function viewMoving() {
    const me = api.currentUser();
    const cid = api.activeClusterId();
    const cl = R.cluster(cid);
    const movers = api.movingSellers(cid);
    const combos = api.searchListings({ combo: 1, moving: 1 });
    const partners = R.partners.filter(p => p.cluster === cid);

    return `<div class="container page">
      <section class="moving-hero">
        <div>
          <h1>📦 Thanh lý chuyển trọ</h1>
          <p>Sắp chuyển phòng hay ra trường? Đăng nhanh từng món hoặc cả combo đồ phòng, người mua ở ngay gần sẽ qua lấy — không phải vận chuyển, không phải bỏ lại.</p>
          <div class="btn-row">
            <button class="btn light" id="imMoving">${me && me.moving ? '✏ Cập nhật ngày chuyển đi' : 'Tôi sắp chuyển trọ'}</button>
            <a href="#/post?moving=1&combo=1" class="btn outline-light">+ Đăng combo thanh lý</a>
          </div>
          ${me && me.moving ? `<p class="small">Bạn chuyển đi ngày <b>${fmtDate(me.moving.date)}</b> (còn ${timeLeft(me.moving.date)}).</p>` : ''}
        </div>
        <ul class="moving-points">
          <li>⏱ Hiển thị hạn chuyển đi để người mua chốt nhanh</li>
          <li>📦 Bán theo combo, giá rẻ hơn mua lẻ</li>
          <li>🎁 Món không bán được có thể cho tặng</li>
        </ul>
      </section>

      <section class="section">
        <div class="section-head"><h2>Đang thanh lý tại ${esc(cl.name)}</h2></div>
        ${movers.length ? movers.map(({ user: u, listings }) => {
          const rt = api.rating(u.id);
          return `<div class="mover panel">
            <div class="mover-head">
              <a href="#/user/${u.id}" class="mover-user">${avatar(u, 'lg')}<div><b>${esc(u.name)}</b> ${verifiedBadge(u, true)}<div class="small muted">${esc(u.school)} · ${esc(areaName(u.cluster, u.area))}</div><div>${stars(rt.avg, rt.count)}</div></div></a>
              <div class="countdown"><span>Chuyển đi sau</span><b>${timeLeft(u.moving.date)}</b><span class="small">${fmtDate(u.moving.date)}</span></div>
            </div>
            ${u.moving.note ? `<p class="muted">“${esc(u.moving.note)}”</p>` : ''}
            <div class="hscroll">${listings.map(card).join('')}</div>
          </div>`;
        }).join('') : '<div class="empty">Hiện chưa có ai thanh lý trong cụm này.</div>'}
      </section>

      ${combos.length ? `<section class="section"><div class="section-head"><h2>Combo đồ phòng giá tốt</h2></div>${grid(combos)}</section>` : ''}

      <section class="section two-col">
        <div class="panel">
          <h3>🙋 Dịch vụ thanh lý phòng trọ</h3>
          <p class="muted">Không có thời gian? Đội ngũ ReMarket hỗ trợ chụp ảnh, định giá, đăng bán theo combo và tìm người mua giúp bạn.</p>
          <form id="svcForm" class="form">
            <div class="row2">
              <label>Họ tên<input name="name" value="${esc(me ? me.name : '')}" required></label>
              <label>Số điện thoại<input name="phone" value="${esc(me && me.phone ? me.phone : '')}" required pattern="0[0-9]{9}" placeholder="09xxxxxxxx"></label>
            </div>
            <div class="row2">
              <label>Khu vực<select name="area">${cl.areas.map(a => `<option value="${a.id}" ${me && me.area === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select></label>
              <label>Ngày chuyển dự kiến<input type="date" name="date" required></label>
            </div>
            <label>Số lượng đồ ước tính<select name="size"><option>Dưới 5 món</option><option>5–15 món</option><option>Cả phòng</option></select></label>
            <button class="btn primary">Gửi yêu cầu</button>
            <p class="small muted">Phí dự kiến: phí cố định hoặc % trên giao dịch thành công (đang thử nghiệm).</p>
          </form>
        </div>
        <div class="panel">
          <h3>🤝 Đối tác hỗ trợ tại ${esc(cl.name)}</h3>
          <div class="partners">${partners.map(p => `<div class="partner"><span class="partner-ic">${p.icon}</span><div><b>${esc(p.name)}</b> <span class="badge b-partner">Đối tác</span><div class="small muted">${esc(p.desc)}</div>${p.phone ? `<div class="small">☎ ${esc(p.phone)}</div>` : ''}</div></div>`).join('')}</div>
          <a href="#/pricing" class="small">Bạn có cửa hàng/dịch vụ? Đăng ký đối tác ${money(P.partner.price)}/${P.partner.unit} →</a>
        </div>
      </section>
    </div>`;
  }
  function mountMoving() {
    document.getElementById('imMoving').onclick = () => {
      if (!requireLogin('Đăng nhập để bật chế độ thanh lý chuyển trọ.')) return;
      const me = api.currentUser();
      const d = me.moving ? new Date(me.moving.date) : new Date(Date.now() + 7 * 864e5);
      modal('📦 Bật chế độ thanh lý chuyển trọ', `
        <form id="movForm" class="form">
          <label>Ngày chuyển đi<input type="date" name="date" value="${d.toISOString().slice(0, 10)}" required></label>
          <label>Lời nhắn cho người mua<input name="note" value="${esc(me.moving ? me.moving.note : '')}" placeholder="VD: Ra trường, thanh lý toàn bộ đồ phòng"></label>
          <p class="small muted">Trang cá nhân và các tin thanh lý của bạn sẽ hiển thị hạn chuyển đi.</p>
          <div class="form-actions">
            ${me.moving ? '<button type="button" class="btn ghost" id="movOff">Tắt chế độ</button>' : '<span></span>'}
            <button class="btn primary">Lưu & đăng đồ</button>
          </div>
        </form>`, (m, close) => {
        const f = m.querySelector('#movForm');
        f.onsubmit = e => {
          e.preventDefault();
          api.updateProfile({ moving: { date: new Date(f.date.value + 'T12:00:00').getTime(), note: f.note.value.trim() } });
          close();
          toast('Đã bật chế độ thanh lý', 'ok');
          go('/post' + qs({ moving: 1 }));
        };
        const off = m.querySelector('#movOff');
        if (off) off.onclick = () => { api.updateProfile({ moving: null }); close(); toast('Đã tắt chế độ thanh lý'); render(); };
      });
    };
    document.getElementById('svcForm').onsubmit = e => {
      e.preventDefault();
      api.requestService(Object.fromEntries(new FormData(e.target).entries()));
      e.target.reset();
      toast('Đã gửi yêu cầu! Chúng tôi sẽ liên hệ trong 24 giờ.', 'ok');
    };
  }

  // ---------- Trang của tôi ----------
  function viewMe(q) {
    const me = api.currentUser();
    if (!me) return loginWall('Đăng nhập để quản lý tin đăng.');
    const tab = q.tab || 'listings';
    const rt = api.rating(me.id);
    const mine = api.searchListings({ cluster: me.cluster, seller: me.id, includeSold: true, sort: 'new' });
    const pending = api.pendingReviews();
    const tabs = [['listings', 'Tin của tôi', mine.length], ['reserved', 'Đang đặt giữ', api.myReservations().filter(l => l.status === 'reserved').length], ['reviews', 'Đánh giá', pending.length], ['payments', 'Gói & thanh toán', 0], ['account', 'Tài khoản & xác thực', 0]];

    let body = '';
    if (tab === 'listings') {
      const groups = [['available', 'Đang đăng'], ['reserved', 'Đang được giữ'], ['sold', 'Đã giao dịch']];
      body = mine.length ? groups.map(([s, t]) => {
        const ls = mine.filter(l => l.status === s);
        if (!ls.length) return '';
        return `<h3 class="group-title">${t} <span class="muted">(${ls.length})</span></h3>
          <div class="rows">${ls.map(l => {
            const rb = l.reservedBy ? api.getUser(l.reservedBy) : null;
            const buyer = l.soldTo ? api.getUser(l.soldTo) : null;
            return `<div class="row-item">
              <a href="#/item/${l.id}" class="row-thumb">${thumb(l)}</a>
              <div class="row-main">
                <a href="#/item/${l.id}"><b>${esc(l.title)}</b></a>
                <div>${priceLabel(l)} ${typeBadge[l.type]} ${l.boosted ? `<span class="badge b-boost">⚡ còn ${timeLeft(l.boostUntil)}</span>` : ''}</div>
                <div class="small muted">👁 ${l.views} · Đăng ${timeAgo(l.createdAt)}
                  ${rb ? ` · 📌 ${esc(rb.name)} giữ, còn ${timeLeft(l.reservedUntil)} · Hẹn: ${esc(l.meetPoint)}` : ''}
                  ${buyer ? ` · Người mua: ${esc(buyer.name)}` : ''}</div>
              </div>
              <div class="row-actions">
                ${s !== 'sold' ? `<a class="btn ghost small" href="#/post?edit=${l.id}">Sửa</a><button class="btn boost small" data-boost="${l.id}">⚡ Đẩy</button><button class="btn primary small" data-sold="${l.id}">Đã giao dịch</button>` : `<button class="btn ghost small" data-reopen="${l.id}">Mở bán lại</button>`}
                ${s === 'reserved' ? `<button class="btn ghost small" data-unres="${l.id}">Hủy giữ</button>` : ''}
              </div>
            </div>`;
          }).join('')}</div>`;
      }).join('') : `<div class="empty">Bạn chưa có tin nào. <a href="#/post">Đăng tin đầu tiên</a></div>`;
    } else if (tab === 'reserved') {
      const rs = api.myReservations();
      body = rs.length ? `<div class="rows">${rs.map(l => {
        const s = api.getUser(l.seller);
        return `<div class="row-item">
          <a href="#/item/${l.id}" class="row-thumb">${thumb(l)}</a>
          <div class="row-main"><a href="#/item/${l.id}"><b>${esc(l.title)}</b></a><div>${priceLabel(l)}</div>
            <div class="small muted">Người bán: ${esc(s.name)} · ${l.status === 'reserved' ? `Hẹn tại <b>${esc(l.meetPoint)}</b> · còn ${timeLeft(l.reservedUntil)}` : '✔ Đã nhận hàng'}</div></div>
          <div class="row-actions">${l.status === 'reserved' ? `<button class="btn primary small" data-msg="${l.id}">Nhắn tin</button><button class="btn ghost small" data-unres="${l.id}">Hủy giữ</button>` : ''}</div>
        </div>`;
      }).join('')}</div>` : '<div class="empty">Bạn chưa đặt giữ sản phẩm nào.</div>';
    } else if (tab === 'reviews') {
      const received = api.reviewsFor(me.id);
      body = `${pending.length ? `<h3 class="group-title">Chờ bạn đánh giá</h3><div class="rows">${pending.map(p => `
          <div class="row-item"><a href="#/item/${p.listing.id}" class="row-thumb">${thumb(p.listing)}</a>
            <div class="row-main"><b>${esc(p.listing.title)}</b><div class="small muted">${p.listing.seller === me.id ? 'Người mua' : 'Người bán'}: ${esc(p.other.name)}</div></div>
            <div class="row-actions"><button class="btn primary small" data-review="${p.listing.id}" data-to="${p.other.id}">⭐ Đánh giá</button></div></div>`).join('')}</div>` : ''}
        <h3 class="group-title">Đánh giá về bạn <span class="muted">${stars(rt.avg, rt.count)}</span></h3>
        ${reviewList(received)}`;
    } else if (tab === 'payments') {
      const qt = api.quota();
      const ps = api.myPayments();
      const hot = mine.filter(l => l.boosted);
      body = `<div class="two-col">
        <div class="panel"><h3>📝 Lượt đăng tin</h3>
          <div class="quota-big"><div><b>${qt.freeLeft}/${P.freePosts}</b><span>tin miễn phí còn lại tháng này</span></div><div><b>${qt.credits}</b><span>lượt đã mua</span></div></div>
          <button class="btn boost block" id="buyPosts2">+ Mua ${P.extraPosts.posts} tin – ${money(P.extraPosts.price)}</button></div>
        <div class="panel"><h3>⚡ Tin đang nổi bật</h3>
          ${hot.length ? hot.map(l => `<div class="mini-row"><a href="#/item/${l.id}" class="ellipsis">${esc(l.title)}</a><span class="badge b-boost">còn ${timeLeft(l.boostUntil)}</span></div>`).join('') : `<p class="muted small">Chưa có tin nào nổi bật. Chỉ ${money(P.featured.price)}/${P.featured.days} ngày.</p>`}
          <a href="#/pricing" class="btn ghost block small">Xem bảng giá</a></div>
      </div>
      <h3 class="group-title">Lịch sử thanh toán</h3>
      ${ps.length ? `<div class="panel table-wrap"><table class="pay-table"><tr><th>Thời gian</th><th>Dịch vụ</th><th>Phương thức</th><th class="r">Số tiền</th></tr>
        ${ps.map(x => `<tr><td>${fmtDate(x.at)} ${fmtTime(x.at)}</td><td>${esc(x.desc)}${x.listingId ? ` · <a href="#/item/${x.listingId}">xem tin</a>` : ''}</td><td>${esc(x.method)}</td><td class="r"><b>${money(x.amount)}</b></td></tr>`).join('')}
      </table></div>` : '<div class="empty">Chưa có giao dịch thanh toán nào.</div>'}`;
    } else {
      const cl = R.cluster(me.cluster);
      body = `<div class="two-col">
        <form id="profileForm" class="form panel">
          <h3>Thông tin cá nhân</h3>
          <label>Họ tên<input name="name" value="${esc(me.name)}" required></label>
          <label>Giới thiệu<textarea name="bio" rows="2">${esc(me.bio || '')}</textarea></label>
          <label>Cụm<select name="cluster">${R.clusters.map(c => `<option value="${c.id}" ${c.id === me.cluster ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
          <div class="row2">
            <label>Trường<select name="school">${cl.schools.map(s => `<option ${s === me.school ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
            <label>Khu trọ / KTX<select name="area">${cl.areas.map(a => `<option value="${a.id}" ${a.id === me.area ? 'selected' : ''}>${a.name}</option>`).join('')}</select></label>
          </div>
          <button class="btn primary">Lưu</button>
        </form>
        <div class="panel">
          <h3>Xác thực tài khoản</h3>
          <p class="muted small">Tài khoản đã xác thực được ưu tiên hiển thị và được người mua tin tưởng hơn.</p>
          ${verifyBlock(me)}
        </div>
      </div>`;
    }

    return `<div class="container page">
      <div class="profile-head panel">
        ${avatar(me, 'xl')}
        <div class="grow"><h1>${esc(me.name)}</h1><div>${verifiedBadge(me)} ${stars(rt.avg, rt.count)}</div>
          <div class="small muted">${esc(me.school)} · ${esc(areaName(me.cluster, me.area))} · Cụm ${R.cluster(me.cluster).name}</div></div>
        <a href="#/post" class="btn primary">+ Đăng tin</a>
      </div>
      <div class="tabs">${tabs.map(([k, t, n]) => `<a href="${k === 'reviews' ? '#/reviews' : '#/me?tab=' + k}" class="${k === tab ? 'active' : ''}">${t}${n ? ` <span class="count">${n}</span>` : ''}</a>`).join('')}</div>
      <div class="tab-body">${body}</div>
    </div>`;
  }

  function verifyBlock(me) {
    return `
      <div class="verify-item ${me.verified.student ? 'done' : ''}">
        <div><b>🎓 Sinh viên</b><div class="small muted">Email trường (.edu.vn) hoặc ảnh thẻ sinh viên</div></div>
        ${me.verified.student ? '<span class="vbadge ok">✔ Đã xác thực</span>' : '<button class="btn primary small" id="vStudent">Xác thực</button>'}
      </div>
      <div class="verify-item ${me.verified.phone ? 'done' : ''}">
        <div><b>📱 Số điện thoại</b><div class="small muted">Nhận mã OTP qua SMS</div></div>
        ${me.verified.phone ? '<span class="vbadge ok">✔ Đã xác thực</span>' : '<button class="btn primary small" id="vPhone">Xác thực</button>'}
      </div>`;
  }
  function bindVerify(after) {
    const vs = document.getElementById('vStudent');
    if (vs) vs.onclick = () => modal('🎓 Xác thực sinh viên', `
      <div class="seg" id="vTabs"><label><input type="radio" name="vm" value="email" checked><span>Email trường</span></label><label><input type="radio" name="vm" value="card"><span>Ảnh thẻ SV</span></label></div>
      <form id="vEmail" class="form">
        <label>Email sinh viên<input name="email" value="${esc(/\.edu\.vn$/i.test(api.currentUser().email) ? api.currentUser().email : '')}" placeholder="ten@fpt.edu.vn"></label>
        <div class="row2"><label>Mã xác thực<input name="code" placeholder="6 số"></label><label>&nbsp;<button type="button" class="btn ghost" id="sendCode">Gửi mã</button></label></div>
        <p class="small muted">Bản demo: mã luôn là <b>123456</b>.</p>
        <button class="btn primary block">Xác thực</button>
      </form>
      <form id="vCard" class="form" hidden>
        <label>Ảnh mặt trước thẻ sinh viên<input type="file" name="card" accept="image/*" required></label>
        <p class="small muted">Ảnh chỉ dùng để đối chiếu và sẽ được xóa sau khi duyệt. (Demo: duyệt tự động.)</p>
        <button class="btn primary block">Gửi duyệt</button>
      </form>`, (m, close) => {
      m.querySelectorAll('input[name=vm]').forEach(r => r.onchange = () => { m.querySelector('#vEmail').hidden = r.value !== 'email' || !r.checked; m.querySelector('#vCard').hidden = r.value !== 'card' || !r.checked; });
      m.querySelector('#sendCode').onclick = () => toast('Đã gửi mã tới email (demo: 123456)');
      m.querySelector('#vEmail').onsubmit = guard(e => { e.preventDefault(); api.verifyStudentEmail(e.target.email.value, e.target.code.value.trim()); close(); toast('Xác thực sinh viên thành công ✔', 'ok'); after(); });
      m.querySelector('#vCard').onsubmit = e => {
        e.preventDefault();
        const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Đang duyệt...';
        setTimeout(() => { api.verifyStudentCard(); close(); toast('Thẻ sinh viên đã được duyệt ✔', 'ok'); after(); }, 1200);
      };
    });
    const vp = document.getElementById('vPhone');
    if (vp) vp.onclick = () => modal('📱 Xác thực số điện thoại', `
      <form id="vPhoneForm" class="form">
        <label>Số điện thoại<input name="phone" placeholder="09xxxxxxxx"></label>
        <div class="row2"><label>Mã OTP<input name="code" placeholder="6 số"></label><label>&nbsp;<button type="button" class="btn ghost" id="sendOtp">Gửi OTP</button></label></div>
        <p class="small muted">Bản demo: mã luôn là <b>123456</b>.</p>
        <button class="btn primary block">Xác thực</button>
      </form>`, (m, close) => {
      m.querySelector('#sendOtp').onclick = () => toast('Đã gửi OTP (demo: 123456)');
      m.querySelector('#vPhoneForm').onsubmit = guard(e => { e.preventDefault(); api.verifyPhone(e.target.phone.value, e.target.code.value.trim()); close(); toast('Đã xác thực số điện thoại ✔', 'ok'); after(); });
    });
  }

  function mountMe() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(b => b.onclick = guard(() => fn(b)));
    on('[data-boost]', b => openServices(api.getListing(b.dataset.boost)));
    on('[data-sold]', b => openMarkSold(api.getListing(b.dataset.sold)));
    on('[data-reopen]', b => { api.reopen(b.dataset.reopen); toast('Đã mở bán lại', 'ok'); render(); });
    on('[data-unres]', b => { if (confirm('Hủy giữ chỗ?')) { api.cancelReservation(b.dataset.unres); toast('Đã hủy giữ chỗ'); render(); } });
    on('[data-msg]', b => go('/chat/' + api.startConversation(b.dataset.msg).id));
    on('[data-review]', b => openReview(b.dataset.review, b.dataset.to));
    const bp = document.getElementById('buyPosts2');
    if (bp) bp.onclick = () => openBuyPosts(render);

    const pf = document.getElementById('profileForm');
    if (pf) {
      pf.cluster.onchange = () => {
        const cl = R.cluster(pf.cluster.value);
        pf.school.innerHTML = cl.schools.map(s => `<option>${esc(s)}</option>`).join('');
        pf.area.innerHTML = cl.areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
      };
      pf.onsubmit = e => {
        e.preventDefault();
        api.updateProfile({ name: pf.name.value.trim(), bio: pf.bio.value.trim(), cluster: pf.cluster.value, school: pf.school.value, area: pf.area.value });
        toast('Đã lưu hồ sơ', 'ok');
        render();
      };
    }
    bindVerify(render);
  }

  function openReview(listingId, toId) {
    const u = api.getUser(toId);
    const l = api.getListing(listingId);
    modal('⭐ Đánh giá giao dịch', `
      <div class="review-who">${avatar(u, 'lg')}<div><b>${esc(u.name)}</b><div class="small muted">${esc(l.title)}</div></div></div>
      <form id="revForm" class="form">
        <div class="star-input" id="starInput">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}">★</button>`).join('')}</div>
        <div class="chips">${['Đúng mô tả', 'Đúng hẹn', 'Thân thiện', 'Giá hợp lý'].map(t => `<button type="button" class="chip" data-t="${t}">${t}</button>`).join('')}</div>
        <label>Nhận xét<textarea name="text" rows="3" placeholder="Chia sẻ trải nghiệm giao dịch..."></textarea></label>
        <button class="btn primary block">Gửi đánh giá</button>
      </form>`, (m, close) => {
      let n = 5;
      const paint = () => m.querySelectorAll('#starInput button').forEach(b => b.classList.toggle('on', Number(b.dataset.n) <= n));
      m.querySelectorAll('#starInput button').forEach(b => b.onclick = () => { n = Number(b.dataset.n); paint(); });
      paint();
      const ta = m.querySelector('textarea');
      m.querySelectorAll('.chip').forEach(c => c.onclick = () => { ta.value = (ta.value ? ta.value.replace(/[.\s]*$/, '') + '. ' : '') + c.dataset.t; });
      m.querySelector('#revForm').onsubmit = guard(e => {
        e.preventDefault();
        api.addReview(listingId, toId, n, ta.value);
        close();
        toast('Cảm ơn bạn đã đánh giá!', 'ok');
        render();
      });
    });
  }

  // Tên món đồ của giao dịch được đánh giá
  function reviewItem(r) {
    const l = r.listingId ? api.getListing(r.listingId) : null;
    return l ? l.title : (r.item || '');
  }
  function reviewList(rs, written) {
    if (!rs.length) return '<div class="empty">Chưa có đánh giá nào.</div>';
    return `<div class="reviews">${rs.map(r => {
      const u = api.getUser(written ? r.to : r.from);
      const l = r.listingId ? api.getListing(r.listingId) : null;
      const item = !l && r.item ? ` · 🛍 ${esc(r.item)}` : '';
      return `<div class="review">${avatar(u, 'sm')}<div><b>${written ? 'Bạn → ' : ''}${esc(u ? u.name : 'Người dùng')}</b> <span class="stars">${'★'.repeat(r.stars)}<span class="off">${'★'.repeat(5 - r.stars)}</span></span>
        <div>${esc(r.text || '(Không có nhận xét)')}</div><div class="small muted">${timeAgo(r.createdAt)}${l ? ` · 🛍 <a href="#/item/${l.id}">${esc(l.title)}</a>` : item}</div></div></div>`;
    }).join('')}</div>`;
  }

  // ---------- Trang cá nhân công khai ----------
  function viewUser(id) {
    const u = api.getUser(id);
    if (!u) return notFound('Không tìm thấy người dùng.');
    const rt = api.rating(u.id);
    const ls = api.searchListings({ cluster: u.cluster, seller: u.id, sort: 'new' });
    const sold = api.searchListings({ cluster: u.cluster, seller: u.id, includeSold: true }).filter(l => l.status === 'sold').length;
    return `<div class="container page">
      <div class="profile-head panel">
        ${avatar(u, 'xl')}
        <div class="grow"><h1>${esc(u.name)}</h1><div>${verifiedBadge(u)} ${stars(rt.avg, rt.count)}</div>
          <div class="small muted">${esc(u.school)} · ${esc(areaName(u.cluster, u.area))} · Cụm ${R.cluster(u.cluster).name} · Tham gia ${fmtDate(u.joinedAt)}</div>
          ${u.bio ? `<p>${esc(u.bio)}</p>` : ''}
          ${u.moving && u.moving.date > Date.now() ? `<div class="notice warn">📦 Đang thanh lý chuyển trọ — chuyển đi sau ${timeLeft(u.moving.date)}</div>` : ''}
          ${api.currentUser() && api.currentUser().id === u.id ? '' : sellerContact(u)}
        </div>
        <div class="profile-stats"><div><b>${ls.length}</b><span>đang đăng</span></div><div><b>${sold}</b><span>đã giao dịch</span></div><div><b>${rt.count}</b><span>đánh giá</span></div></div>
      </div>
      <section class="section"><div class="section-head"><h2>Tin đang đăng</h2></div>${grid(ls, 'Người dùng chưa có tin nào đang đăng.')}</section>
      <section class="section"><div class="section-head"><h2>Đánh giá</h2></div>${reviewList(api.reviewsFor(u.id))}</section>
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
      let lastDay = '';
      pane = `
        <div class="chat-head">
          <a href="#/chat" class="icon-btn show-sm">←</a>
          <a href="#/user/${other.id}" class="chat-user">${avatar(other)}<div><b>${esc(other.name)}</b><div class="small">${verifiedBadge(other, true)} ${esc(other.school)}</div></div></a>
        </div>
        ${l ? `<a href="#/item/${l.id}" class="chat-listing">${thumb(l, 'xs')}<div><div class="ellipsis">${esc(l.title)}</div>${priceLabel(l)}</div>
          <span class="badge ${l.status === 'available' ? 'b-free' : l.status === 'reserved' ? 'b-trade' : 'b-sell'}">${{ available: 'Còn hàng', reserved: 'Đang giữ', sold: 'Đã giao dịch' }[l.status]}</span></a>` : ''}
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

  // ---------- Đăng nhập / Đăng ký ----------
  function viewLogin(q) {
    const demos = api.allUsers().filter(u => ['u1', 'u4', 'u6'].includes(u.id));
    return `<div class="container page auth">
      <div class="panel auth-card">
        <h1>Đăng nhập</h1>
        <form id="loginForm" class="form">
          <label>Email<input name="email" type="email" required placeholder="ten@fpt.edu.vn"></label>
          <label>Mật khẩu<input name="password" type="password" required></label>
          <button class="btn primary block">Đăng nhập</button>
        </form>
        <p class="center small">Chưa có tài khoản? <a href="#/register${qs({ next: q.next })}">Đăng ký</a></p>
        <div class="divider"><span>hoặc dùng tài khoản demo</span></div>
        <div class="demo-list">${demos.map(u => `<button class="demo" data-id="${u.id}">${avatar(u)}<div><b>${esc(u.name)}</b><div class="small muted">${R.cluster(u.cluster).name} · ${esc(u.school)} ${u.verified.student ? '' : '· chưa xác thực'}</div></div></button>`).join('')}</div>
      </div>
    </div>`;
  }
  function mountLogin(q) {
    const next = q.next || '/';
    document.getElementById('loginForm').onsubmit = guard(e => {
      e.preventDefault();
      const u = api.login(e.target.email.value, e.target.password.value);
      toast('Xin chào ' + u.name, 'ok');
      go(next);
    });
    document.querySelectorAll('.demo').forEach(b => b.onclick = () => { const u = api.loginAs(b.dataset.id); toast('Xin chào ' + u.name, 'ok'); go(next); });
  }

  function viewRegister(q) {
    const cid = api.activeClusterId();
    const cl = R.cluster(cid);
    return `<div class="container page auth">
      <div class="panel auth-card wide">
        <h1>Tạo tài khoản</h1>
        <form id="regForm" class="form">
          <label>Họ và tên<input name="name" required></label>
          <div class="row2">
            <label>Email <span class="small muted">(email .edu.vn được xác thực nhanh)</span><input name="email" type="email" required></label>
            <label>Mật khẩu<input name="password" type="password" minlength="6" required></label>
          </div>
          <label>Chọn cụm giao dịch
            <div class="cluster-choices">${R.clusters.map(c => `<label class="cluster-choice"><input type="radio" name="cluster" value="${c.id}" ${c.id === cid ? 'checked' : ''}><b>📍 ${c.name}</b><span>${c.tagline}</span></label>`).join('')}</div>
          </label>
          <div class="row2">
            <label>Trường<select name="school">${cl.schools.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
            <label>Khu trọ / KTX<select name="area">${cl.areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></label>
          </div>
          <label class="check"><input type="checkbox" required> Tôi đồng ý với quy định giao dịch an toàn và không đăng hàng cấm.</label>
          <button class="btn primary block">Đăng ký</button>
        </form>
        <p class="center small">Đã có tài khoản? <a href="#/login${qs({ next: q.next })}">Đăng nhập</a></p>
      </div>
    </div>`;
  }
  function mountRegister(q) {
    const f = document.getElementById('regForm');
    f.querySelectorAll('input[name=cluster]').forEach(r => r.onchange = () => {
      const cl = R.cluster(f.cluster.value);
      f.school.innerHTML = cl.schools.map(s => `<option>${esc(s)}</option>`).join('');
      f.area.innerHTML = cl.areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    });
    f.onsubmit = guard(e => {
      e.preventDefault();
      api.register({ name: f.name.value, email: f.email.value, password: f.password.value, cluster: f.cluster.value, school: f.school.value, area: f.area.value });
      toast('Tạo tài khoản thành công! Hãy xác thực sinh viên.', 'ok');
      go(q.next || '/me?tab=account');
    });
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
    [/^\/moving$/, () => [viewMoving(), mountMoving]],
    [/^\/me$/, q => [viewMe(q), mountMe]],
    [/^\/user\/([\w-]+)$/, (q, id) => [viewUser(id), () => bindContact($app)]],
    [/^\/chat(?:\/([\w-]+))?$/, (q, id) => [viewChat(id), () => mountChat(id)]],
    [/^\/pricing$/, q => [viewPricing(q), () => mountPricing(q)]],
    [/^\/notifications$/, q => [viewNotifications(q), mountNotifications]],
    [/^\/reviews$/, q => [viewReviews(q), mountReviews]],
    [/^\/login$/, q => [viewLogin(q), () => mountLogin(q)]],
    [/^\/register$/, q => [viewRegister(q), () => mountRegister(q)]],
  ];

  let lastPath = null;
  function render() {
    const path = currentPath();
    const q = currentQuery();
    renderHeader();
    renderSideAds(path === '/' || path === '/search' || path.startsWith('/item/') || path === '/moving' || path === '/pricing');
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
