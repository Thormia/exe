/* Dữ liệu mẫu (mock) theo phạm vi MVP trong báo cáo cp4. Khi có backend, dữ liệu này sẽ đến từ API. */
window.MOCK = (function () {
  const H = 3600 * 1000;
  const D = 24 * H;
  const now = Date.now();

  // ReMarket giai đoạn đầu chỉ phục vụ Hòa Lạc; mỗi khu trọ / KTX là một khu vực để lọc và hẹn giao dịch.
  const clusters = [
    {
      id: 'hoalac',
      name: 'Hòa Lạc',
      tagline: 'Sinh viên, người đi làm và cư dân quanh các trường ở Hòa Lạc',
      address: 'Thạch Hòa, Thạch Thất, Hà Nội',
      center: [21.0125, 105.5330], zoom: 14,
      schools: ['ĐH FPT', 'ĐHQGHN – Hòa Lạc', 'Trường khác', 'Người đi làm / cư dân'],
      // Tọa độ giả lập (km) so với tâm cụm, dùng để tính khoảng cách
      areas: [
        { id: 'ktx-fpt', name: 'KTX ĐH FPT', x: 0, y: 0, lat: 21.0128, lng: 105.5262 },
        { id: 'ktx-dhqg', name: 'KTX ĐHQGHN Hòa Lạc', x: -1.8, y: 0.6, lat: 21.0045, lng: 105.5125 },
        { id: 'tan-xa', name: 'Thôn Tân Xã', x: 1.5, y: 1.2, lat: 21.0030, lng: 105.5395 },
        { id: 'phu-huu', name: 'Thôn Phú Hữu', x: 1.1, y: -1.4, lat: 21.0095, lng: 105.5450 },
        { id: 'thach-hoa', name: 'Thạch Hòa', x: 2.6, y: -0.8, lat: 21.0255, lng: 105.5370 },
        { id: 'binh-yen', name: 'Bình Yên', x: 3.3, y: 1.6, lat: 21.0330, lng: 105.5560 },
      ],
      landmarks: [
        { name: 'Trường ĐH FPT Hà Nội', lat: 21.0134, lng: 105.5248 },
        { name: 'ĐHQGHN – cơ sở Hòa Lạc', lat: 21.0015, lng: 105.5160 },
        { name: 'UBND xã Thạch Hòa', lat: 21.0240, lng: 105.5395 },
      ],
    },
  ];

  // Ba nhóm ưu tiên theo khảo sát: công nghệ, đồ phòng trọ, thời trang; sách và đồ học tập vẫn được đăng.
  const categories = [
    { id: 'dien-tu', name: 'Công nghệ & điện tử', icon: '🎧', color: ['#e9d5ff', '#a855f7'] },
    { id: 'noi-that', name: 'Bàn ghế & nội thất', icon: '🪑', color: ['#fde68a', '#f59e0b'] },
    { id: 'gia-dung', name: 'Đồ gia dụng', icon: '🍚', color: ['#bfdbfe', '#3b82f6'] },
    { id: 'quan-ao', name: 'Quần áo & phụ kiện', icon: '👕', color: ['#fecdd3', '#f43f5e'] },
    { id: 'hoc-tap', name: 'Sách & học tập', icon: '📚', color: ['#c7d2fe', '#6366f1'] },
    { id: 'xe-the-thao', name: 'Xe đạp & thể thao', icon: '🚲', color: ['#bbf7d0', '#22c55e'] },
  ];

  const conditions = ['Như mới', 'Tốt', 'Khá', 'Đã cũ'];

  // emailVerified: tài khoản đã xác thực email. phone + showPhone: số liên hệ do người dùng tự chọn hiển thị.
  const users = [
    { id: 'u0', role: 'admin', name: 'Quản trị viên ReMarket', email: 'admin@remarket.vn', password: '123456', cluster: 'hoalac', school: 'Người đi làm / cư dân', area: 'ktx-fpt', emailVerified: true, joinedAt: now - 300 * D, bio: 'Tài khoản kiểm duyệt của nhóm vận hành.' },
    { id: 'u1', name: 'Nguyễn Minh Anh', email: 'minhanh@fpt.edu.vn', password: '123456', phone: '0912345678', showPhone: true, cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', emailVerified: true, joinedAt: now - 120 * D, bio: 'K19 FPT, hay mua bán sách và đồ phòng KTX.' },
    { id: 'u2', name: 'Trần Quốc Huy', email: 'huytq@gmail.com', password: '123456', phone: '0987654321', showPhone: true, cluster: 'hoalac', school: 'ĐH FPT', area: 'tan-xa', emailVerified: true, joinedAt: now - 200 * D, bio: 'Trọ ở Tân Xã.' },
    { id: 'u3', name: 'Lê Thu Trang', email: 'trang.lt@vnu.edu.vn', password: '123456', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', emailVerified: true, joinedAt: now - 90 * D, bio: '' },
    { id: 'u4', name: 'Trần Đức Minh', email: 'minhtd@gmail.com', password: '123456', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', emailVerified: true, joinedAt: now - 10 * D, bio: 'Tân sinh viên, mới lên Hòa Lạc, đang sắm đồ phòng.' },
    { id: 'u5', name: 'Hoàng Mai Linh', email: 'linhhm@fpt.edu.vn', password: '123456', phone: '0934567890', showPhone: true, cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', emailVerified: true, joinedAt: now - 700 * D, bio: 'Sắp ra trường, thanh lý đồ phòng.' },
    { id: 'u10', name: 'Đặng Gia Bảo', email: 'baodg@vnu.edu.vn', password: '123456', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'ktx-dhqg', emailVerified: true, joinedAt: now - 45 * D, bio: 'Đam mê xe đạp.' },
    { id: 'u12', name: 'Chị Ngọc Thạch Hòa', email: 'ngoc.th@gmail.com', password: '123456', phone: '0966778899', showPhone: false, cluster: 'hoalac', school: 'Người đi làm / cư dân', area: 'thach-hoa', emailVerified: true, joinedAt: now - 60 * D, bio: 'Người đi làm ở khu công nghệ cao, thanh lý đồ gia đình.' },
    // Tài khoản dùng cho Màn 5 của tiểu phẩm: người bán đáng ngờ
    { id: 'u11', name: 'Lê Văn Hùng', email: 'hung.deal@gmail.com', password: '123456', cluster: 'hoalac', school: 'Trường khác', area: 'phu-huu', emailVerified: true, joinedAt: now - 5 * D, bio: '' },
  ];

  let seq = 0;
  function L(o) {
    seq += 1;
    return Object.assign({
      id: 'l' + seq,
      type: 'sell',
      price: 0,
      tradeFor: '',
      condition: 'Tốt',
      usedTime: '',
      desc: '',
      images: [],
      status: 'available',
      views: Math.floor(20 + Math.random() * 180),
      jitter: Math.random() * 0.4,
      boostUntil: 0,
      renewedAt: 0,
      cluster: 'hoalac',
    }, o);
  }
  const imgs = (name, n) => Array.from({ length: n }, (_, i) => `images/${name}-0${i + 1}.png`);

  const listings = [
    L({ title: 'Bàn học gấp gọn gỗ ép 60x40', images: imgs('ban-gap', 4), cat: 'noi-that', price: 120000, condition: 'Tốt', usedTime: '1 năm', seller: 'u2', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 3 * H, desc: 'Bàn gấp chân sắt, mặt gỗ ép chống nước. Có vài vết xước nhỏ, không ảnh hưởng dùng. Qua Tân Xã xem trực tiếp.' }),
    L({ boostUntil: now + 2 * D, title: 'Nồi cơm điện Sharp 1.8L', images: imgs('noi-com', 6), cat: 'gia-dung', price: 180000, condition: 'Tốt', usedTime: '2 năm', seller: 'u5', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 6 * H, desc: 'Nấu vẫn ngon, lòng nồi chống dính còn tốt, nắp hơi trầy. Thanh lý vì ra trường.' }),
    L({ boostUntil: now + 2 * D, title: 'Quạt đứng Senko 3 tốc độ', images: imgs('combo-ktx', 4), cat: 'gia-dung', price: 150000, condition: 'Khá', usedTime: '2 năm', seller: 'u5', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 5 * H, desc: 'Chạy êm, đủ 3 tốc độ, chân đế hơi trầy. Ảnh chụp tại phòng KTX, bạn qua xem và mang về luôn.' }),
    L({ title: 'Giáo trình Toán rời rạc + Xác suất thống kê', images: imgs('giao-trinh', 4), cat: 'hoc-tap', price: 50000, condition: 'Khá', usedTime: '1 kỳ', seller: 'u1', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 26 * H, desc: 'Có ghi chú bút chì một số trang, không rách.' }),
    L({ title: 'Xe đạp Asama mini, phanh mới thay', images: imgs('xe-dap', 4), cat: 'xe-the-thao', price: 650000, condition: 'Tốt', usedTime: '1.5 năm', seller: 'u10', school: 'ĐHQGHN – Hòa Lạc', area: 'ktx-dhqg', createdAt: now - 30 * H, boostUntil: now + 4 * D, desc: 'Xe đi trong khuôn viên, vừa thay má phanh và săm. Tặng kèm khóa.' }),
    L({ title: 'Tai nghe có dây Sony, đổi lấy chuột không dây', images: imgs('tai-nghe', 4), cat: 'dien-tu', type: 'trade', tradeFor: 'Chuột không dây (Logitech hoặc tương đương)', condition: 'Như mới', usedTime: '3 tháng', seller: 'u3', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', createdAt: now - 10 * H, desc: 'Mua về ít dùng, còn hộp.' }),
    L({ title: 'Tặng móc treo quần áo (20 cái) và giỏ đựng đồ', images: imgs('moc-va-gio', 5), cat: 'quan-ao', type: 'free', condition: 'Khá', usedTime: '1 năm', seller: 'u5', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 4 * H, desc: 'Ai cần qua lấy trước khi mình trả phòng nhé.' }),
    L({ title: 'Ấm siêu tốc Lock&Lock 1.7L', images: imgs('am-nuoc', 5), cat: 'gia-dung', price: 90000, condition: 'Tốt', usedTime: '8 tháng', seller: 'u3', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', createdAt: now - 2 * D, desc: 'Đun nhanh, không rỉ. Đã vệ sinh sạch.' }),
    L({ title: 'Ghế xoay văn phòng lưới', images: imgs('ghe-xoay', 6), cat: 'noi-that', price: 350000, condition: 'Khá', usedTime: '2 năm', seller: 'u2', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 3 * D, desc: 'Ngồi êm, xoay tốt, tựa lưng hơi lỏng.' }),
    L({ boostUntil: now + 2 * D, title: 'Sách IELTS Cambridge 14–17 (bản photo đẹp)', images: imgs('ielts', 5), cat: 'hoc-tap', price: 80000, condition: 'Tốt', usedTime: '6 tháng', seller: 'u3', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', createdAt: now - 20 * H, desc: '4 cuốn, chưa viết vào.' }),
    L({ title: 'Đèn học chống cận Rạng Đông', images: imgs('den-rang-dong', 4), cat: 'gia-dung', price: 110000, condition: 'Như mới', usedTime: '4 tháng', seller: 'u1', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 8 * D, desc: '3 chế độ sáng, cổng USB.' }),
    L({ title: 'Bàn phím cơ Fuhlen, switch blue', images: imgs('ban-phim', 3), cat: 'dien-tu', price: 280000, condition: 'Tốt', usedTime: '1 năm', seller: 'u1', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 12 * D, status: 'sold', soldAt: now - 9 * D, desc: 'Đủ phím, LED ổn.' }),
    L({ title: 'Vợt cầu lông Yonex + 3 quả cầu', images: imgs('cau-long', 2), cat: 'xe-the-thao', price: 150000, condition: 'Khá', usedTime: '1 năm', seller: 'u10', school: 'ĐHQGHN – Hòa Lạc', area: 'ktx-dhqg', createdAt: now - 4 * D, desc: 'Cước còn căng.' }),
    L({ title: 'Áo khoác đồng phục FPT size L', cat: 'quan-ao', price: 60000, condition: 'Tốt', usedTime: '1 năm', seller: 'u4', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 5 * D, desc: 'Đã giặt sạch, không phai màu.' }),
    L({ title: 'Kệ giày 4 tầng inox', images: imgs('ke-giay', 6), cat: 'noi-that', type: 'free', condition: 'Đã cũ', usedTime: '3 năm', seller: 'u2', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 7 * H, desc: 'Hơi rỉ chân nhưng vẫn chắc. Cho bạn nào cần, tự qua lấy.' }),
    L({ title: 'Chăn ga gối đơn 1m2 + nệm topper', images: imgs('dem-chan-goi', 4), cat: 'quan-ao', price: 200000, condition: 'Tốt', usedTime: '1 năm', seller: 'u5', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 5 * H, desc: 'Đã giặt khô, sạch sẽ, vừa giường KTX.' }),
    L({ title: 'Máy tính Casio fx-580VN X', images: ['images/may-tinh-fx580-01.jpg', 'images/may-tinh-fx580-02.jpg'], cat: 'hoc-tap', type: 'trade', tradeFor: 'Giáo trình Kinh tế vi mô hoặc 100k', price: 0, condition: 'Tốt', usedTime: '2 năm', seller: 'u3', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', createdAt: now - 36 * H, desc: 'Máy chạy tốt, pin còn khỏe.' }),
    L({ boostUntil: now + 2 * D, title: 'Hub USB-C 6 in 1 Ugreen', images: imgs('usb', 5), cat: 'dien-tu', price: 220000, condition: 'Như mới', usedTime: '2 tháng', seller: 'u2', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 14 * H, desc: 'Đổi laptop nên không dùng nữa.' }),
    L({ title: 'Tủ quần áo vải khung thép 3 buồng', images: imgs('tu-quan-ao', 4), cat: 'noi-that', price: 150000, condition: 'Khá', usedTime: '1.5 năm', seller: 'u12', school: 'Người đi làm / cư dân', area: 'thach-hoa', createdAt: now - 7 * H, desc: 'Vải còn đẹp, khung chắc. Mình tháo sẵn để bạn dễ mang về.' }),
    L({ title: 'Bếp từ đơn Sunhouse', images: imgs('bep-tu-sunhouse', 4), cat: 'gia-dung', price: 250000, condition: 'Tốt', usedTime: '1 năm', seller: 'u12', school: 'Người đi làm / cư dân', area: 'thach-hoa', createdAt: now - 8 * H, desc: 'Tặng kèm nồi lẩu nhỏ.' }),
    L({ title: 'Chuột Logitech M331 silent', images: imgs('chuot-logitech', 4), cat: 'dien-tu', price: 150000, condition: 'Như mới', usedTime: '5 tháng', seller: 'u10', school: 'ĐHQGHN – Hòa Lạc', area: 'ktx-dhqg', createdAt: now - 16 * H, desc: 'Click không tiếng, pin còn.' }),
    // Tin quá 30 ngày không cập nhật → sẽ tự ẩn khi tải trang (demo gia hạn miễn phí)
    L({ title: 'Giá phơi đồ inox gấp gọn', cat: 'gia-dung', price: 60000, condition: 'Khá', usedTime: '1 năm', seller: 'u1', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 33 * D, desc: 'Gấp gọn để gầm giường được.' }),
    // Tin đáng ngờ cho Màn 5
    L({ id: 'l-ipad', title: 'iPad 9 64GB nguyên seal – giá sốc 2 triệu', cat: 'dien-tu', price: 2000000, condition: 'Như mới', usedTime: 'Mới', seller: 'u11', school: 'Trường khác', area: 'phu-huu', createdAt: now - 2 * H, desc: 'Hàng hot nhiều người hỏi. Chuyển cọc trước 200k mình giữ hàng, ship tận nơi, không cần gặp. Ảnh minh họa.' }),
    // Tin đã bị gỡ trước đó (lịch sử kiểm duyệt)
    L({ id: 'l-acc', title: 'Bán tài khoản game rank cao giá rẻ', cat: 'dien-tu', price: 300000, condition: 'Như mới', seller: 'u11', school: 'Trường khác', area: 'phu-huu', createdAt: now - 4 * D, status: 'removed', modNote: 'Tài khoản số không thuộc danh mục được phép đăng.', desc: 'Inbox để mua.' }),
  ];

  const reports = [
    { id: 'rp0', listingId: 'l-acc', by: 'u1', reason: 'Hàng cấm, hàng không được phép đăng', note: 'Bán tài khoản game.', at: now - 4 * D + 2 * H, status: 'resolved', action: 'remove', handledBy: 'u0', handledAt: now - 4 * D + 7 * H, modNote: 'Tài khoản số không thuộc danh mục được phép đăng.' },
  ];

  const conversations = [
    {
      id: 'c1', listingId: 'l9', members: ['u1', 'u2'], readBy: { u1: now - 1 * H, u2: now },
      messages: [
        { from: 'u1', text: 'Ghế xoay còn không bạn?', at: now - 26 * H },
        { from: 'u2', text: 'Còn nhé, bạn qua Tân Xã xem được.', at: now - 25 * H },
        { from: 'u1', text: 'Mai 5h chiều mình qua chợ Tân Xã xem ghế được không?', at: now - 4 * H },
        { from: 'u2', text: 'Ok bạn, mai 5h mình mang ra.', at: now - 30 * 60 * 1000 },
      ],
    },
    {
      id: 'c2', listingId: 'l11', members: ['u4', 'u1'], readBy: { u1: now - 3 * H, u4: now }, reminded: true,
      messages: [
        { from: 'u4', text: 'Đèn học còn bảo hành không bạn?', at: now - 5 * H },
        { from: 'u1', text: 'Hết bảo hành rồi nhưng còn như mới nhé.', at: now - 4 * H },
        { from: 'u4', text: 'Tối nay mình qua thư viện gặp bạn xem đèn nhé.', at: now - 2 * H },
      ],
    },
  ];

  // Đối tác mua banner quảng cáo (tách khỏi danh mục tin đăng C2C)
  const advertisers = [
    { name: 'Quán in Tân Photo', phone: '0968 222 333', ad: 'In tài liệu 500đ/trang ngay cổng ĐH FPT', color: ['#0ea5e9', '#2563eb'], icon: '🖨' },
    { name: 'Xe ba gác chuyển trọ nội khu', phone: '0968 111 222', ad: 'Chuyển trọ Hòa Lạc chỉ từ 80k', color: ['#f59e0b', '#ea580c'], icon: '🛻' },
  ];

  // Thông báo mẫu (kind: status | report | pay | system)
  const notifications = [
    { id: 'n1', to: 'u1', kind: 'status', text: 'Trần Đức Minh vừa hẹn gặp về “Đèn học chống cận Rạng Đông”. Nếu đã bán, hãy cập nhật trạng thái để người khác không hỏi nữa.', link: '#/item/l11', at: now - 2 * H, read: false },
    { id: 'n3', to: 'u1', kind: 'system', text: 'Tin “Giáo trình Toán rời rạc” đang được nhiều người xem. Đẩy tin chỉ 5.000đ/lượt để lên đầu mục Mới đăng.', link: '#/item/l4', at: now - 5 * H, read: false },
  ];
  users.forEach(u => {
    if (u.role !== 'admin') notifications.push({ id: 'nw' + u.id, to: u.id, kind: 'system', text: 'Chào mừng bạn đến ReMarket! Mỗi tháng bạn có 2 tin đăng miễn phí.', link: '#/pricing', at: u.joinedAt, read: u.id === 'u1' });
  });

  const payments = [
    { id: 'p1', user: 'u5', kind: 'featured', amount: 10000, method: 'Chuyển khoản', listingId: 'l3', desc: 'Tin ưu tiên 3 ngày', at: now - 1 * D },
  ];

  return { clusters, categories, conditions, users, listings, reports, conversations, advertisers, notifications, payments };
})();
