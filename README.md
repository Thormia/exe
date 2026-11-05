# Chợ Trọ – Sàn đồ cũ sinh viên Hòa Lạc & Cầu Giấy

Frontend bản MVP theo `idea.docx`. Chưa có backend: dữ liệu mẫu nằm trong `js/data.js`, mọi thay đổi được lưu vào `localStorage` của trình duyệt.

## Chạy

Mở trực tiếp `index.html` bằng trình duyệt, hoặc chạy server tĩnh:

```bash
python -m http.server 5500
# mở http://localhost:5500
```

Tài khoản demo (mật khẩu `123456`), hoặc bấm đăng nhập nhanh trên trang Đăng nhập:

| Email | Cụm | Ghi chú |
|---|---|---|
| minhanh@fpt.edu.vn | Hòa Lạc | Có sẵn tin đăng, tin đặt giữ, chat, giao dịch chờ đánh giá |
| longpd@gmail.com | Hòa Lạc | Chưa xác thực sinh viên (thử luồng xác thực) |
| namvh@vnu.edu.vn | Cầu Giấy | Đang thanh lý chuyển trọ |

Mã OTP / mã xác thực demo: `123456`. Link "Khôi phục dữ liệu mẫu" ở chân trang để reset.

## Chức năng (MVP trong tài liệu)

- Đăng ký, đăng nhập, chọn cụm Hòa Lạc / Cầu Giấy; bảng tin ưu tiên tin nổi bật → cùng khu trọ → cùng trường → gần → mới.
- Đăng tin chuẩn hóa: ảnh (tối đa 6), giá, tình trạng, thời gian sử dụng, trường, khu trọ; chọn **Bán / Trao đổi / Cho tặng**.
- Tìm kiếm & lọc theo từ khóa, danh mục, hình thức, giá, trường, khu trọ, khoảng cách, tình trạng; sắp xếp.
- Nhắn tin (có trả lời tự động giả lập), **đặt giữ** kèm điểm hẹn và thời hạn, **báo cáo** tin.
- Cập nhật trạng thái đã giao dịch → hai bên **đánh giá** nhau.
- Xác thực sinh viên (email .edu.vn hoặc ảnh thẻ) và số điện thoại.
- **Thanh lý chuyển trọ**: đặt ngày chuyển đi, đăng theo **combo**, dịch vụ thanh lý phòng trọ, đối tác địa phương.
- **Gói trả phí** (theo `ReMarket - Mô hình tài chính.xlsx`, thanh toán giả lập) – trang `#/pricing`:
  - 2 tin miễn phí mỗi tháng, mua thêm **5.000đ / 2 tin**
  - **Đẩy tin** 5.000đ/lượt (lên đầu mục Mới đăng)
  - **Tin nổi bật** 10.000đ/3 ngày (ô lớn 2×2 trang chủ kèm SĐT người bán, ưu tiên tìm kiếm)
  - **Gói đối tác cửa hàng** 300.000đ/tháng
  - **Banner 2 bên** 200.000đ/tuần (giá đề xuất – chưa có trong file tài chính, sửa ở `pricing` trong `js/store.js`)
- Trang chủ kiểu Chợ Tốt: banner xoay, Gợi ý gần bạn | Mới đăng 2 cột, banner quảng cáo 2 bên (màn hình ≥1540px).
- **Bản đồ** khu Hòa Lạc (Thạch Hòa, Thạch Thất) / Cầu Giấy bằng Leaflet + OpenStreetMap (cần Internet).
- **Thông báo** (`#/notifications`, chuông trên header) và trang **Đánh giá** (`#/reviews`).

## Cấu trúc

```
index.html      khung trang
css/style.css   giao diện (responsive, có thanh điều hướng dưới trên mobile)
js/data.js      dữ liệu mẫu: cụm, trường, khu trọ, danh mục, người dùng, tin, đánh giá, chat
js/store.js     lớp API giả (window.api) – nơi duy nhất đọc/ghi dữ liệu
js/app.js       router theo hash (#/...) và các trang
```

## Nối backend sau này

Giao diện chỉ gọi `window.api`. Mỗi hàm trong `js/store.js` đã ghi chú endpoint REST tương ứng
(`GET /listings`, `POST /listings/:id/reserve`, `POST /reviews`, ...). Khi có backend, thay thân các hàm này bằng `fetch()`
(nên chuyển sang `async` và thêm `await` ở chỗ gọi trong `app.js`).
