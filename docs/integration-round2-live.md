# Xác minh lượt 2 với API live — 2026-10-22

**Cập nhật:** lần tiếp tục đã đăng nhập và hoàn tất CRUD thật, dọn hai bài test.
Xem [kết quả live mới nhất](integration-round2-live-success.md) và
[manifest ID/ảnh/request](round2-live-session-20261022-1319.json).
Phần dưới giữ lịch sử lần kiểm tra bị chặn bởi 500/503, không phải trạng thái mới nhất.

## Phạm vi được cho phép và cấu hình đã áp dụng

Người dùng cho phép tạo/sửa/xóa Post và News của chính phiên này, với tiêu đề bắt
đầu `TEST_CMS_ROUND2_` kèm dấu thời gian, upload ảnh thử và kiểm tra URL ảnh sau
xóa. Không cho phép sửa/xóa bản ghi có sẵn, sửa backend hoặc dùng công cụ riêng
để xóa Cloudinary. Phạm vi này thay thế giới hạn chỉ đọc ở các lần kiểm tra trước.

Đã cập nhật duy nhất biến sau trong `.env.local`, giữ nguyên các biến khác:

```env
BACKEND_API_BASE_URL=https://cms-backend-nodejs.vercel.app/api
```

`.env.local` vẫn được gitignore. Đã xác định đúng tiến trình frontend thuộc
workspace, dừng và khởi động lại Next dev trên cổng 3000 để áp dụng cấu hình.
Trình duyệt tiếp tục dùng `/api/backend`; proxy và server fetch cùng lấy
BACKEND_API_BASE_URL. Không sửa Environment Variables hoặc deployment Vercel.

## Kết quả HTTP thật, không mock

| Kiểm tra | Kết quả |
| --- | --- |
| GET root API live `/` | 200, chuỗi nhận diện `Backend CMS` |
| GET live `/api/AllPost?page=1` | 500, JSON message `Server Error` |
| GET live `/api/AllNews?page=1` | 500, JSON message `Internal Server Error` |
| GET live `/api/loadAllCategories` | 500 |
| GET live `/api/alltype` | 500 |
| GET live `/api/alltag` | 500 |
| GET frontend `/api/backend/AllPost?page=1` | 500, cùng message với API live |
| GET frontend `/api/backend/AllNews?page=1` | 500, cùng message với API live |
| GET server-rendered `/posts`, `/news` | 200 HTML nhưng 0 article, vì serverGet bắt lỗi API và trả null/[] |
| Chrome: dashboard News | Request qua `/api/backend/AllNews`, nhận 500; chưa mở form tạo |
| Chrome: đăng nhập với tài khoản thử nghiệm đã cung cấp | POST `/api/backend/login` nhận 503, không lưu access token |

Các GET live và proxy được kiểm tra lại có giới hạn; kết quả 500 vẫn lặp lại.
Các route dữ liệu đo được mất khoảng 10 giây, trong khi root trả 200 nhanh.
Không có bằng chứng từ log triển khai để xác định nguyên nhân phía backend hoặc
dịch vụ dữ liệu. Không suy diễn mật khẩu sai từ HTTP 503.

Root không cung cấp x-app-version/x-git-sha. Dấu nhận diện chung không chứng minh
backend live cùng commit `2b204ab` với source local. Do các GET dữ liệu thất bại,
**chưa xác minh được phiên bản/hợp đồng live tương thích lượt 2**: chưa đối chiếu
được cấu trúc phân trang, chi tiết, quan hệ và tag qua dữ liệu trả về của live.
Không gửi create/update/delete/upload để dò hợp đồng trong trạng thái này.

Lỗi 500 đã xuất hiện khi gọi API trực tiếp, không chỉ qua proxy. HTML 200 của
trang danh sách không được tính là dữ liệu hoạt động. Chưa có bằng chứng cần sửa
code frontend lượt 2; lần này chỉ đổi cấu hình local và cập nhật tài liệu.

## Trạng thái dữ liệu và tài nguyên của phiên

| Hạng mục | Trạng thái |
| --- | --- |
| Post tạo trong phiên | 0; không có ID |
| News tạo trong phiên | 0; không có ID |
| Request sửa/xóa bài | 0 |
| Request upload ảnh | 0 |
| URL ảnh test | Không có |
| Bản ghi hoặc ảnh test còn sót từ phiên live này | Không có, do chưa tạo/upload |
| Xác minh ảnh sau khi xóa | Chưa thực hiện; không có ảnh của phiên để kiểm tra |

Không ghi/sửa/xóa bài có sẵn. Không gửi lại request tạo khi chưa rõ kết quả, không
gửi email, không gọi cleanup/destroy Cloudinary. Không thay đổi hoặc dọn tài
nguyên của các phiên kiểm tra trước. Các thao tác CRUD live được người dùng cho
phép nhưng **chưa thực hiện**, không phải đã pass.

## Kiểm tra tự động và phần chưa xác minh

Chạy lại:

```text
node --test tests/articles.test.cjs tests/frontend-flows.test.cjs tests/backend-multipart.test.cjs
```

**16 test đạt**: 14 test frontend/mock và 2 test middleware/model backend local
thật chạy offline, không kết nối DB. Kết quả này không chứng minh CRUD hay upload
News trên API live thành công. Không sửa code frontend nên không chạy lại build
chỉ cho thay đổi env; đã khởi động lại frontend và kiểm tra HTTP/giao diện thật.
`git diff --check` đạt. Working tree trước đó được giữ nguyên.

Các bước chờ API live đọc/đăng nhập hoạt động:

- [ ] Xác nhận GET list/detail/lookups trả đúng cấu trúc lượt 2 và đăng nhập nhận
  access token. Nếu có khác biệt với source local, ghi rõ trước khi tạo bài.
- [ ] Tạo đúng một Post và một News có tiền tố `TEST_CMS_ROUND2_` + dấu thời gian;
  giữ ID ngay khi response được xác nhận, ghi danh sách URL ảnh thử riêng.
- [ ] Tạo → đọc chi tiết theo ID → sửa → đọc lại → reload → xóa trên đúng ID
  của phiên; đối chiếu title/slug/content TinyMCE/quan hệ/ảnh/tag sau mỗi lần.
- [ ] Upload ảnh nội dung News qua TinyMCE: POST `/uploadimagesNews`, field file,
  Bearer hiện tại, multipart boundary và response location; kiểm tra lưu ảnh
  trong content vẫn đúng sau đọc lại/reload.
- [ ] Nhiều tag → xóa hết tag bằng JSON không đổi ảnh → GET xác nhận; tổ hợp
  xóa hết tag kèm ảnh bị chặn và giữ form. Kiểm tra hai lần lưu **thủ công** có
  đối chiếu sau từng lần, không tự chia hai request ghi.
- [ ] Sau delete đã được xác nhận, reload đúng trang; nếu trang cuối rỗng, lùi
  về trang hợp lệ. Unknown/mất kết nối thì đọc đối chiếu trước, không tự gửi lại.
- [ ] Dọn đúng hai bài do phiên tạo; kiểm tra URL ảnh riêng sau delete bằng đọc
  HTTP, báo URL còn tồn tại. Không dùng công cụ Cloudinary khác để dọn ảnh.

Không thực hiện lượt 3, sửa backend, commit, push hoặc deploy.
