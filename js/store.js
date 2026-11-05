/*
 * Lớp "API giả" — toàn bộ đọc/ghi dữ liệu đi qua đối tượng `api` này.
 * Hiện dữ liệu lưu ở localStorage. Khi làm backend, chỉ cần thay phần thân
 * các hàm bằng lời gọi fetch() tới REST API tương ứng (ghi chú ở mỗi hàm).
 */
window.api = (function () {
  const DB_KEY = 'remarket_db_v3';
  const SESSION_KEY = 'remarket_session_v1';
  const H = 3600 * 1000;
  const D = 24 * H;

  let db = load();

  function seed() {
    const m = JSON.parse(JSON.stringify(window.MOCK));
    return {
      users: m.users,
      listings: m.listings,
      reviews: m.reviews,
      conversations: m.conversations,
      notifications: m.notifications,
      payments: m.payments,
      reports: [],
      serviceRequests: [],
      guestCluster: 'hoalac',
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* bỏ qua, seed lại */ }
    const s = seed();
    persist(s);
    return s;
  }

  function persist(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data || db));
    } catch (e) {
      throw new Error('Bộ nhớ trình duyệt đã đầy (ảnh quá lớn?). Hãy bớt ảnh hoặc bấm "Khôi phục dữ liệu mẫu".');
    }
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ---------- Tham chiếu tĩnh ----------
  const ref = {
    clusters: window.MOCK.clusters,
    categories: window.MOCK.categories,
    conditions: window.MOCK.conditions,
    partners: window.MOCK.partners,
    /*
     * Bảng giá theo "ReMarket - Mô hình tài chính.xlsx" (sheet Doanh thu).
     * Riêng banner 2 bên chưa có trong mô hình — đây là giá đề xuất, sửa tại đây.
     */
    pricing: {
      freePosts: 2,                                  // 2 tin đầu miễn phí mỗi tháng
      extraPosts: { price: 5000, posts: 2 },          // Phí đăng thêm tin: 5.000đ / 2 tin
      bump: { price: 5000 },                          // Đẩy tin: 5.000đ / lượt
      featured: { price: 10000, days: 3 },            // Tin ưu tiên (nổi bật): 10.000đ / 3 ngày
      partner: { price: 300000, unit: 'tháng' },      // Gói đối tác cửa hàng
      banner: { price: 200000, unit: 'tuần' },        // Banner 2 bên trang chủ (giá đề xuất)
    },
    cluster(id) { return this.clusters.find(c => c.id === id); },
    category(id) { return this.categories.find(c => c.id === id); },
    area(clusterId, areaId) {
      const c = this.cluster(clusterId);
      return c && c.areas.find(a => a.id === areaId);
    },
  };

  // ---------- Phiên đăng nhập ----------
  // POST /auth/login, POST /auth/register, GET /me
  function currentUser() {
    const id = localStorage.getItem(SESSION_KEY);
    return id ? db.users.find(u => u.id === id) || null : null;
  }

  function login(email, password) {
    const u = db.users.find(x => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.password !== password) throw new Error('Email hoặc mật khẩu không đúng.');
    localStorage.setItem(SESSION_KEY, u.id);
    return u;
  }

  function loginAs(userId) {
    localStorage.setItem(SESSION_KEY, userId);
    return currentUser();
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function register({ name, email, password, cluster, school, area }) {
    if (!name || !email || !password) throw new Error('Vui lòng điền đủ họ tên, email và mật khẩu.');
    if (password.length < 6) throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('Email này đã được đăng ký.');
    const u = {
      id: uid('u'), name: name.trim(), email: email.trim(), password, cluster, school, area,
      verified: { student: false, phone: false }, joinedAt: Date.now(), bio: '',
    };
    db.users.push(u);
    notify(u.id, 'system', `Chào mừng bạn đến ReMarket! Mỗi tháng bạn có ${ref.pricing.freePosts} tin đăng miễn phí.`, '#/pricing');
    persist();
    localStorage.setItem(SESSION_KEY, u.id);
    return u;
  }

  // PATCH /me
  function updateProfile(patch) {
    const u = currentUser();
    if (!u) throw new Error('Chưa đăng nhập.');
    Object.assign(u, patch);
    persist();
    return u;
  }

  // POST /me/verify  — mock: email .edu.vn với mã 123456, hoặc ảnh thẻ SV (duyệt ngay)
  function verifyStudentEmail(email, code) {
    if (!/\.edu\.vn$/i.test(email.trim())) throw new Error('Cần email sinh viên có đuôi .edu.vn');
    if (code !== '123456') throw new Error('Mã xác thực không đúng (mã demo: 123456).');
    return updateProfile({ verified: Object.assign({}, currentUser().verified, { student: true }) });
  }
  function verifyStudentCard() {
    return updateProfile({ verified: Object.assign({}, currentUser().verified, { student: true }) });
  }
  function verifyPhone(phone, code) {
    if (!/^0\d{9}$/.test(phone.trim())) throw new Error('Số điện thoại không hợp lệ.');
    if (code !== '123456') throw new Error('Mã OTP không đúng (mã demo: 123456).');
    return updateProfile({ verified: Object.assign({}, currentUser().verified, { phone: true }), phone: phone.trim() });
  }

  // ---------- Cụm ----------
  function activeClusterId() {
    const u = currentUser();
    return u ? u.cluster : db.guestCluster;
  }
  function setActiveCluster(id) {
    const u = currentUser();
    if (u) updateProfile({ cluster: id, school: ref.cluster(id).schools[0], area: ref.cluster(id).areas[0].id });
    else { db.guestCluster = id; persist(); }
  }

  // ---------- Người dùng & đánh giá ----------
  // GET /users/:id
  function getUser(id) { return db.users.find(u => u.id === id) || null; }
  function allUsers() { return db.users; }

  // GET /users/:id/reviews
  function reviewsFor(userId) {
    return db.reviews.filter(r => r.to === userId).sort((a, b) => b.createdAt - a.createdAt);
  }
  function reviewsBy(userId) {
    return db.reviews.filter(r => r.from === userId).sort((a, b) => b.createdAt - a.createdAt);
  }
  // Đánh giá mới nhất trong cụm (theo người được đánh giá)
  function recentReviews(clusterId, n) {
    return db.reviews
      .filter(r => { const u = getUser(r.to); return u && u.cluster === clusterId && r.text; })
      .sort((a, b) => b.createdAt - a.createdAt).slice(0, n || 6);
  }
  function rating(userId) {
    const rs = reviewsFor(userId);
    if (!rs.length) return { avg: 0, count: 0 };
    return { avg: rs.reduce((s, r) => s + r.stars, 0) / rs.length, count: rs.length };
  }

  // Giao dịch đã hoàn tất mà người dùng hiện tại chưa đánh giá đối phương
  function pendingReviews() {
    const me = currentUser();
    if (!me) return [];
    return db.listings
      .filter(l => l.status === 'sold' && l.soldTo && (l.seller === me.id || l.soldTo === me.id))
      .filter(l => !db.reviews.some(r => r.from === me.id && r.listingId === l.id))
      .map(l => ({ listing: l, other: getUser(l.seller === me.id ? l.soldTo : l.seller) }));
  }

  // POST /reviews
  function addReview(listingId, toUserId, stars, text) {
    const me = currentUser();
    if (!me) throw new Error('Chưa đăng nhập.');
    db.reviews.push({ id: uid('r'), from: me.id, to: toUserId, listingId, stars, text: text.trim(), createdAt: Date.now() });
    notify(toUserId, 'review', `${me.name} đã đánh giá bạn ${stars}★${text.trim() ? `: “${text.trim()}”` : '.'}`, '#/reviews?tab=received');
    persist();
  }

  // ---------- Tin đăng ----------
  function distanceKm(l, fromUser) {
    const c = ref.cluster(l.cluster);
    const a = ref.area(l.cluster, l.area) || { x: 0, y: 0 };
    let o = { x: 0, y: 0 };
    if (fromUser && fromUser.cluster === l.cluster) o = ref.area(fromUser.cluster, fromUser.area) || o;
    if (!c) return 0;
    return Math.round((Math.hypot(a.x - o.x, a.y - o.y) + (l.jitter || 0)) * 10) / 10;
  }

  function isBoosted(l) { return l.boostUntil && l.boostUntil > Date.now(); }
  const freshAt = l => Math.max(l.createdAt, l.bumpedAt || 0);  // đẩy tin = làm mới thời gian

  function expireReservations() {
    let changed = false;
    db.listings.forEach(l => {
      if (l.status === 'reserved' && l.reservedUntil && l.reservedUntil < Date.now()) {
        l.status = 'available'; l.reservedBy = null; l.reservedUntil = 0; l.meetPoint = ''; changed = true;
      }
    });
    if (changed) persist();
  }

  /*
   * GET /listings?cluster=&q=&cat=&type=&min=&max=&school=&area=&dist=&cond=&sort=
   * sort: 'priority' (mặc định: nổi bật → cùng khu trọ → cùng trường → gần → mới), 'near', 'new', 'priceAsc', 'priceDesc'
   */
  function searchListings(f = {}) {
    expireReservations();
    const me = currentUser();
    const cluster = f.cluster || activeClusterId();
    const q = (f.q || '').trim().toLowerCase();
    let rs = db.listings.filter(l => l.cluster === cluster);
    rs = rs.filter(l => f.includeSold ? true : l.status !== 'sold');
    if (q) rs = rs.filter(l => (l.title + ' ' + l.desc + ' ' + (l.tradeFor || '') + ' ' + (l.combo || []).map(i => i.name).join(' ')).toLowerCase().includes(q));
    if (f.cat) rs = rs.filter(l => l.cat === f.cat);
    if (f.type) rs = rs.filter(l => l.type === f.type);
    if (f.school) rs = rs.filter(l => l.school === f.school);
    if (f.area) rs = rs.filter(l => l.area === f.area);
    if (f.cond) rs = rs.filter(l => l.condition === f.cond);
    if (f.moving) rs = rs.filter(l => l.movingSale);
    if (f.combo) rs = rs.filter(l => l.combo && l.combo.length);
    if (f.min) rs = rs.filter(l => l.type !== 'sell' || l.price >= Number(f.min));
    if (f.max) rs = rs.filter(l => l.type !== 'sell' || l.price <= Number(f.max));
    if (f.seller) rs = rs.filter(l => l.seller === f.seller);
    if (f.exclude) rs = rs.filter(l => l.id !== f.exclude);

    rs = rs.map(l => Object.assign({}, l, { distance: distanceKm(l, me), boosted: isBoosted(l) }));
    if (f.dist) rs = rs.filter(l => l.distance <= Number(f.dist));

    const sort = f.sort || 'priority';
    const score = l => {
      let s = 0;
      if (l.boosted) s += 100;
      if (me && l.area === me.area) s += 30;
      if (me && l.school === me.school) s += 15;
      s -= l.distance * 5;
      s -= (Date.now() - freshAt(l)) / D * 2;
      if (l.status === 'reserved') s -= 40;
      return s;
    };
    const cmp = {
      priority: (a, b) => score(b) - score(a),
      near: (a, b) => a.distance - b.distance,
      new: (a, b) => freshAt(b) - freshAt(a),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
    }[sort] || ((a, b) => score(b) - score(a));
    rs.sort(cmp);
    return rs;
  }

  // GET /listings/:id
  function getListing(id, countView) {
    expireReservations();
    const l = db.listings.find(x => x.id === id);
    if (!l) return null;
    if (countView) { l.views = (l.views || 0) + 1; persist(); }
    return Object.assign({}, l, { distance: distanceKm(l, currentUser()), boosted: isBoosted(l) });
  }

  function raw(id) {
    const l = db.listings.find(x => x.id === id);
    if (!l) throw new Error('Không tìm thấy tin đăng.');
    return l;
  }

  function assertOwner(l) {
    const me = currentUser();
    if (!me || l.seller !== me.id) throw new Error('Bạn không có quyền với tin này.');
    return me;
  }

  function validate(data) {
    if (!data.title || data.title.trim().length < 5) throw new Error('Tiêu đề cần tối thiểu 5 ký tự.');
    if (!data.cat) throw new Error('Chọn danh mục.');
    if (data.type === 'sell' && !(data.price > 0)) throw new Error('Nhập giá bán.');
    if (data.type === 'trade' && !data.tradeFor) throw new Error('Nhập món bạn muốn đổi lấy.');
    if (!data.condition) throw new Error('Chọn tình trạng.');
    if (!data.area) throw new Error('Chọn khu vực giao nhận.');
  }

  // POST /listings
  function createListing(data) {
    const me = currentUser();
    if (!me) throw new Error('Bạn cần đăng nhập để đăng tin.');
    validate(data);
    const q = quota();
    if (!q.freeLeft) {
      if (!q.credits) {
        const err = new Error(`Bạn đã dùng hết ${ref.pricing.freePosts} tin miễn phí tháng này. Mua thêm ${ref.pricing.extraPosts.posts} tin chỉ ${ref.pricing.extraPosts.price.toLocaleString('vi-VN')}đ.`);
        err.code = 'QUOTA';
        throw err;
      }
      me.postCredits -= 1;
    }
    const l = Object.assign({
      id: uid('l'), seller: me.id, cluster: me.cluster, status: 'available', views: 0,
      createdAt: Date.now(), jitter: Math.random() * 0.4, boostUntil: 0, reservedBy: null,
      reservedUntil: 0, meetPoint: '', soldTo: null,
    }, data);
    if (l.type !== 'sell') l.price = l.type === 'free' ? 0 : (l.price || 0);
    db.listings.unshift(l);
    persist();
    return l;
  }

  // PATCH /listings/:id
  function updateListing(id, data) {
    const l = raw(id);
    assertOwner(l);
    validate(Object.assign({}, l, data));
    Object.assign(l, data);
    if (l.type === 'free') l.price = 0;
    persist();
    return l;
  }

  // DELETE /listings/:id
  function deleteListing(id) {
    const l = raw(id);
    assertOwner(l);
    db.listings = db.listings.filter(x => x.id !== id);
    persist();
  }

  // POST /listings/:id/reserve
  function reserve(id, meetPoint, hours) {
    const me = currentUser();
    if (!me) throw new Error('Bạn cần đăng nhập để đặt giữ.');
    const l = raw(id);
    if (l.seller === me.id) throw new Error('Không thể tự đặt giữ tin của mình.');
    if (l.status !== 'available') throw new Error('Sản phẩm này đang được giữ hoặc đã giao dịch.');
    l.status = 'reserved';
    l.reservedBy = me.id;
    l.reservedUntil = Date.now() + (hours || 24) * H;
    l.meetPoint = meetPoint;
    notify(l.seller, 'deal', `${me.name} đã đặt giữ “${l.title}” – hẹn tại ${meetPoint}.`, '#/item/' + l.id);
    persist();
    const conv = startConversation(id);
    sendMessage(conv.id, `📌 Mình đã đặt giữ "${l.title}". Hẹn gặp tại: ${meetPoint}.`);
    return l;
  }

  // DELETE /listings/:id/reserve
  function cancelReservation(id) {
    const me = currentUser();
    const l = raw(id);
    if (!me || (l.reservedBy !== me.id && l.seller !== me.id)) throw new Error('Không có quyền.');
    notify(me.id === l.seller ? l.reservedBy : l.seller, 'deal', `${me.name} đã hủy giữ chỗ “${l.title}”.`, '#/item/' + l.id);
    l.status = 'available'; l.reservedBy = null; l.reservedUntil = 0; l.meetPoint = '';
    persist();
  }

  // POST /listings/:id/complete
  function markSold(id, buyerId) {
    const l = raw(id);
    assertOwner(l);
    l.status = 'sold';
    l.soldTo = buyerId || l.reservedBy || null;
    l.soldAt = Date.now();
    l.reservedUntil = 0;
    if (l.soldTo) notify(l.soldTo, 'review', `Giao dịch “${l.title}” đã hoàn tất. Hãy đánh giá người bán để xây dựng uy tín cộng đồng.`, '#/reviews');
    persist();
  }

  function reopen(id) {
    const l = raw(id);
    assertOwner(l);
    l.status = 'available'; l.soldTo = null; l.reservedBy = null; l.meetPoint = '';
    persist();
  }

  // GET /me/quota — số tin miễn phí còn lại trong tháng + lượt đã mua
  function quota() {
    const me = currentUser();
    if (!me) return { used: 0, freeLeft: 0, credits: 0 };
    const d = new Date();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const used = db.listings.filter(l => l.seller === me.id && l.createdAt >= monthStart).length;
    return { used, freeLeft: Math.max(0, ref.pricing.freePosts - used), credits: me.postCredits || 0 };
  }

  /*
   * POST /payments  — thanh toán mô phỏng
   * kind: 'posts' (mua thêm tin) | 'bump' (đẩy tin) | 'featured' (tin nổi bật) | 'partner' | 'banner'
   */
  function pay(kind, opts) {
    const me = currentUser();
    if (!me) throw new Error('Bạn cần đăng nhập.');
    opts = opts || {};
    const P = ref.pricing;
    let amount = 0, desc = '', l = null;
    if (kind === 'posts') {
      amount = P.extraPosts.price; desc = `Mua thêm ${P.extraPosts.posts} tin đăng`;
      me.postCredits = (me.postCredits || 0) + P.extraPosts.posts;
    } else if (kind === 'bump') {
      l = raw(opts.listingId); assertOwner(l);
      amount = P.bump.price; desc = 'Đẩy tin lên đầu';
      l.bumpedAt = Date.now();
    } else if (kind === 'featured') {
      l = raw(opts.listingId); assertOwner(l);
      amount = P.featured.price; desc = `Tin nổi bật ${P.featured.days} ngày`;
      l.boostUntil = Math.max(Date.now(), l.boostUntil || 0) + P.featured.days * D;
    } else if (kind === 'partner') {
      amount = P.partner.price; desc = 'Gói đối tác cửa hàng 1 tháng' + (opts.shop ? ` – ${opts.shop}` : '');
      db.serviceRequests.push({ id: uid('sr'), type: 'partner', at: Date.now(), by: me.id, shop: opts.shop || '', phone: opts.phone || '' });
    } else if (kind === 'banner') {
      const weeks = Number(opts.weeks) || 1;
      amount = P.banner.price * weeks; desc = `Banner ${opts.side === 'right' ? 'bên phải' : 'bên trái'} ${weeks} tuần` + (opts.shop ? ` – ${opts.shop}` : '');
      db.serviceRequests.push({ id: uid('sr'), type: 'banner', at: Date.now(), by: me.id, side: opts.side, weeks, shop: opts.shop || '' });
    } else throw new Error('Gói không hợp lệ.');
    const p = { id: uid('p'), user: me.id, kind, amount, method: opts.method || 'MoMo', listingId: l ? l.id : null, desc, at: Date.now() };
    db.payments.push(p);
    notify(me.id, 'pay', `Thanh toán thành công ${amount.toLocaleString('vi-VN')}đ – ${desc}${l ? ` cho “${l.title}”` : ''}.`, l ? '#/item/' + l.id : '#/me?tab=payments');
    persist();
    return p;
  }
  function myPayments() {
    const me = currentUser();
    return me ? db.payments.filter(p => p.user === me.id).sort((a, b) => b.at - a.at) : [];
  }

  // Tin nổi bật (đã trả phí) trong cụm
  function featuredListings(clusterId) {
    return searchListings({ cluster: clusterId, sort: 'priority' }).filter(l => l.boosted);
  }

  // ---------- Thông báo ----------
  // GET /notifications
  function notify(to, kind, text, link) {
    if (!to) return;
    db.notifications = db.notifications || [];
    db.notifications.push({ id: uid('n'), to, kind, text, link: link || '', at: Date.now(), read: false });
  }
  function notifications() {
    const me = currentUser();
    if (!me) return [];
    // Nhắc tin nổi bật sắp hết hạn (< 24 giờ)
    let changed = false;
    db.listings.forEach(l => {
      if (l.seller === me.id && isBoosted(l) && l.boostUntil - Date.now() < D) {
        const key = 'exp' + l.id + l.boostUntil;
        if (!db.notifications.some(n => n.key === key)) {
          db.notifications.push({ id: uid('n'), key, to: me.id, kind: 'system', text: `Tin nổi bật “${l.title}” sắp hết hạn. Gia hạn ${ref.pricing.featured.price.toLocaleString('vi-VN')}đ/${ref.pricing.featured.days} ngày để giữ vị trí.`, link: '#/item/' + l.id, at: Date.now(), read: false });
          changed = true;
        }
      }
    });
    if (changed) persist();
    return db.notifications.filter(n => n.to === me.id).sort((a, b) => b.at - a.at);
  }
  function unreadNotifications() { return notifications().filter(n => !n.read).length; }
  function markNotificationsRead(id) {
    notifications().forEach(n => { if (!id || n.id === id) n.read = true; });
    persist();
  }

  // POST /listings/:id/report
  function report(id, reason, note) {
    const me = currentUser();
    db.reports.push({ id: uid('rp'), listingId: id, by: me ? me.id : null, reason, note, at: Date.now() });
    if (me) notify(me.id, 'system', `Đã nhận báo cáo “${reason}”. Đội kiểm duyệt sẽ xử lý trong 24 giờ.`, '#/item/' + id);
    persist();
  }

  function myReservations() {
    const me = currentUser();
    if (!me) return [];
    return db.listings.filter(l => l.reservedBy === me.id && l.status === 'reserved')
      .concat(db.listings.filter(l => l.soldTo === me.id && l.status === 'sold'));
  }

  // GET /clusters/:id/moving-sellers
  function movingSellers(clusterId) {
    return db.users
      .filter(u => u.cluster === clusterId && u.moving && u.moving.date > Date.now() - D)
      .map(u => ({ user: u, listings: searchListings({ cluster: clusterId, seller: u.id, moving: true }) }))
      .filter(x => x.listings.length)
      .sort((a, b) => a.user.moving.date - b.user.moving.date);
  }

  // POST /service-requests (dịch vụ thanh lý phòng trọ)
  function requestService(data) {
    db.serviceRequests.push(Object.assign({ id: uid('sr'), at: Date.now(), by: (currentUser() || {}).id }, data));
    persist();
  }

  // ---------- Tin nhắn ----------
  // GET /conversations
  function conversations() {
    const me = currentUser();
    if (!me) return [];
    return db.conversations
      .filter(c => c.members.includes(me.id))
      .sort((a, b) => lastAt(b) - lastAt(a));
  }
  function lastAt(c) { return c.messages.length ? c.messages[c.messages.length - 1].at : 0; }
  function getConversation(id) { return db.conversations.find(c => c.id === id) || null; }

  function unreadCount(c) {
    const me = currentUser();
    if (!me) return 0;
    const seen = (c.readBy && c.readBy[me.id]) || 0;
    return c.messages.filter(m => m.from !== me.id && m.at > seen).length;
  }
  function totalUnread() { return conversations().reduce((s, c) => s + unreadCount(c), 0); }

  function markRead(id) {
    const me = currentUser();
    const c = getConversation(id);
    if (!me || !c) return;
    c.readBy = c.readBy || {};
    c.readBy[me.id] = Date.now();
    persist();
  }

  // POST /conversations {listingId}
  function startConversation(listingId) {
    const me = currentUser();
    if (!me) throw new Error('Bạn cần đăng nhập để nhắn tin.');
    const l = raw(listingId);
    if (l.seller === me.id) throw new Error('Đây là tin của bạn.');
    let c = db.conversations.find(x => x.listingId === listingId && x.members.includes(me.id));
    if (!c) {
      c = { id: uid('c'), listingId, members: [me.id, l.seller], readBy: {}, messages: [] };
      db.conversations.push(c);
      persist();
    }
    return c;
  }

  // POST /conversations/:id/messages
  function sendMessage(convId, text) {
    const me = currentUser();
    const c = getConversation(convId);
    if (!me || !c || !text.trim()) return;
    c.messages.push({ from: me.id, text: text.trim(), at: Date.now() });
    c.readBy = c.readBy || {};
    c.readBy[me.id] = Date.now();
    persist();
  }

  // Mock: người bên kia tự trả lời để demo luồng chat
  const autoReplies = [
    'Còn bạn nhé, bạn muốn qua xem lúc nào?',
    'Mình để giá sinh viên rồi, bớt thêm chút xíu được nha 😄',
    'Bạn qua khoảng 5–7h tối là mình ở nhà.',
    'Ok bạn, hẹn gặp nhé!',
    'Hàng vẫn dùng tốt, bạn cứ qua kiểm tra trước rồi mới trả tiền.',
  ];
  function simulateReply(convId) {
    const me = currentUser();
    const c = getConversation(convId);
    if (!me || !c) return;
    const other = c.members.find(m => m !== me.id);
    const t = c.messages[c.messages.length - 1].text.toLowerCase();
    let text = autoReplies[Math.floor(Math.random() * autoReplies.length)];
    if (t.includes('bớt') || t.includes('giảm')) text = autoReplies[1];
    else if (t.includes('còn')) text = autoReplies[0];
    else if (t.includes('đặt giữ')) text = 'Ok bạn, mình giữ cho bạn nhé. Đến nơi nhắn mình.';
    else if (t.includes('ở đâu') || t.includes('gặp')) text = 'Mình ở ' + (ref.area(getUser(other).cluster, getUser(other).area) || {}).name + ', gặp ở cổng trường cho tiện nha.';
    c.messages.push({ from: other, text, at: Date.now() });
    persist();
  }

  function resetDemo() {
    db = seed();
    persist();
    localStorage.removeItem(SESSION_KEY);
  }

  function stats(clusterId) {
    const ls = db.listings.filter(l => l.cluster === clusterId);
    return {
      active: ls.filter(l => l.status !== 'sold').length,
      free: ls.filter(l => l.type === 'free' && l.status !== 'sold').length,
      verifiedUsers: db.users.filter(u => u.cluster === clusterId && u.verified.student).length,
      done: ls.filter(l => l.status === 'sold').length,
    };
  }

  return {
    ref, currentUser, login, loginAs, logout, register, updateProfile,
    verifyStudentEmail, verifyStudentCard, verifyPhone,
    activeClusterId, setActiveCluster,
    getUser, allUsers, reviewsFor, reviewsBy, recentReviews, rating, pendingReviews, addReview,
    searchListings, getListing, createListing, updateListing, deleteListing, featuredListings,
    reserve, cancelReservation, markSold, reopen, report, myReservations,
    quota, pay, myPayments, notifications, unreadNotifications, markNotificationsRead,
    movingSellers, requestService,
    conversations, getConversation, unreadCount, totalUnread, markRead, startConversation, sendMessage, simulateReply,
    resetDemo, stats,
  };
})();
