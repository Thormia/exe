# ReMarket – Giao dịch đồ cũ cộng đồng Hòa Lạc

Frontend bản MVP theo báo cáo Checkpoint 4 (`cp4.docx`). Chưa có backend: dữ liệu mẫu nằm trong `js/data.js`, mọi thay đổi được lưu vào `localStorage` của trình duyệt.

## Chạy

Mở trực tiếp `index.html` bằng trình duyệt, hoặc chạy server tĩnh:

```bash
python -m http.server 5500
# mở http://localhost:5500
```

Tài khoản demo (mật khẩu `123456`), hoặc bấm đăng nhập nhanh trên trang Đăng nhập:

| Email | Vai trò trong demo |
|---|---|
| linhhm@fpt.edu.vn | Hoàng Mai Linh – sinh viên sắp ra trường, đang bán đồ (đã dùng hết 2 tin miễn phí của tài khoản) |
| minhtd@gmail.com | Trần Đức Minh – tân sinh viên đi mua đồ |
| hung.deal@gmail.com | Lê Văn Hùng – người bán đáng ngờ (tin iPad đòi đặt cọc) |
| admin@remarket.vn | Quản trị viên – trang Kiểm duyệt `#/admin` |
| minhanh@fpt.edu.vn | Nguyễn Minh Anh – có tin đã tự ẩn sau 30 ngày để demo gia hạn |

Mã xác thực email demo: `123456`. Link "Khôi phục dữ liệu mẫu" ở chân trang để reset.

## Chức năng (phạm vi MVP trong cp4)

- **Tài khoản email**: đăng ký bằng email bất kỳ (không bắt buộc email trường), xác thực email trước khi đăng tin. Không xác thực sinh viên, không SMS OTP.
- **Đăng tin**: Bán / Trao đổi / Cho tặng (giá tự thành 0đ). **Cho tặng là mục riêng** (`#/cho-tang`), không trộn vào tìm kiếm và các danh sách tin bán; bắt buộc ảnh thật, giá, tình trạng, khu vực giao dịch; tin hiển thị ngay, kiểm duyệt sau.
- **Tìm kiếm & lọc** theo từ khóa, danh mục, hình thức, giá, khu trọ/KTX, trường/nhóm, khoảng cách, tình trạng; bản đồ khu Hòa Lạc (Leaflet + Google Maps).
- **Liên hệ**: nhắn tin trên web; số điện thoại chỉ hiện khi người bán tự chọn hiển thị.
- **Trạng thái tin**: chỉ người bán đánh dấu Đã bán / Đã cho tặng / Đã trao đổi. Khi người mua hẹn gặp trong tin nhắn, hệ thống gửi lời nhắc cập nhật. Tin không cập nhật sau **30 ngày tự ẩn**, gia hạn miễn phí và không trừ lượt.
- **Báo cáo & kiểm duyệt**: người dùng báo cáo tin; quản trị viên xử lý trong 24 giờ: ẩn và yêu cầu chỉnh sửa / gỡ tin / không vi phạm; hạn chế quyền đăng khi tái phạm.
- **Dịch vụ trả phí** (cp4 mục 3.5), thanh toán chuyển khoản (mô phỏng):
  - 2 tin bán / trao đổi miễn phí cho mỗi tài khoản (không làm mới theo tháng); mua thêm **5.000đ / 2 tin**
  - Tin **cho tặng** luôn miễn phí, không tính vào hạn mức, không bán dịch vụ hiển thị
  - **Đẩy tin** 5.000đ/lượt
  - **Tin ưu tiên** 10.000đ/3 ngày
  - **Banner đối tác** 300.000đ/tháng/vị trí (tách khỏi danh mục tin C2C)
  - Hoa hồng giao dịch: 0đ

Không có trong MVP (theo cp4): đặt giữ, đánh giá người bán (lộ trình 2028), thanh lý trọn phòng / combo, gói cửa hàng bán trên sàn, cụm ngoài Hòa Lạc.

## Cấu trúc

```
index.html      khung trang
css/style.css   giao diện (responsive, có thanh điều hướng dưới trên mobile)
js/data.js      dữ liệu mẫu: khu vực Hòa Lạc, danh mục, người dùng, tin, báo cáo, tin nhắn
js/store.js     lớp API giả (window.api) – nơi duy nhất đọc/ghi dữ liệu
js/app.js       router theo hash (#/...) và các trang
```

## Nối backend sau này

Giao diện chỉ gọi `window.api`. Mỗi hàm trong `js/store.js` đã ghi chú endpoint REST tương ứng
(`GET /listings`, `POST /listings/:id/sold`, `POST /admin/reports/:id`, ...). Khi có backend, thay thân các hàm này bằng `fetch()`
(nên chuyển sang `async` và thêm `await` ở chỗ gọi trong `app.js`).
