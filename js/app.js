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
    document.getElementById('header').innerHTML = `
      <div class="container header-inner">
        <a href="#/" class="logo"><span class="logo-mark">♻</span><span>Chợ Trọ</span></a>
        <button class="cluster-pill" id="clusterBtn" title="Đổi cụm giao dịch">📍 ${esc(cl.name)} <span class="caret">▾</span></button>
        <form class="search" id="headerSearch">
          <input name="q" placeholder="Tìm bàn học, nồi cơm, giáo trình..." value="${esc(currentQuery().q || '')}" autocomplete="off">
          <button aria-label="Tìm">🔍</button>
        </form>
        <nav class="header-actions">
          <a href="#/moving" class="hdr-link hide-sm">📦 Thanh lý chuyển trọ</a>
          ${me ? `<a href="#/chat" class="icon-btn hide-sm" title="Tin nhắn">💬${unread ? `<span class="dot">${unread}</span>` : ''}</a>` : ''}
          <a href="#/post" class="btn primary hide-sm">+ Đăng tin</a>
          ${me ? `<div class="menu-wrap"><button class="avatar-btn" id="meBtn">${avatar(me)}</button>
            <div class="menu" id="meMenu">
              <div class="menu-head">${esc(me.name)}<div class="small muted">${esc(me.email)}</div></div>
              <a href="#/me">Tin của tôi</a>
              <a href="#/me?tab=reserved">Đang đặt giữ</a>
              <a href="#/me?tab=reviews">Đánh giá</a>
              <a href="#/me?tab=account">Tài khoản & xác thực</a>
              <a href="#/user/${me.id}">Trang cá nhân công khai</a>
              <button id="logoutBtn">Đăng xuất</button>
            </div></div>` : `<a href="#/login" class="btn ghost hide-sm">Đăng nhập</a>`}
        </nav>
      </div>`;

    document.getElementById('bottomNav').innerHTML = `
      <a href="#/" data-nav="/">🏠<span>Trang chủ</span></a>
      <a href="#/search" data-nav="/search">🔍<span>Tìm</span></a>
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
      meBtn.onclick = e => { e.stopPropagation(); document.getElementById('meMenu').classList.toggle('open'); };
      document.getElementById('logoutBtn').onclick = () => { api.logout(); toast('Đã đăng xuất'); go('/'); render(); };
    }
  }
  document.addEventListener('click', () => { const m = document.getElementById('meMenu'); if (m) m.classList.remove('open'); });

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
  function viewHome() {
    const me = api.currentUser();
    const cid = api.activeClusterId();
    const cl = R.cluster(cid);
    const st = api.stats(cid);
    const near = api.searchListings({ sort: 'priority' }).slice(0, 8);
    const fresh = api.searchListings({ sort: 'new' }).slice(0, 8);
    const free = api.searchListings({ type: 'free', sort: 'near' }).slice(0, 4);
    const movers = api.movingSellers(cid);
    const pending = me ? api.pendingReviews() : [];

    return `
    <section class="hero">
      <div class="container hero-inner">
        <div>
          <h1>Đồ cũ sinh viên <span class="hl">${esc(cl.name)}</span>,<br>mua gần – bán nhanh – tặng dễ.</h1>
          <p class="lead">Bán, trao đổi và cho tặng đồ dùng giữa sinh viên cùng trường, cùng khu trọ. Gặp trực tiếp, kiểm tra tận tay, không lo phí ship.</p>
          <form class="hero-search" id="heroSearch">
            <input name="q" placeholder="Bạn đang cần gì? VD: quạt, bàn học, giáo trình...">
            <button class="btn primary">Tìm kiếm</button>
          </form>
          <div class="hero-stats">
            <div><b>${st.active}</b><span>tin đang đăng</span></div>
            <div><b>${st.free}</b><span>món cho tặng</span></div>
            <div><b>${st.verifiedUsers}</b><span>SV đã xác thực</span></div>
            <div><b>${st.done}</b><span>giao dịch xong</span></div>
          </div>
        </div>
        <div class="hero-card">
          ${me ? `<div class="hc-user">${avatar(me, 'lg')}<div><b>Chào ${esc(me.name.split(' ').pop())}!</b>
            <div class="small">${esc(me.school)} · ${esc(areaName(me.cluster, me.area))}</div>${verifiedBadge(me)}</div></div>
            ${!me.verified.student ? '<a href="#/me?tab=account" class="notice warn">Xác thực sinh viên để tăng độ tin cậy cho tin đăng của bạn →</a>' : ''}
            ${pending.length ? `<a href="#/me?tab=reviews" class="notice">Bạn có ${pending.length} giao dịch chưa đánh giá →</a>` : ''}
            <a href="#/post" class="btn primary block">+ Đăng tin mới</a>
            <a href="#/moving" class="btn ghost block">📦 Tôi sắp chuyển trọ</a>`
          : `<h3>Bắt đầu trong 1 phút</h3>
            <ol class="steps-mini"><li>Đăng ký, chọn cụm ${esc(cl.name)}</li><li>Xác thực sinh viên</li><li>Đăng bán hoặc tìm đồ gần bạn</li></ol>
            <a href="#/register" class="btn primary block">Tạo tài khoản</a>
            <a href="#/login" class="btn ghost block">Đăng nhập</a>`}
        </div>
      </div>
    </section>

    <div class="container">
      <section class="cats">
        ${R.categories.map(c => `<a href="#/search${qs({ cat: c.id })}" class="cat"><span class="cat-ic" style="background:${c.color[0]}">${c.icon}</span><span>${c.name}</span></a>`).join('')}
        <a href="#/search${qs({ type: 'free' })}" class="cat"><span class="cat-ic" style="background:#d1fae5">🎁</span><span>Cho tặng</span></a>
        <a href="#/search${qs({ type: 'trade' })}" class="cat"><span class="cat-ic" style="background:#fef3c7">🔁</span><span>Trao đổi</span></a>
      </section>

      ${movers.length ? `<a href="#/moving" class="moving-banner">
        <div><b>📦 ${movers.length} bạn đang thanh lý chuyển trọ</b>
        <div>Mua theo combo rẻ hơn mua lẻ · Người gần nhất chuyển đi trong ${timeLeft(movers[0].user.moving.date)}</div></div>
        <span class="btn light">Xem ngay →</span></a>` : ''}

      <section class="section">
        <div class="section-head"><h2>Gợi ý gần bạn</h2><a href="#/search${qs({ sort: 'priority' })}">Xem tất cả →</a></div>
        <p class="muted small sub">Ưu tiên tin nổi bật, cùng khu trọ, cùng trường và khoảng cách gần.</p>
        ${grid(near)}
      </section>

      ${free.length ? `<section class="section">
        <div class="section-head"><h2>🎁 Cho tặng miễn phí</h2><a href="#/search${qs({ type: 'free' })}">Xem tất cả →</a></div>
        ${grid(free)}
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h2>Mới đăng</h2><a href="#/search${qs({ sort: 'new' })}">Xem tất cả →</a></div>
        ${grid(fresh)}
      </section>

      <section class="section how">
        <h2>Sàn hoạt động thế nào?</h2>
        <div class="how-grid">
          ${[
            ['📝', 'Đăng ký & chọn cụm', 'Chọn Hòa Lạc hoặc Cầu Giấy, xác thực email/thẻ sinh viên.'],
            ['📸', 'Đăng tin chuẩn', 'Ảnh, giá, tình trạng, vị trí, thời gian sử dụng. Bán, đổi hoặc tặng.'],
            ['🔎', 'Tìm đồ gần', 'Lọc theo trường, khu trọ, danh mục, giá và khoảng cách.'],
            ['💬', 'Nhắn tin & đặt giữ', 'Thương lượng, đặt giữ và hẹn điểm gặp công khai.'],
            ['🤝', 'Gặp & kiểm tra', 'Xem hàng tận tay rồi mới trả tiền.'],
            ['⭐', 'Đánh giá nhau', 'Cập nhật đã giao dịch và đánh giá để xây dựng uy tín.'],
          ].map(([i, t, d], n) => `<div class="how-step"><span class="how-n">${n + 1}</span><div class="how-ic">${i}</div><b>${t}</b><p>${d}</p></div>`).join('')}
        </div>
      </section>
    </div>`;
  }
  function mountHome() {
    const f = document.getElementById('heroSearch');
    f.onsubmit = e => { e.preventDefault(); go('/search' + qs({ q: f.q.value.trim() })); };
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
        <button class="btn boost" data-act="boost">⚡ Đẩy tin</button>`;
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

          <a class="panel seller" href="#/user/${seller.id}">
            ${avatar(seller, 'lg')}
            <div>
              <b>${esc(seller.name)}</b>
              <div>${verifiedBadge(seller)}</div>
              <div>${stars(rt.avg, rt.count)}</div>
              <div class="small muted">${esc(seller.school)} · Tham gia ${fmtDate(seller.joinedAt)}</div>
            </div>
          </a>

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
      boost: () => openBoost(l),
      report: () => openReport(l),
    };
    document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act[b.dataset.act]());
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
        if (buyer) go('/me?tab=reviews'); else render();
      });
    });
  }

  function openBoost(l) {
    modal('⚡ Đẩy tin nổi bật', `
      <p class="muted">Tin được ưu tiên đầu bảng tin và kết quả tìm kiếm trong cụm ${R.cluster(l.cluster).name}.</p>
      <div class="plans">
        <button class="plan" data-days="3"><b>3 ngày</b><span class="price">5.000đ</span></button>
        <button class="plan best" data-days="7"><em>Tiết kiệm</em><b>7 ngày</b><span class="price">10.000đ</span></button>
      </div>
      ${l.boosted ? `<p class="small">Tin đang nổi bật thêm ${timeLeft(l.boostUntil)} — gói mới sẽ cộng dồn.</p>` : ''}
      <p class="small muted">* Giá thử nghiệm. Đây là thanh toán mô phỏng, không trừ tiền thật.</p>`, (m, close) => {
      m.querySelectorAll('.plan').forEach(b => b.onclick = guard(() => {
        api.boost(l.id, Number(b.dataset.days));
        close();
        toast(`Đã đẩy tin ${b.dataset.days} ngày`, 'ok');
        render();
      }));
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

    f.onsubmit = guard(e => {
      e.preventDefault();
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
    });

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
          <p class="muted">Không có thời gian? Đội ngũ Chợ Trọ hỗ trợ chụp ảnh, định giá, đăng bán theo combo và tìm người mua giúp bạn.</p>
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
          <div class="partners">${partners.map(p => `<div class="partner"><span class="partner-ic">${p.icon}</span><div><b>${esc(p.name)}</b><div class="small muted">${esc(p.desc)}</div></div></div>`).join('')}</div>
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
    const tabs = [['listings', 'Tin của tôi', mine.length], ['reserved', 'Đang đặt giữ', api.myReservations().filter(l => l.status === 'reserved').length], ['reviews', 'Đánh giá', pending.length], ['account', 'Tài khoản & xác thực', 0]];

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
      <div class="tabs">${tabs.map(([k, t, n]) => `<a href="#/me?tab=${k}" class="${k === tab ? 'active' : ''}">${t}${n ? ` <span class="count">${n}</span>` : ''}</a>`).join('')}</div>
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
    on('[data-boost]', b => openBoost(api.getListing(b.dataset.boost)));
    on('[data-sold]', b => openMarkSold(api.getListing(b.dataset.sold)));
    on('[data-reopen]', b => { api.reopen(b.dataset.reopen); toast('Đã mở bán lại', 'ok'); render(); });
    on('[data-unres]', b => { if (confirm('Hủy giữ chỗ?')) { api.cancelReservation(b.dataset.unres); toast('Đã hủy giữ chỗ'); render(); } });
    on('[data-msg]', b => go('/chat/' + api.startConversation(b.dataset.msg).id));
    on('[data-review]', b => openReview(b.dataset.review, b.dataset.to));

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

  function reviewList(rs) {
    if (!rs.length) return '<div class="empty">Chưa có đánh giá nào.</div>';
    return `<div class="reviews">${rs.map(r => {
      const u = api.getUser(r.from);
      return `<div class="review">${avatar(u, 'sm')}<div><b>${esc(u ? u.name : 'Người dùng')}</b> <span class="stars">${'★'.repeat(r.stars)}<span class="off">${'★'.repeat(5 - r.stars)}</span></span>
        <div>${esc(r.text)}</div><div class="small muted">${timeAgo(r.createdAt)}</div></div></div>`;
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
    [/^\/user\/([\w-]+)$/, (q, id) => [viewUser(id), null]],
    [/^\/chat(?:\/([\w-]+))?$/, (q, id) => [viewChat(id), () => mountChat(id)]],
    [/^\/login$/, q => [viewLogin(q), () => mountLogin(q)]],
    [/^\/register$/, q => [viewRegister(q), () => mountRegister(q)]],
  ];

  let lastPath = null;
  function render() {
    const path = currentPath();
    const q = currentQuery();
    renderHeader();
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
