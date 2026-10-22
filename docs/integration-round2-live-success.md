# Lượt 2 — chuỗi CRUD live đã hoàn tất, 2026-10-22

API: `https://cms-backend-nodejs.vercel.app/api`. Frontend tại localhost:3000,
trình duyệt gọi `/api/backend`. Các request bên dưới là **HTTP thật**, không mock.
Người dùng cho phép đăng nhập/rate limiter, tạo/sửa/xóa riêng dữ liệu và upload
ảnh của phiên này. Không sửa backend, môi trường Vercel hoặc dữ liệu có sẵn.

Chi tiết không chứa credentials: [manifest phiên](round2-live-session-20261022-1319.json).
Manifest lưu ID ngay khi response tạo trả về, status, thời điểm UTC và UTC+07:00,
header có/không Bearer, loại body, URL ảnh thử và kết quả kiểm tra. Không lưu
password, access token hoặc refresh token.

## Kết quả HTTP và giao diện thật

GET qua proxy trả 200 cho Post, News, danh mục, loại tin và tag trước khi ghi.
GET chi tiết theo ID trả đủ content/quan hệ. Hành vi route, payload, message/id
thành công và dữ liệu đọc lại tương thích hợp đồng lượt 2 đã triển khai; không
có thông tin SHA để khẳng định chính xác commit backend đang deploy.

POST đăng nhập thực tế duy nhất thành công lúc **20:22:46 UTC+07:00**, nhận token
và lưu trong profile Chrome thử nghiệm riêng. Không lặp đăng nhập API.

| Thao tác | Post | News |
| --- | --- | --- |
| ID do phiên tạo | `test_cms_round2_20261022_1319_post` | `test_cms_round2_20261022_1319_news` |
| Tiêu đề ban đầu | `TEST_CMS_ROUND2_20261022_1319_POST` | `TEST_CMS_ROUND2_20261022_1319_NEWS` |
| Tạo | 200, 20:24:04 UTC+07:00 | 200, 20:24:14 UTC+07:00 |
| Đọc lại sau tạo | Đúng ID/title/description/content/categoryId/ảnh | Đúng ID/title/description/content/typesid/2 tag/ảnh và ảnh inline |
| Sửa | 200, 20:25:42; đổi title, slug, description, category, TinyMCE và ảnh | Hai lần lưu riêng, 20:26:20 và 20:26:28, đều 200 |
| GET/reload sau sửa | Form tải đúng chi tiết theo ID, giá trị mới tồn tại | Form tải đúng chi tiết theo ID, loại tin mới, tag rỗng, nội dung/ảnh mới tồn tại |
| Xóa | 200, 20:27:42 UTC+07:00 | 200, 20:27:50 UTC+07:00 |
| Đọc lại sau xóa | Chi tiết báo không còn bài, quét danh sách không có ID | Chi tiết báo không còn bài, quét danh sách không có ID |

Các tiêu đề sửa vẫn giữ tiền tố của phiên, thêm `_UPDATED`. Chỉ sửa/xóa ID sau khi
đọc lại thấy đúng ID và tiêu đề mang tiền tố phiên đã ghi nhận. Không sửa/xóa bài
có sẵn. Nội dung TinyMCE có đoạn HTML và ảnh inline để đối chiếu sau lưu/reload.

## Upload News, tag và hai lần lưu thủ công

- Gọi `images_upload_handler` đang đăng ký trong TinyMCE News bằng PNG riêng
  được tạo từ canvas; request thật POST `/api/backend/uploadimagesNews` trả 200,
  có Bearer hiện tại và FormData field file/boundary do trình duyệt tạo, nhận
  location HTTPS Cloudinary. Ảnh được đưa vào content và vẫn còn trong dữ liệu
  sau tạo/sửa/reload. Không mock handler hoặc response trong bước này.
- News được tạo bằng FormData với hai tag; GET chi tiết xác nhận đúng mảng tag.
- Trong form sửa, bỏ toàn bộ tag và chọn ảnh mới cùng lúc: frontend chặn trước
  request ghi, hiện hướng dẫn hai lần lưu, giữ title/nội dung TinyMCE và file đã
  chọn. Kiểm tra số request POST không tăng.
- Lần lưu riêng thứ nhất: bỏ file mới khỏi form, giữ tag rỗng và các chỉnh sửa
  nội dung; gửi JSON một lần. GET xác nhận `tag: []`, ảnh cũ không đổi, title,
  slug, description, typesid và content được lưu.
- Đọc lại chi tiết và mở lại form. Lần lưu riêng thứ hai: chọn lại PNG mới, gửi
  multipart một lần. GET xác nhận thumbnail thay đổi và tag vẫn là `[]`.
- Reload dashboard rồi mở lại form theo ID: các trường mới, tag rỗng, ảnh mới và
  nội dung TinyMCE có ảnh inline khớp dữ liệu backend.

Hai lần lưu này là hai hành động riêng có GET đối chiếu giữa chúng, không phải
frontend tự chia một submit thành hai request. Giới hạn không thể xóa hết tag
kèm đổi ảnh trong một request theo hợp đồng được hỗ trợ vẫn còn; thao tác hai
lần không có tính nguyên tử.

## Phân trang và dọn dữ liệu

- Post trước phiên có 9 bài/1 trang; sau tạo có 10 bài/2 trang, bài test ở trang 2.
  Sau xóa chính bài test đó, dashboard tải lại trang 2 rồi chuyển trang 1/1;
  reload vẫn ở trang 1, tổng trở về 9.
- News trước phiên có 25 bài/4 trang; sau tạo có 26 bài, bài test ở trang 1 theo
  thứ tự ngày mới nhất. Sau xóa, dashboard/reload giữ trang 1/4, tổng trở về 25.
- Cả hai ID test được xác nhận không còn qua GET chi tiết và quét toàn bộ danh
  sách. Không còn bản ghi test của phiên này.
- Năm URL ảnh thử (hai thumbnail Post; ảnh inline và hai thumbnail News) đều
  được HEAD sau khi xóa bài: **200, image/png**. Các URL vẫn truy cập được; HEAD
  không chứng minh trạng thái vật lý ở origin/CDN cache. Chưa có xác nhận đã dọn
  ảnh; báo là tài nguyên ảnh còn truy cập được. Không gọi destroy/cleanup hoặc
  dùng công cụ Cloudinary khác. URL cụ thể có trong manifest và bảng ảnh kèm dưới.

## Lỗi, giới hạn và tính an toàn

- Không gặp API 500/503 hoặc response ghi unknown trong chuỗi CRUD HTTP thật.
  Không có request ghi nào được gửi lại do mất kết nối/không rõ kết quả.
- Sự cố automation trước POST đăng nhập: submit xảy ra trước React hydration,
  form gửi GET và một đầu ra chẩn đoán đã hiển thị URL chứa trường nhạy cảm. Đã
  báo người dùng ngay, xóa URL khỏi history, bổ sung kiểm tra onSubmit đã hydrate
  và chặn GET chứa trường nhạy cảm trước khi tiếp tục. Không chép URL/giá trị vào
  báo cáo hoặc manifest. Lần GET đó không phải POST đăng nhập API; chỉ có một
  POST đăng nhập thật. Profile tạm được đóng và dọn sau phiên.
- Không sửa code frontend/backend trong lần xác minh này vì không phát hiện lỗi
  chức năng lượt 2 mới. Các thay đổi trước đó giữ nguyên. Không sửa config Vercel,
  commit, push hoặc deploy. Chưa làm lượt 3.
- Test mock/offline được báo riêng với HTTP thật. Các test lỗi nghiệp vụ 200,
  conflict 409, unknown 503 và parser multipart đã kiểm tra ở các lượt trước;
  không chủ động gây các lỗi/race đó trên dữ liệu live.

Phiên hoàn tất CRUD trên phạm vi được phép. Hạn chế còn lại: cần hai lần lưu thủ
công cho xóa hết tag + đổi ảnh; các URL ảnh thử còn truy cập được sau xóa bài;
chưa xác minh SHA deployment và chưa có nguyên nhân xác nhận cho sự cố 500/503 cũ.

## URL ?nh th? c?n truy c?p ???c sau x?a

| B?i | Vai tr? | URL | HEAD sau x?a |
| --- | --- | --- | --- |
| posts | thumbnail-v1 | https://res.cloudinary.com/dia7pht4q/image/upload/v1792675446/Tinhocnhuy/content-e6823bf5-7233-41b3-bbe6-3a8c2b177e32.png | 200 |
| posts | thumbnail-v2 | https://res.cloudinary.com/dia7pht4q/image/upload/v1792675543/Tinhocnhuy/znzwisekhicarsktuwqr.png | 200 |
| news | inline | https://res.cloudinary.com/dia7pht4q/image/upload/v1792675453/Tinhocnhuy/b3fusskhq28krk9dmf6i.png | 200 |
| news | thumbnail-v1 | https://res.cloudinary.com/dia7pht4q/image/upload/v1792675455/Tinhocnhuy/content-9ea90ff3-0e1c-4eaf-b5ff-68b4798baabd.png | 200 |
| news | thumbnail-v2 | https://res.cloudinary.com/dia7pht4q/image/upload/v1792675589/Tinhocnhuy/wgatuj04ibcyaidxs5eo.png | 200 |

## Ki?m tra t? ??ng sau phi?n

`node --test tests/articles.test.cjs tests/frontend-flows.test.cjs tests/backend-multipart.test.cjs`: **16 test ??t** (14 mock/frontend, 2 middleware/model th?t offline). Kh?ng t?nh c?c test n?y l? HTTP live. Kh?ng s?a source n?n kh?ng ch?y l?i build ch? cho b?o c?o.
