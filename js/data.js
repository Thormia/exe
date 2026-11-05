/* Dữ liệu mẫu (mock). Khi có backend, dữ liệu này sẽ đến từ API. */
window.MOCK = (function () {
  const H = 3600 * 1000;
  const D = 24 * H;
  const now = Date.now();

  const clusters = [
    {
      id: 'hoalac',
      name: 'Hòa Lạc',
      tagline: 'Sinh viên ở KTX và khu trọ quanh các trường ở Hòa Lạc',
      address: 'Thạch Hòa, Thạch Thất, Hà Nội',
      center: [21.0125, 105.5330], zoom: 14,
      schools: ['ĐH FPT', 'ĐHQGHN – Hòa Lạc', 'Trường khác'],
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
      meetPoints: ['Sảnh thư viện ĐH FPT', 'Cổng KTX ĐH FPT', 'Căng tin Beta', 'Cổng ĐHQGHN Hòa Lạc', 'Chợ Tân Xã'],
    },
    {
      id: 'caugiay',
      name: 'Cầu Giấy',
      tagline: 'Sinh viên và người trẻ thuê trọ quanh các trường ở Cầu Giấy',
      address: 'Cầu Giấy, Hà Nội',
      center: [21.0330, 105.7930], zoom: 14,
      schools: ['ĐHQGHN – Xuân Thủy', 'ĐH Sư phạm Hà Nội', 'Học viện Báo chí & Tuyên truyền', 'ĐH Giao thông Vận tải', 'Trường khác'],
      areas: [
        { id: 'dich-vong', name: 'Dịch Vọng', x: 0, y: 0, lat: 21.0365, lng: 105.7905 },
        { id: 'mai-dich', name: 'Mai Dịch', x: -1.2, y: 1.3, lat: 21.0395, lng: 105.7760 },
        { id: 'nghia-tan', name: 'Nghĩa Tân', x: 0.3, y: 1.8, lat: 21.0460, lng: 105.7930 },
        { id: 'quan-hoa', name: 'Quan Hoa', x: 0.9, y: 0.9, lat: 21.0365, lng: 105.8015 },
        { id: 'yen-hoa', name: 'Yên Hòa', x: 1.2, y: -1.4, lat: 21.0225, lng: 105.7935 },
        { id: 'trung-kinh', name: 'Trung Kính', x: 0.6, y: -2.1, lat: 21.0150, lng: 105.7975 },
      ],
      landmarks: [
        { name: 'ĐHQGHN – 144 Xuân Thủy', lat: 21.0380, lng: 105.7825 },
        { name: 'ĐH Sư phạm Hà Nội', lat: 21.0370, lng: 105.7835 },
        { name: 'Công viên Cầu Giấy', lat: 21.0300, lng: 105.7955 },
      ],
      meetPoints: ['Cổng ĐHQGHN 144 Xuân Thủy', 'Công viên Cầu Giấy', 'Cổng ĐH Sư phạm HN', 'Sảnh Học viện Báo chí', 'Siêu thị Winmart Trần Thái Tông'],
    },
  ];

  const categories = [
    { id: 'noi-that', name: 'Bàn ghế & nội thất', icon: '🪑', color: ['#fde68a', '#f59e0b'] },
    { id: 'gia-dung', name: 'Đồ gia dụng', icon: '🍚', color: ['#bfdbfe', '#3b82f6'] },
    { id: 'hoc-tap', name: 'Sách & học tập', icon: '📚', color: ['#c7d2fe', '#6366f1'] },
    { id: 'dien-tu', name: 'Phụ kiện điện tử', icon: '🎧', color: ['#e9d5ff', '#a855f7'] },
    { id: 'xe-the-thao', name: 'Xe đạp & thể thao', icon: '🚲', color: ['#bbf7d0', '#22c55e'] },
    { id: 'quan-ao', name: 'Quần áo & cá nhân', icon: '👕', color: ['#fecdd3', '#f43f5e'] },
  ];

  const conditions = ['Như mới', 'Tốt', 'Khá', 'Đã cũ'];

  const users = [
    { id: 'u1', phone: '0912345678', name: 'Nguyễn Minh Anh', email: 'minhanh@fpt.edu.vn', password: '123456', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', verified: { student: true, phone: true }, joinedAt: now - 120 * D, bio: 'K19 FPT, hay mua bán sách và đồ phòng KTX.' },
    { id: 'u2', phone: '0987654321', name: 'Trần Quốc Huy', email: 'huytq@fpt.edu.vn', password: '123456', cluster: 'hoalac', school: 'ĐH FPT', area: 'tan-xa', verified: { student: true, phone: true }, joinedAt: now - 200 * D, bio: 'Trọ ở Tân Xã, có xe máy, giao nội khu được.' },
    { id: 'u3', name: 'Lê Thu Trang', email: 'trang.lt@vnu.edu.vn', password: '123456', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', verified: { student: true, phone: false }, joinedAt: now - 90 * D, bio: '' },
    { id: 'u4', phone: '0901234567', name: 'Phạm Đức Long', email: 'longpd@gmail.com', password: '123456', cluster: 'hoalac', school: 'ĐH FPT', area: 'phu-huu', verified: { student: false, phone: true }, joinedAt: now - 15 * D, bio: 'Mới lên Hòa Lạc.' },
    { id: 'u5', phone: '0934567890', name: 'Hoàng Mai Linh', email: 'linhhm@fpt.edu.vn', password: '123456', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', verified: { student: true, phone: true }, joinedAt: now - 700 * D, bio: 'Sắp ra trường, thanh lý hết đồ phòng.', moving: { date: now + 5 * D, note: 'Ra trường, về quê – thanh lý toàn bộ đồ phòng KTX.' } },
    { id: 'u6', phone: '0978123456', name: 'Vũ Hải Nam', email: 'namvh@vnu.edu.vn', password: '123456', cluster: 'caugiay', school: 'ĐHQGHN – Xuân Thủy', area: 'dich-vong', verified: { student: true, phone: true }, joinedAt: now - 400 * D, bio: 'Chuyển trọ sang Thanh Xuân.', moving: { date: now + 3 * D, note: 'Chuyển trọ xa, không tiện mang theo đồ lớn.' } },
    { id: 'u7', name: 'Đỗ Khánh Vy', email: 'vydk@hnue.edu.vn', password: '123456', cluster: 'caugiay', school: 'ĐH Sư phạm Hà Nội', area: 'mai-dich', verified: { student: true, phone: false }, joinedAt: now - 60 * D, bio: 'Bán sách sư phạm, giáo trình.' },
    { id: 'u8', phone: '0965432109', name: 'Bùi Tuấn Kiệt', email: 'kietbt@gmail.com', password: '123456', cluster: 'caugiay', school: 'Học viện Báo chí & Tuyên truyền', area: 'nghia-tan', verified: { student: false, phone: true }, joinedAt: now - 20 * D, bio: '' },
    { id: 'u9', phone: '0911222333', name: 'Ngô Phương Thảo', email: 'thaonp@utc.edu.vn', password: '123456', cluster: 'caugiay', school: 'ĐH Giao thông Vận tải', area: 'quan-hoa', verified: { student: true, phone: true }, joinedAt: now - 300 * D, bio: 'Đi làm rồi nhưng vẫn ở trọ Quan Hoa.' },
    { id: 'u10', name: 'Đặng Gia Bảo', email: 'baodg@vnu.edu.vn', password: '123456', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'ktx-dhqg', verified: { student: true, phone: false }, joinedAt: now - 45 * D, bio: 'Đam mê xe đạp.' },
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
      movingSale: false,
      combo: null,
      boostUntil: 0,
      reservedBy: null,
      reservedUntil: 0,
      meetPoint: '',
      soldTo: null,
    }, o);
  }

  const listings = [
    // --- Hòa Lạc ---
    L({ title: 'Bàn học gấp gọn gỗ ép 60x40', cat: 'noi-that', price: 120000, condition: 'Tốt', usedTime: '1 năm', seller: 'u2', cluster: 'hoalac', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 3 * H, desc: 'Bàn gấp chân sắt, mặt gỗ ép chống nước. Có vài vết xước nhỏ, không ảnh hưởng dùng. Qua Tân Xã xem trực tiếp.' }),
    L({ boostUntil: now + 2 * D, title: 'Nồi cơm điện Sharp 1.8L', cat: 'gia-dung', price: 180000, condition: 'Tốt', usedTime: '2 năm', seller: 'u5', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 6 * H, movingSale: true, desc: 'Nấu vẫn ngon, lòng nồi chống dính còn tốt. Thanh lý vì ra trường.' }),
    L({ title: 'Combo đồ phòng KTX: quạt + đèn học + kệ sách', cat: 'gia-dung', price: 250000, condition: 'Khá', usedTime: '2–3 năm', seller: 'u5', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 5 * H, movingSale: true, combo: [{ name: 'Quạt đứng Senko', price: 150000 }, { name: 'Đèn học LED kẹp bàn', price: 70000 }, { name: 'Kệ sách 3 tầng', price: 90000 }], boostUntil: now + 2 * D, desc: 'Lấy cả combo rẻ hơn mua lẻ 60k. Mình để ở phòng, bạn qua KTX xem và mang về luôn.' }),
    L({ title: 'Giáo trình Toán rời rạc + Xác suất thống kê', cat: 'hoc-tap', price: 50000, condition: 'Khá', usedTime: '1 kỳ', seller: 'u1', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 26 * H, desc: 'Có ghi chú bút chì một số trang, không rách.' }),
    L({ title: 'Xe đạp Asama mini, phanh mới thay', cat: 'xe-the-thao', price: 650000, condition: 'Tốt', usedTime: '1.5 năm', seller: 'u10', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'ktx-dhqg', createdAt: now - 30 * H, boostUntil: now + 4 * D, desc: 'Xe đi trong khuôn viên, vừa thay má phanh và săm. Tặng kèm khóa.' }),
    L({ title: 'Tai nghe có dây Sony, đổi lấy chuột không dây', cat: 'dien-tu', type: 'trade', tradeFor: 'Chuột không dây (Logitech hoặc tương đương)', condition: 'Như mới', usedTime: '3 tháng', seller: 'u4', cluster: 'hoalac', school: 'ĐH FPT', area: 'phu-huu', createdAt: now - 10 * H, desc: 'Mua về ít dùng, còn hộp.' }),
    L({ title: 'Tặng móc treo quần áo (20 cái) và giỏ đựng đồ', cat: 'quan-ao', type: 'free', condition: 'Khá', usedTime: '1 năm', seller: 'u5', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 4 * H, movingSale: true, desc: 'Ai cần qua lấy trước ngày mình chuyển đi nhé.' }),
    L({ title: 'Ấm siêu tốc Lock&Lock 1.7L', cat: 'gia-dung', price: 90000, condition: 'Tốt', usedTime: '8 tháng', seller: 'u3', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', createdAt: now - 2 * D, desc: 'Đun nhanh, không rỉ. Đã vệ sinh sạch.' }),
    L({ title: 'Ghế xoay văn phòng lưới', cat: 'noi-that', price: 350000, condition: 'Khá', usedTime: '2 năm', seller: 'u2', cluster: 'hoalac', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 3 * D, status: 'reserved', reservedBy: 'u1', reservedUntil: now + 20 * H, meetPoint: 'Chợ Tân Xã', desc: 'Ngồi êm, xoay tốt, tựa lưng hơi lỏng.' }),
    L({ boostUntil: now + 2 * D, title: 'Sách IELTS Cambridge 14–17 (bản photo đẹp)', cat: 'hoc-tap', price: 80000, condition: 'Tốt', usedTime: '6 tháng', seller: 'u3', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', createdAt: now - 20 * H, desc: '4 cuốn, chưa viết vào.' }),
    L({ title: 'Đèn học chống cận Rạng Đông', cat: 'gia-dung', price: 110000, condition: 'Như mới', usedTime: '4 tháng', seller: 'u1', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 8 * D, status: 'reserved', reservedBy: 'u4', reservedUntil: now + 10 * H, meetPoint: 'Sảnh thư viện ĐH FPT', desc: '3 chế độ sáng, cổng USB.' }),
    L({ title: 'Bàn phím cơ Fuhlen, switch blue', cat: 'dien-tu', price: 280000, condition: 'Tốt', usedTime: '1 năm', seller: 'u1', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 12 * D, status: 'sold', soldTo: 'u2', desc: 'Đủ phím, LED ổn.' }),
    L({ title: 'Vợt cầu lông Yonex + 3 quả cầu', cat: 'xe-the-thao', price: 150000, condition: 'Khá', usedTime: '1 năm', seller: 'u10', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'ktx-dhqg', createdAt: now - 4 * D, desc: 'Cước còn căng.' }),
    L({ title: 'Áo khoác đồng phục FPT size L', cat: 'quan-ao', price: 60000, condition: 'Tốt', usedTime: '1 năm', seller: 'u4', cluster: 'hoalac', school: 'ĐH FPT', area: 'phu-huu', createdAt: now - 5 * D, desc: 'Đã giặt sạch, không phai màu.' }),
    L({ title: 'Kệ giày 4 tầng inox', cat: 'noi-that', type: 'free', condition: 'Đã cũ', usedTime: '3 năm', seller: 'u2', cluster: 'hoalac', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 7 * H, desc: 'Hơi rỉ chân nhưng vẫn chắc. Cho bạn nào cần, tự qua lấy.' }),
    L({ title: 'Chăn ga gối đơn 1m2 + nệm topper', cat: 'quan-ao', price: 200000, condition: 'Tốt', usedTime: '1 năm', seller: 'u5', cluster: 'hoalac', school: 'ĐH FPT', area: 'ktx-fpt', createdAt: now - 5 * H, movingSale: true, desc: 'Đã giặt khô, sạch sẽ, vừa giường KTX.' }),
    L({ title: 'Máy tính Casio fx-580VN X', cat: 'hoc-tap', type: 'trade', tradeFor: 'Giáo trình Kinh tế vi mô hoặc 100k', price: 0, condition: 'Tốt', usedTime: '2 năm', seller: 'u3', cluster: 'hoalac', school: 'ĐHQGHN – Hòa Lạc', area: 'thach-hoa', createdAt: now - 36 * H, desc: 'Máy chạy tốt, pin còn khỏe.' }),
    L({ boostUntil: now + 2 * D, title: 'Hub USB-C 6 in 1 Ugreen', cat: 'dien-tu', price: 220000, condition: 'Như mới', usedTime: '2 tháng', seller: 'u2', cluster: 'hoalac', school: 'ĐH FPT', area: 'tan-xa', createdAt: now - 14 * H, desc: 'Đổi laptop nên không dùng nữa.' }),

    // --- Cầu Giấy ---
    L({ title: 'Tủ quần áo vải khung thép 3 buồng', cat: 'noi-that', price: 150000, condition: 'Khá', usedTime: '1.5 năm', seller: 'u6', cluster: 'caugiay', school: 'ĐHQGHN – Xuân Thủy', area: 'dich-vong', createdAt: now - 7 * H, movingSale: true, desc: 'Vải còn đẹp, khung chắc. Mình tháo sẵn để bạn dễ mang về.' }),
    L({ title: 'Combo chuyển trọ: bàn + ghế + tủ lạnh mini', cat: 'noi-that', price: 1100000, condition: 'Tốt', usedTime: '1–2 năm', seller: 'u6', cluster: 'caugiay', school: 'ĐHQGHN – Xuân Thủy', area: 'dich-vong', createdAt: now - 6 * H, movingSale: true, boostUntil: now + 6 * D, combo: [{ name: 'Tủ lạnh mini Aqua 90L', price: 900000 }, { name: 'Bàn học chân sắt 1m', price: 200000 }, { name: 'Ghế gấp', price: 80000 }], desc: 'Ưu tiên lấy cả combo trước ngày 3. Có thể hỗ trợ gọi xe ba gác nội khu.' }),
    L({ title: 'Giáo trình Tâm lý học đại cương', cat: 'hoc-tap', price: 35000, condition: 'Tốt', usedTime: '1 kỳ', seller: 'u7', cluster: 'caugiay', school: 'ĐH Sư phạm Hà Nội', area: 'mai-dich', createdAt: now - 9 * H, desc: 'Sạch, không ghi chú.' }),
    L({ title: 'Quạt tích điện mini để bàn', cat: 'gia-dung', price: 80000, condition: 'Tốt', usedTime: '6 tháng', seller: 'u8', cluster: 'caugiay', school: 'Học viện Báo chí & Tuyên truyền', area: 'nghia-tan', createdAt: now - 22 * H, desc: 'Pin dùng được 4–5 tiếng.' }),
    L({ boostUntil: now + 2 * D, title: 'Xe đạp thể thao Giant ATX, size M', cat: 'xe-the-thao', price: 2300000, condition: 'Tốt', usedTime: '2 năm', seller: 'u9', cluster: 'caugiay', school: 'ĐH Giao thông Vận tải', area: 'quan-hoa', createdAt: now - 2 * D, desc: 'Đã bảo dưỡng, bộ đề chạy mượt.' }),
    L({ title: 'Tặng sách luyện thi đại học khối D', cat: 'hoc-tap', type: 'free', condition: 'Khá', usedTime: '3 năm', seller: 'u7', cluster: 'caugiay', school: 'ĐH Sư phạm Hà Nội', area: 'mai-dich', createdAt: now - 12 * H, desc: 'Khoảng 10 cuốn, tặng các em hoặc bạn nào cần làm tài liệu.' }),
    L({ title: 'Loa Bluetooth JBL Go 3, đổi lấy tai nghe', cat: 'dien-tu', type: 'trade', tradeFor: 'Tai nghe true wireless', condition: 'Tốt', usedTime: '1 năm', seller: 'u8', cluster: 'caugiay', school: 'Học viện Báo chí & Tuyên truyền', area: 'nghia-tan', createdAt: now - 3 * D, desc: 'Âm còn to, không rè.' }),
    L({ title: 'Bếp từ đơn Sunhouse', cat: 'gia-dung', price: 250000, condition: 'Tốt', usedTime: '1 năm', seller: 'u6', cluster: 'caugiay', school: 'ĐHQGHN – Xuân Thủy', area: 'dich-vong', createdAt: now - 8 * H, movingSale: true, desc: 'Tặng kèm nồi lẩu nhỏ.' }),
    L({ title: 'Kệ sách gỗ 5 tầng', cat: 'noi-that', price: 180000, condition: 'Tốt', usedTime: '1 năm', seller: 'u9', cluster: 'caugiay', school: 'ĐH Giao thông Vận tải', area: 'quan-hoa', createdAt: now - 4 * D, desc: 'Gỗ MDF, cao 1m6.' }),
    L({ title: 'Váy công sở size M (3 chiếc)', cat: 'quan-ao', price: 120000, condition: 'Như mới', usedTime: '3 tháng', seller: 'u9', cluster: 'caugiay', school: 'ĐH Giao thông Vận tải', area: 'quan-hoa', createdAt: now - 30 * H, desc: 'Mặc vài lần, đã giặt sạch.' }),
    L({ title: 'Chuột Logitech M331 silent', cat: 'dien-tu', price: 150000, condition: 'Như mới', usedTime: '5 tháng', seller: 'u7', cluster: 'caugiay', school: 'ĐH Sư phạm Hà Nội', area: 'mai-dich', createdAt: now - 16 * H, desc: 'Click không tiếng, pin còn.' }),
  ];

  const reviews = [
    { id: 'r1', from: 'u2', to: 'u1', listingId: 'l12', stars: 5, text: 'Bạn nhiệt tình, hàng đúng mô tả, hẹn đúng giờ.', createdAt: now - 10 * D },
    { id: 'r2', item: 'Nồi lẩu điện mini', from: 'u3', to: 'u2', listingId: null, stars: 5, text: 'Giao tận KTX, rất tiện.', createdAt: now - 30 * D },
    { id: 'r3', item: 'Giá phơi đồ inox', from: 'u1', to: 'u2', listingId: null, stars: 4, text: 'Hàng ổn, hơi trễ hẹn 10 phút.', createdAt: now - 50 * D },
    { id: 'r4', item: 'Bàn gấp + đèn học', from: 'u10', to: 'u5', listingId: null, stars: 5, text: 'Chị bán rẻ lại còn tặng thêm đồ.', createdAt: now - 20 * D },
    { id: 'r5', item: 'Tủ vải 2 buồng', from: 'u1', to: 'u5', listingId: null, stars: 5, text: 'Đồ sạch sẽ, đúng như ảnh.', createdAt: now - 40 * D },
    { id: 'r6', item: 'Xe đạp mini Nhật', from: 'u7', to: 'u6', listingId: null, stars: 4, text: 'Uy tín.', createdAt: now - 25 * D },
    { id: 'r7', item: 'Giáo trình Triết học Mác–Lênin', from: 'u9', to: 'u7', listingId: null, stars: 5, text: 'Sách đẹp, giá tốt.', createdAt: now - 15 * D },
    { id: 'r8', item: 'Bàn phím Logitech K120', from: 'u6', to: 'u9', listingId: null, stars: 5, text: 'Nhiệt tình, cho xem kỹ trước khi mua.', createdAt: now - 60 * D },
    { id: 'r9', item: 'Mũ bảo hiểm 3/4', from: 'u2', to: 'u10', listingId: null, stars: 4, text: 'OK.', createdAt: now - 12 * D },
  ];

  const conversations = [
    {
      id: 'c1', listingId: 'l9', members: ['u1', 'u2'], readBy: { u1: now - 1 * H, u2: now },
      messages: [
        { from: 'u1', text: 'Ghế xoay còn không bạn?', at: now - 26 * H },
        { from: 'u2', text: 'Còn nhé, bạn qua Tân Xã xem được.', at: now - 25 * H },
        { from: 'u1', text: 'Mình đặt giữ rồi nhé, mai 5h chiều gặp ở chợ Tân Xã được không?', at: now - 4 * H },
        { from: 'u2', text: 'Ok bạn, mai 5h mình mang ra.', at: now - 30 * 60 * 1000 },
      ],
    },
    {
      id: 'c2', listingId: 'l11', members: ['u4', 'u1'], readBy: { u1: now - 3 * H, u4: now },
      messages: [
        { from: 'u4', text: 'Đèn học còn bảo hành không bạn?', at: now - 5 * H },
        { from: 'u1', text: 'Hết bảo hành rồi nhưng còn như mới nhé.', at: now - 4 * H },
        { from: 'u4', text: 'Mình giữ nhé, tối nay gặp ở thư viện.', at: now - 2 * H },
      ],
    },
  ];

  const partners = [
    { name: 'Xe ba gác chuyển trọ nội khu', phone: '0968 111 222', ad: 'Chuyển trọ Hòa Lạc chỉ từ 80k', color: ['#0ea5e9', '#2563eb'], area: 'Hòa Lạc', cluster: 'hoalac', desc: 'Chuyển đồ trong bán kính 5km, từ 80.000đ/chuyến.', icon: '🛻' },
    { name: 'Vệ sinh phòng trọ trả phòng', phone: '0977 333 444', ad: 'Dọn phòng trả cọc – lấy lại cọc trọn vẹn', color: ['#f59e0b', '#ea580c'], area: 'Hòa Lạc', cluster: 'hoalac', desc: 'Dọn phòng trước khi bàn giao, từ 150.000đ.', icon: '🧹' },
    { name: 'Sửa đồ điện gia dụng', area: 'Hòa Lạc', cluster: 'hoalac', desc: 'Sửa quạt, nồi cơm, bếp từ tại chỗ.', icon: '🔧' },
    { name: 'Chuyển nhà trọn gói sinh viên', phone: '0988 555 666', ad: 'Chuyển nhà trọn gói SV từ 300k', color: ['#0ea5e9', '#2563eb'], area: 'Cầu Giấy', cluster: 'caugiay', desc: 'Xe tải nhỏ + 2 người bốc xếp, từ 300.000đ.', icon: '🚚' },
    { name: 'Vệ sinh phòng & giặt rèm', area: 'Cầu Giấy', cluster: 'caugiay', desc: 'Hỗ trợ trả phòng lấy lại cọc.', icon: '🧽' },
    { name: 'Cửa hàng đồ cũ Dịch Vọng', phone: '0912 777 888', ad: 'Thu mua đồ cũ tận phòng', color: ['#f59e0b', '#ea580c'], area: 'Cầu Giấy', cluster: 'caugiay', desc: 'Thu mua đồ lớn không bán kịp.', icon: '🏪' },
  ];

  // Thông báo mẫu (kind: deal | review | pay | system)
  const notifications = [
    { id: 'n1', to: 'u1', kind: 'deal', text: 'Phạm Đức Long đã đặt giữ “Đèn học chống cận Rạng Đông” – hẹn tại Sảnh thư viện ĐH FPT.', link: '#/item/l11', at: now - 2 * H, read: false },
    { id: 'n2', to: 'u1', kind: 'deal', text: 'Trần Quốc Huy đã xác nhận giữ “Ghế xoay văn phòng lưới” cho bạn.', link: '#/chat/c1', at: now - 30 * 60 * 1000, read: false },
    { id: 'n3', to: 'u1', kind: 'system', text: 'Tin “Giáo trình Toán rời rạc” đang được nhiều người xem. Đẩy tin chỉ 5.000đ/lượt để lên đầu mục Mới đăng.', link: '#/item/l4', at: now - 5 * H, read: false },
    { id: 'n4', to: 'u1', kind: 'review', text: 'Trần Quốc Huy đã đánh giá bạn 5★: “Bạn nhiệt tình, hàng đúng mô tả, hẹn đúng giờ.”', link: '#/reviews?tab=received', at: now - 10 * D, read: true },
    { id: 'n5', to: 'u1', kind: 'system', text: 'Chào mừng bạn đến ReMarket! Mỗi tháng bạn có 2 tin đăng miễn phí.', link: '#/pricing', at: now - 120 * D, read: true },
  ];
  users.forEach(u => {
    if (u.id !== 'u1') notifications.push({ id: 'nw' + u.id, to: u.id, kind: 'system', text: 'Chào mừng bạn đến ReMarket! Mỗi tháng bạn có 2 tin đăng miễn phí.', link: '#/pricing', at: u.joinedAt, read: false });
  });

  const payments = [
    { id: 'p1', user: 'u5', kind: 'featured', amount: 10000, method: 'MoMo', listingId: 'l3', desc: 'Tin nổi bật 3 ngày', at: now - 1 * D },
  ];

  return { clusters, categories, conditions, users, listings, reviews, conversations, partners, notifications, payments };
})();
