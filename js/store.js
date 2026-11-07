/*
 * Lớp "API giả" — toàn bộ đọc/ghi dữ liệu đi qua đối tượng `api` này.
 * Hiện dữ liệu lưu ở localStorage. Khi làm backend, chỉ cần thay phần thân
 * các hàm bằng lời gọi fetch() tới REST API tương ứng (ghi chú ở mỗi hàm).
 *
 * Phạm vi bám theo báo cáo cp4: xác thực email, đăng trước – kiểm duyệt sau,
 * người bán tự xác nhận trạng thái, tin tự ẩn sau 30 ngày, 4 dịch vụ trả phí,
 * không đặt giữ, không đánh giá (lộ trình 2028), không thu hoa hồng.
 */
window.api = (function () {
  const DB_KEY = 'remarket_db_v6';
  const SESSION_KEY = 'remarket_session_v1';
  const H = 3600 * 1000;
  const D = 24 * H;
  const LISTING_DAYS = 30;     // tin không cập nhật sau 30 ngày sẽ tự ẩn
  const DEMO_CODE = '123456';  // mã xác thực email trong bản demo

  let db = load();

  function seed() {
    const m = JSON.parse(JSON.stringify(window.MOCK));
    // Số tin bán / trao đổi mỗi tài khoản đã đăng (tin cho tặng không tính vào hạn mức)
    m.users.forEach(u => { u.postsUsed = m.listings.filter(l => l.seller === u.id && l.type !== 'free').length; });
    return {
      users: m.users,
      listings: m.listings,
      reports: m.reports,
      conversations: m.conversations,
      notifications: m.notifications,
      payments: m.payments,
      bannerRequests: [],
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
    advertisers: window.MOCK.advertisers,
    listingDays: LISTING_DAYS,
    /* Bảng giá theo cp4 mục 3.5 */
    pricing: {
      freePosts: 2,                                      // 2 tin bán / trao đổi miễn phí cho mỗi tài khoản; tin cho tặng không tính
      extraPosts: { price: 5000, posts: 2 },             // Mua thêm tin: 5.000đ / gói 2 tin
      bump: { price: 5000 },                             // Đẩy tin: 5.000đ / lượt
      featured: { price: 10000, days: 3 },               // Tin ưu tiên: 10.000đ / 3 ngày
      banner: { price: 300000, unit: 'tháng' },          // Banner đối tác: 300.000đ / tháng / vị trí
    },
    cluster(id) { return this.clusters.find(c => c.id === id) || this.clusters[0]; },
    category(id) { return this.categories.find(c => c.id === id); },
    area(clusterId, areaId) {
      const c = this.cluster(clusterId);
      return c && c.areas.find(a => a.id === areaId);
    },
  };

  // ---------- Phiên đăng nhập ----------
  // POST /auth/login, POST /auth/register, POST /auth/verify-email, GET /me
  function currentUser() {
    const id = localStorage.getItem(SESSION_KEY);
    return id ? db.users.find(u => u.id === id) || null : null;
  }
  const isAdmin = u => !!(u && u.role === 'admin');

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

  function register({ name, email, password, school, area }) {
    if (!name || !email || !password) throw new Error('Vui lòng điền đủ họ tên, email và mật khẩu.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) throw new Error('Email không hợp lệ.');
    if (password.length < 6) throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
    if (db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Email này đã được đăng ký.');
    const u = {
      id: uid('u'), name: name.trim(), email: email.trim(), password, cluster: 'hoalac', school, area,
      emailVerified: false, joinedAt: Date.now(), bio: '', phone: '', showPhone: false, postsUsed: 0,
    };
    db.users.push(u);
    persist();
    localStorage.setItem(SESSION_KEY, u.id);
    return u;
  }

  // POST /auth/verify-email
  function verifyEmail(code) {
    const u = currentUser();
    if (!u) throw new Error('Chưa đăng nhập.');
    if (String(code).trim() !== DEMO_CODE) throw new Error(`Mã xác thực không đúng (mã demo: ${DEMO_CODE}).`);
    u.emailVerified = true;
    notify(u.id, 'system', `Chào mừng bạn đến ReMarket! Tài khoản của bạn có ${ref.pricing.freePosts} tin bán / trao đổi miễn phí; tin cho tặng luôn miễn phí và không tính vào hạn mức.`, '#/pricing');
    persist();
    return u;
  }

  // PATCH /me
  function updateProfile(patch) {
    const u = currentUser();
    if (!u) throw new Error('Chưa đăng nhập.');
    if (patch.phone && !/^0\d{9}$/.test(patch.phone.trim())) throw new Error('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).');
    Object.assign(u, patch);
    persist();
    return u;
  }

  function activeClusterId() { return 'hoalac'; }

  // ---------- Người dùng ----------
  // GET /users/:id
  function getUser(id) { return db.users.find(u => u.id === id) || null; }
  function allUsers() { return db.users; }

  // ---------- Tin đăng ----------
  function distanceKm(l, fromUser) {
    const a = ref.area(l.cluster, l.area) || { x: 0, y: 0 };
    let o = { x: 0, y: 0 };
    if (fromUser) o = ref.area(fromUser.cluster, fromUser.area) || o;
    return Math.round((Math.hypot(a.x - o.x, a.y - o.y) + (l.jitter || 0)) * 10) / 10;
  }

  function isBoosted(l) { return l.boostUntil && l.boostUntil > Date.now(); }
  const freshAt = l => Math.max(l.createdAt, l.bumpedAt || 0);                        // đẩy tin = làm mới thứ tự
  const refreshedAt = l => Math.max(l.createdAt, l.renewedAt || 0, l.bumpedAt || 0);   // mốc tính 30 ngày
  const expiresAt = l => refreshedAt(l) + LISTING_DAYS * D;

  // Tin đang hiển thị quá 30 ngày không cập nhật → tự ẩn, báo người bán gia hạn miễn phí
  function expireListings() {
    let changed = false;
    db.listings.forEach(l => {
      if (l.status === 'available' && expiresAt(l) < Date.now()) {
        l.status = 'expired';
        l.expiredAt = Date.now();
        notify(l.seller, 'status', `Tin “${l.title}” đã tự ẩn vì ${LISTING_DAYS} ngày chưa cập nhật. Gia hạn miễn phí nếu món đồ vẫn còn.`, '#/me');
        changed = true;
      }
    });
    if (changed) persist();
  }

  function decorate(l, me) {
    return Object.assign({}, l, { distance: distanceKm(l, me), boosted: isBoosted(l), expiresAt: expiresAt(l) });
  }

  /*
   * GET /listings?q=&cat=&type=&min=&max=&school=&area=&dist=&cond=&sort=
   * Mặc định chỉ trả tin đang hiển thị. statuses: danh sách trạng thái (dùng cho trang của người bán).
   * sort: 'priority' (mặc định: ưu tiên → cùng khu trọ → cùng trường → gần → mới), 'near', 'new', 'priceAsc', 'priceDesc'
   */
  function searchListings(f = {}) {
    expireListings();
    const me = currentUser();
    const q = (f.q || '').trim().toLowerCase();
    const statuses = f.statuses || ['available'];
    let rs = db.listings.filter(l => statuses.includes(l.status));
    if (q) rs = rs.filter(l => (l.title + ' ' + l.desc + ' ' + (l.tradeFor || '')).toLowerCase().includes(q));
    if (f.cat) rs = rs.filter(l => l.cat === f.cat);
    // Cho tặng là mục riêng: chỉ trả về khi hỏi type=free hoặc includeFree
    if (f.type) rs = rs.filter(l => l.type === f.type);
    else if (!f.includeFree) rs = rs.filter(l => l.type !== 'free');
    if (f.school) rs = rs.filter(l => l.school === f.school);
    if (f.area) rs = rs.filter(l => l.area === f.area);
    if (f.cond) rs = rs.filter(l => l.condition === f.cond);
    if (f.min) rs = rs.filter(l => l.type !== 'sell' || l.price >= Number(f.min));
    if (f.max) rs = rs.filter(l => l.type !== 'sell' || l.price <= Number(f.max));
    if (f.seller) rs = rs.filter(l => l.seller === f.seller);
    if (f.exclude) rs = rs.filter(l => l.id !== f.exclude);

    rs = rs.map(l => decorate(l, me));
    if (f.dist) rs = rs.filter(l => l.distance <= Number(f.dist));

    const score = l => {
      let s = 0;
      if (l.boosted) s += 100;
      if (me && l.area === me.area) s += 30;
      if (me && l.school === me.school) s += 15;
      s -= l.distance * 5;
      s -= (Date.now() - freshAt(l)) / D * 2;
      return s;
    };
    const cmp = {
      priority: (a, b) => score(b) - score(a),
      near: (a, b) => a.distance - b.distance,
      new: (a, b) => freshAt(b) - freshAt(a),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
    }[f.sort || 'priority'] || ((a, b) => score(b) - score(a));
    rs.sort(cmp);
    return rs;
  }

  // GET /listings/:id
  function getListing(id, countView) {
    expireListings();
    const l = db.listings.find(x => x.id === id);
    if (!l) return null;
    if (countView) { l.views = (l.views || 0) + 1; persist(); }
    return decorate(l, currentUser());
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
    if (!data.images || !data.images.length) throw new Error('Thêm ít nhất 1 ảnh thật của sản phẩm.');
    if (data.type === 'sell' && !(data.price > 0)) throw new Error('Nhập giá bán.');
    if (data.type === 'trade' && !data.tradeFor) throw new Error('Nhập món bạn muốn đổi lấy.');
    if (!data.condition) throw new Error('Chọn tình trạng.');
    if (!data.area) throw new Error('Chọn khu vực giao dịch.');
  }

  function assertCanPost(me) {
    if (!me) throw new Error('Bạn cần đăng nhập để đăng tin.');
    if (!me.emailVerified) { const e = new Error('Xác thực email trước khi đăng tin.'); e.code = 'VERIFY'; throw e; }
    if (me.restricted) throw new Error('Tài khoản đang bị hạn chế đăng tin do vi phạm quy định nhiều lần.');
  }

  // POST /listings — tin hợp lệ về biểu mẫu được hiển thị ngay, kiểm duyệt sau
  function createListing(data) {
    const me = currentUser();
    assertCanPost(me);
    validate(data);
    // Tin cho tặng luôn miễn phí và không tính vào hạn mức
    if (data.type !== 'free') {
      const q = quota();
      if (q.freeLeft) me.postsUsed = (me.postsUsed || 0) + 1;
      else if (q.credits) me.postCredits -= 1;
      else {
        const err = new Error(`Bạn đã dùng hết ${ref.pricing.freePosts} tin miễn phí của tài khoản. Mua thêm ${ref.pricing.extraPosts.posts} tin chỉ ${ref.pricing.extraPosts.price.toLocaleString('vi-VN')}đ.`);
        err.code = 'QUOTA';
        throw err;
      }
    }
    const l = Object.assign({
      id: uid('l'), seller: me.id, cluster: 'hoalac', status: 'available', views: 0,
      createdAt: Date.now(), jitter: Math.random() * 0.4, boostUntil: 0, renewedAt: 0,
    }, data);
    if (l.type === 'free') l.price = 0;
    db.listings.unshift(l);
    persist();
    return l;
  }

  // PATCH /listings/:id — tin bị yêu cầu chỉnh sửa sẽ hiển thị lại sau khi người bán sửa
  function updateListing(id, data) {
    const l = raw(id);
    assertOwner(l);
    if (l.status === 'removed') throw new Error('Tin đã bị gỡ do vi phạm, không thể sửa.');
    if (data.type && (data.type === 'free') !== (l.type === 'free')) throw new Error('Không đổi được giữa tin cho tặng và tin bán / trao đổi. Hãy đăng tin mới.');
    validate(Object.assign({}, l, data));
    Object.assign(l, data);
    if (l.type === 'free') l.price = 0;
    if (l.status === 'hidden') {
      l.status = 'available'; l.renewedAt = Date.now();
      db.users.filter(isAdmin).forEach(a => notify(a.id, 'report', `Tin “${l.title}” đã được người bán chỉnh sửa và hiển thị lại.`, '#/admin'));
    }
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

  // POST /listings/:id/sold — chỉ người bán xác nhận đã bán / đã cho tặng / đã trao đổi
  function markSold(id) {
    const l = raw(id);
    assertOwner(l);
    l.status = 'sold';
    l.soldAt = Date.now();
    persist();
  }

  // POST /listings/:id/reopen
  function reopen(id) {
    const l = raw(id);
    assertOwner(l);
    l.status = 'available'; l.renewedAt = Date.now(); l.soldAt = 0;
    persist();
  }

  // POST /listings/:id/renew — gia hạn miễn phí, không trừ hạn mức tin
  function renew(id) {
    const l = raw(id);
    assertOwner(l);
    if (l.status !== 'available' && l.status !== 'expired') throw new Error('Tin này không gia hạn được.');
    l.status = 'available'; l.renewedAt = Date.now(); l.expiredAt = 0;
    persist();
  }

  // GET /me/quota — số tin bán / trao đổi miễn phí còn lại của tài khoản + lượt đã mua
  function quota() {
    const me = currentUser();
    if (!me) return { used: 0, freeLeft: 0, credits: 0 };
    const used = me.postsUsed || 0;
    return { used, freeLeft: Math.max(0, ref.pricing.freePosts - used), credits: me.postCredits || 0 };
  }

  /*
   * POST /payments — thu qua chuyển khoản; lượt đăng / hiển thị chỉ kích hoạt khi khoản thu được xác nhận.
   * Bản demo xác nhận ngay. kind: 'posts' | 'bump' | 'featured' | 'banner'
   */
  function pay(kind, opts) {
    const me = currentUser();
    if (!me) throw new Error('Bạn cần đăng nhập.');
    opts = opts || {};
    const P = ref.pricing;
    let amount = 0, desc = '', l = null;
    if (kind === 'bump' || kind === 'featured') {
      l = raw(opts.listingId); assertOwner(l);
      if (l.type === 'free') throw new Error('Tin cho tặng không cần mua dịch vụ hiển thị.');
    }
    if (kind === 'posts') {
      amount = P.extraPosts.price; desc = `Mua thêm ${P.extraPosts.posts} tin đăng`;
      me.postCredits = (me.postCredits || 0) + P.extraPosts.posts;
    } else if (kind === 'bump') {
      amount = P.bump.price; desc = 'Đẩy tin lên đầu mục Mới đăng';
      l.bumpedAt = Date.now();
    } else if (kind === 'featured') {
      amount = P.featured.price; desc = `Tin ưu tiên ${P.featured.days} ngày`;
      l.boostUntil = Math.max(Date.now(), l.boostUntil || 0) + P.featured.days * D;
    } else if (kind === 'banner') {
      const months = Number(opts.months) || 1;
      amount = P.banner.price * months;
      desc = `Banner đối tác ${opts.side === 'right' ? 'bên phải' : 'bên trái'} ${months} tháng` + (opts.shop ? ` – ${opts.shop}` : '');
      db.bannerRequests.push({ id: uid('bn'), at: Date.now(), by: me.id, side: opts.side, months, shop: opts.shop || '', phone: opts.phone || '' });
    } else throw new Error('Gói không hợp lệ.');
    const p = { id: uid('p'), user: me.id, kind, amount, method: 'Chuyển khoản', listingId: l ? l.id : null, desc, at: Date.now() };
    db.payments.push(p);
    notify(me.id, 'pay', `Đã xác nhận chuyển khoản ${amount.toLocaleString('vi-VN')}đ – ${desc}${l ? ` cho “${l.title}”` : ''}.`, l ? '#/item/' + l.id : '#/me?tab=payments');
    persist();
    return p;
  }
  function myPayments() {
    const me = currentUser();
    return me ? db.payments.filter(p => p.user === me.id).sort((a, b) => b.at - a.at) : [];
  }

  // Tin ưu tiên (đã trả phí) đang hiển thị
  function featuredListings() {
    return searchListings({ sort: 'priority' }).filter(l => l.boosted);
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
    expireListings();
    let changed = false;
    db.listings.forEach(l => {
      if (l.seller !== me.id) return;
      // Nhắc tin ưu tiên sắp hết hạn (< 24 giờ)
      if (isBoosted(l) && l.boostUntil - Date.now() < D) {
        const key = 'exp' + l.id + l.boostUntil;
        if (!db.notifications.some(n => n.key === key)) {
          db.notifications.push({ id: uid('n'), key, to: me.id, kind: 'system', text: `Tin ưu tiên “${l.title}” sắp hết hạn. Gia hạn ${ref.pricing.featured.price.toLocaleString('vi-VN')}đ/${ref.pricing.featured.days} ngày để giữ vị trí.`, link: '#/item/' + l.id, at: Date.now(), read: false });
          changed = true;
        }
      }
      // Nhắc tin sắp tự ẩn (còn < 3 ngày)
      if (l.status === 'available' && expiresAt(l) - Date.now() < 3 * D) {
        const key = 'soon' + l.id + refreshedAt(l);
        if (!db.notifications.some(n => n.key === key)) {
          db.notifications.push({ id: uid('n'), key, to: me.id, kind: 'status', text: `Tin “${l.title}” sẽ tự ẩn sau ít ngày nữa. Gia hạn miễn phí nếu món đồ vẫn còn, hoặc đánh dấu đã bán.`, link: '#/me', at: Date.now(), read: false });
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

  // ---------- Báo cáo & kiểm duyệt ----------
  // POST /listings/:id/report
  function report(id, reason, note) {
    const me = currentUser();
    if (!me) throw new Error('Đăng nhập để gửi báo cáo.');
    const l = raw(id);
    db.reports.push({ id: uid('rp'), listingId: id, by: me.id, reason, note: (note || '').trim(), at: Date.now(), status: 'open' });
    notify(me.id, 'report', `Đã nhận báo cáo “${reason}”. Đội kiểm duyệt sẽ xử lý trong vòng 24 giờ.`, '#/item/' + id);
    db.users.filter(isAdmin).forEach(a => notify(a.id, 'report', `Báo cáo mới: “${l.title}” – ${reason}.`, '#/admin'));
    persist();
  }

  function assertAdmin() {
    if (!isAdmin(currentUser())) throw new Error('Chỉ quản trị viên mới thực hiện được thao tác này.');
    return currentUser();
  }

  // GET /admin/reports
  function adminReports() {
    assertAdmin();
    expireListings();
    return db.reports.slice().sort((a, b) => (a.status === 'open') === (b.status === 'open') ? b.at - a.at : (a.status === 'open' ? -1 : 1))
      .map(r => Object.assign({}, r, { listing: db.listings.find(l => l.id === r.listingId) || null, reporter: getUser(r.by) }));
  }

  // Số lần tin của người bán bị gỡ hoặc bị yêu cầu chỉnh sửa
  function violationCount(userId) {
    return db.reports.filter(r => r.status === 'resolved' && r.action !== 'dismiss' && (db.listings.find(l => l.id === r.listingId) || {}).seller === userId).length;
  }

  /*
   * POST /admin/reports/:id — action: 'edit' (ẩn tạm, yêu cầu chỉnh sửa) | 'remove' (gỡ tin) | 'dismiss' (không vi phạm)
   * restrict: hạn chế quyền đăng tin của người bán khi tái phạm
   */
  function moderate(reportId, action, modNote, restrict) {
    const admin = assertAdmin();
    const r = db.reports.find(x => x.id === reportId);
    if (!r) throw new Error('Không tìm thấy báo cáo.');
    const l = db.listings.find(x => x.id === r.listingId);
    const now = Date.now();
    const note = (modNote || '').trim();
    // Xử lý luôn các báo cáo khác đang mở của cùng tin
    db.reports.filter(x => x.listingId === r.listingId && x.status === 'open').forEach(x => {
      Object.assign(x, { status: 'resolved', action, handledBy: admin.id, handledAt: now, modNote: note });
      if (x.by) notify(x.by, 'report', action === 'dismiss'
        ? `Báo cáo về “${l ? l.title : 'tin đăng'}” đã được kiểm tra: chưa phát hiện vi phạm.`
        : `Cảm ơn bạn! Tin “${l ? l.title : ''}” đã được ${action === 'remove' ? 'gỡ' : 'ẩn để người bán chỉnh sửa'}.`, '#/notifications');
    });
    if (l && action !== 'dismiss') {
      l.status = action === 'remove' ? 'removed' : 'hidden';
      l.modNote = note || (action === 'remove' ? 'Vi phạm quy định cộng đồng.' : 'Thông tin chưa đúng quy định, cần chỉnh sửa.');
      notify(l.seller, 'report', action === 'remove'
        ? `Tin “${l.title}” đã bị gỡ: ${l.modNote}`
        : `Tin “${l.title}” đang bị ẩn: ${l.modNote} Sửa tin để hiển thị lại.`, '#/me');
    }
    if (l && restrict) {
      const seller = getUser(l.seller);
      if (seller) { seller.restricted = true; notify(seller.id, 'report', 'Tài khoản của bạn bị hạn chế đăng tin do vi phạm quy định nhiều lần.', '#/me'); }
    }
    persist();
  }

  // POST /admin/listings/:id/restore
  function restoreListing(id) {
    assertAdmin();
    const l = raw(id);
    l.status = 'available'; l.modNote = ''; l.renewedAt = Date.now();
    notify(l.seller, 'report', `Tin “${l.title}” đã được khôi phục hiển thị.`, '#/item/' + l.id);
    persist();
  }

  // PATCH /admin/users/:id
  function setRestricted(userId, value) {
    assertAdmin();
    const u = getUser(userId);
    if (!u) throw new Error('Không tìm thấy người dùng.');
    u.restricted = !!value;
    notify(u.id, 'report', value ? 'Tài khoản của bạn bị hạn chế đăng tin do vi phạm quy định.' : 'Tài khoản của bạn đã được mở lại quyền đăng tin.', '#/me');
    persist();
  }

  // Danh sách tin đang bị ẩn / gỡ (cho trang quản trị)
  function moderatedListings() {
    assertAdmin();
    return db.listings.filter(l => l.status === 'hidden' || l.status === 'removed').map(l => decorate(l, null));
  }

  function adminStats() {
    assertAdmin();
    const done = db.reports.filter(r => r.status === 'resolved' && r.handledAt);
    const within = done.filter(r => r.handledAt - r.at <= D).length;
    const avgH = done.length ? done.reduce((s, r) => s + (r.handledAt - r.at), 0) / done.length / H : 0;
    return {
      open: db.reports.filter(r => r.status === 'open').length,
      resolved: done.length,
      within24: done.length ? Math.round(within / done.length * 100) : 100,
      avgHours: Math.round(avgH * 10) / 10,
      activeListings: db.listings.filter(l => l.status === 'available').length,
      restricted: db.users.filter(u => u.restricted).length,
    };
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

  // Tín hiệu có thể đã giao dịch: người mua hẹn gặp / chốt mua trong tin nhắn
  const DEAL_SIGNAL = /(gặp|hẹn|qua .{0,25}(xem|lấy)|lấy luôn|chốt|em lấy|mình lấy|chuyển khoản)/i;

  // POST /conversations/:id/messages
  function sendMessage(convId, text) {
    const me = currentUser();
    const c = getConversation(convId);
    if (!me || !c || !text.trim()) return;
    c.messages.push({ from: me.id, text: text.trim(), at: Date.now() });
    c.readBy = c.readBy || {};
    c.readBy[me.id] = Date.now();
    const l = db.listings.find(x => x.id === c.listingId);
    if (l && me.id !== l.seller && !c.reminded && DEAL_SIGNAL.test(text)) {
      c.reminded = true;
      notify(l.seller, 'status', `${me.name} vừa hẹn gặp về “${l.title}”. Nếu đã bán hoặc cho tặng, hãy cập nhật trạng thái để người khác không hỏi nữa.`, '#/item/' + l.id);
    }
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
    else if (t.includes('ở đâu') || t.includes('gặp')) text = 'Mình ở ' + ((ref.area('hoalac', (getUser(other) || {}).area) || {}).name || 'Hòa Lạc') + ', gặp ở chỗ đông người cho tiện nha.';
    c.messages.push({ from: other, text, at: Date.now() });
    persist();
  }

  function resetDemo() {
    db = seed();
    persist();
    localStorage.removeItem(SESSION_KEY);
  }

  function stats() {
    expireListings();
    const ls = db.listings;
    return {
      active: ls.filter(l => l.status === 'available').length,
      free: ls.filter(l => l.type === 'free' && l.status === 'available').length,
      users: db.users.filter(u => !isAdmin(u)).length,
      done: ls.filter(l => l.status === 'sold').length,
    };
  }

  return {
    ref, currentUser, isAdmin, login, loginAs, logout, register, verifyEmail, updateProfile,
    activeClusterId, getUser, allUsers,
    searchListings, getListing, createListing, updateListing, deleteListing, featuredListings,
    markSold, reopen, renew, report, quota, pay, myPayments,
    notifications, unreadNotifications, markNotificationsRead,
    adminReports, moderate, restoreListing, setRestricted, moderatedListings, adminStats, violationCount,
    conversations, getConversation, unreadCount, totalUnread, markRead, startConversation, sendMessage, simulateReply,
    resetDemo, stats,
  };
})();
