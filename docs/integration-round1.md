# Xác minh tích hợp lượt 1 — 2026-10-21

## Backend được chọn

`D:\CMSfix_codex\Backend_Tinhocnhuy`, commit
`2b204ab02a824540f0938c293e37ba63e0c71edf`, trùng HEAD GitHub tại thời điểm kiểm tra.
Working tree backend chỉ có file chưa track `cms-test-scope.patch` từ trước;
không sửa, xóa, pull hoặc ghi đè backend.

Đã chạy backend thật trên cổng 8080 bằng dependencies và `.env` sẵn có; MongoDB
kết nối thành công. Chỉ kiểm tra biến môi trường có/thiếu, không ghi giá trị vào
log. Frontend đúng workspace đã chạy tại cổng 3000 và được giữ nguyên tiến trình.

| Bản backend | Phiên bản/khác biệt | Dùng cho lượt 1 |
| --- | --- | --- |
| `D:\CMSfix_codex\Backend_Tinhocnhuy` | `2b204ab`; OTP theo challenge, đăng ký qua transaction; upload có xác thực | Có |
| `D:\CMSfix_codex\CMS_Backend_Nodejs_clean` | Chưa có commit; các file đang staged; có challenge nhưng cách hoàn tất đăng ký cũ hơn, không có `.env`/dependencies | Không |
| `D:\SourceTHNY\Blog_Tinhocnhuy` | `25f48e7`, 2025-06-13; OTP toàn cục, không có challengeId, upload chưa gắn middleware xác thực | Không |
| `D:\Source THNY\Blog_Tinhocnhuy` | Cũng `25f48e7`, cùng hợp đồng OTP cũ | Không |
| `D:\THNY\Blog_Tinhocnhuy` | `ca8b7fb`, 2025-01-16; OTP toàn cục | Không |

Hợp đồng đã đọc trong controller/router của backend được chọn:

| Endpoint | Request | Response/điều kiện |
| --- | --- | --- |
| POST `/register` | username, fullname, email, password, repassword | Thành công trả challengeId; lỗi không chuyển bước |
| POST `/postregister` | otp, challengeId | Challenge đăng ký; OTP sai/hết hạn trả 400 |
| POST `/forgotpass` | email | Trả challengeId; email chưa có tài khoản cũng nhận challenge giả để tránh dò tài khoản |
| POST `/forgotpassword` | otp, challengeId | Challenge password-reset; OTP sai trả 400; đúng mới đổi mật khẩu |
| POST `/uploadimagesPost` | Authorization Bearer; multipart field file | Thành công trả location |

OTP backend có hạn 60 giây, tối đa 5 lần thử; giới hạn yêu cầu mã mới là 3 lần
trong 15 phút cho từng purpose/email. Không đọc OTP từ database hay bỏ xác thực.

## Kiểm tra thực tế

- Backend `/api/AllPost` và proxy `/api/backend/AllPost`: HTTP 200, cùng 9 bài.
- Backend `/api/AllNews` và proxy `/api/backend/AllNews`: HTTP 200, cùng 8 tin.
- Chạy `serverGet` từ source với transport fetch thật: đích đều là
  `http://localhost:8080/api/...`. Các trang `/posts`, `/news` trên frontend 3000
  render 9/8 bài, khớp tiêu đề trả từ backend.
- Chrome headless với profile riêng: đăng nhập bằng tài khoản thử nghiệm do người
  dùng cung cấp thành công HTTP 200; access token được lưu. Không lưu credentials
  vào báo cáo hoặc log.
- Gọi handler upload đang đăng ký trong TinyMCE bằng PNG tạo từ canvas: POST qua
  proxy, có Bearer token, boundary do trình duyệt tạo; HTTP 200, nhận location HTTPS.
  Thử thiếu token và token fixture không hợp lệ đều bị backend từ chối HTTP 401,
  với hai thông báo khác nhau, chứng minh header được chuyển tiếp. Lần upload
  thành công tạo một ảnh kiểm thử trên dịch vụ lưu ảnh; không tạo bài viết.
- Help → Keyboard Navigation mở được và hiển thị “Begin keyboard navigation”.
  Resource tiếng Anh đã đăng ký; không có request keynav 404 hoặc runtime exception.
- Hai luồng OTP chạy qua form React và backend thật: request khởi tạo HTTP 200 có
  challenge; gửi `000000` (backend chỉ sinh mã 100000–999999) trả 400 và giữ bước
  xác nhận. Quay lại bỏ bước OTP; khởi tạo lại nhận challenge khác. Request xác
  nhận sau đó dùng challenge mới, không dùng challenge cũ.
- Hai yêu cầu đăng ký đã gọi SMTP thành công và chỉ dùng địa chỉ thử nghiệm người
  dùng cho phép. Người dùng đã xác nhận email OTP đến hộp thư thực tế hai lần,
  tương ứng hai yêu cầu gửi mã đăng ký trong lần kiểm tra này; chưa có bằng chứng
  về lỗi gửi trùng. Chưa kiểm thử OTP đúng. Không hoàn
  tất đăng ký nên không tạo tài khoản mới. Với email chưa đăng ký, forgotpass có
  thể trả challenge giả; kiểm tra reset ở trên không chứng minh đã gửi email reset
  hoặc đổi mật khẩu thành công. Không dùng người nhận tìm thấy trong dữ liệu.

## Lỗi fetch khi build và sửa frontend

Tái hiện bằng bản sao project trong `out/integration-before`, cấu hình backend
loopback không hoạt động tại cổng 18080. Đây là mô phỏng backend mất kết nối,
không phải kiểm thử backend giả lập dữ liệu.

- `/posts` và `/news` vẫn build thành công nhưng HTML có **0 article**.
- `/` dùng banner/danh sách dự phòng có sẵn trong frontend.
- Prerender manifest có cả ba trang với `initialRevalidateSeconds: 60`.
- Vì `getApi`/`serverGet` bắt lỗi và trả null, Next coi render này thành công.
  Nếu deploy kết quả đó, nội dung thiếu dữ liệu có thể được phục vụ cho đến khi
  revalidate thành công; request đầu sau TTL vẫn có thể nhận nội dung cũ. Khi API
  tiếp tục lỗi, hàm vẫn trả kết quả rỗng/dự phòng và có thể thay thế dữ liệu cũ.

Chỉ sửa cấu hình kết nối/cache frontend: `src/lib/server-api.ts` dùng
`cache: 'no-store'`; `src/app/page.tsx` dùng cùng cache và `dynamic = 'force-dynamic'`.
Không đổi giao diện hoặc hợp đồng endpoint.

Build bản sao sau sửa trong `out/integration-after` với backend loopback vẫn tắt:
build đạt; `/`, `/posts`, `/news` được đánh dấu dynamic, không có entry prerender
hoặc HTML tĩnh cho chúng. Chạy bản production này tạm trên 3189, chuyển cấu hình
runtime về backend thật 8080: `/posts` có 9 bài, `/news` có 8 tin, tiêu đề khớp;
trang chủ khớp banner backend sau khi tính HTML escaping. Response có
`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.
Proxy production tạm cũng trả HTTP 200 và 9 bài. Không còn giữ danh sách rỗng từ
lúc build. Backend mất kết nối tại runtime vẫn có thể trả view rỗng/dự phòng cho
request hiện tại; lần truy cập sau sẽ fetch lại.

Build tạm trên ổ C ban đầu thất bại do junction node_modules sang ổ D làm webpack
resolve đường dẫn sai. Đã chạy lại bản sao trên cùng ổ D; lỗi công cụ đó không
được tính là lỗi mã frontend.

## Kiểm tra tự động và giới hạn

- Typecheck `npx tsc --noEmit --incremental false`: đạt.
- 7 test `node --test tests/frontend-flows.test.cjs`: đạt. Đây là test dùng mock
  cho fetch/React, khác với kiểm tra Chrome và backend thật phía trên.
- Build bản sao trước/sau sửa: đạt; vẫn có cảnh báo img hiện có và sharp tùy chọn.
- `git diff --check`: đạt.
- Chưa kiểm thử OTP đúng, tạo tài khoản thành công hoặc reset mật khẩu thành công.
  Chưa thay đổi cấu hình môi trường Vercel, commit, push hoặc deploy.

## Tự kiểm tra tiếp

1. Giữ backend đúng thư mục trên, cổng 8080; frontend cổng 3000 với `.env.local`
   đặt `BACKEND_API_BASE_URL=http://localhost:8080/api`.
2. Đăng nhập và upload ảnh TinyMCE; kiểm tra status 200, location và header Bearer
   nhưng không chia sẻ giá trị token. Mở Help → Keyboard Navigation.
3. Với email thử nghiệm chưa có tài khoản, yêu cầu đăng ký và nhập OTP mới nhất
   trong 60 giây. Quay lại xin mã mới phải dùng challenge mới. Tránh vượt giới hạn
   gửi OTP; lần xác minh này đã dùng hai lượt gửi đăng ký và hai request
   `/forgotpass` (request này cũng chịu giới hạn theo IP).
4. Sau khi đăng ký thành công, dùng đúng email đó để thử quên mật khẩu. Nhập mã sai
   phải giữ bước OTP; mã đúng mới thay mật khẩu. Không dùng tài khoản đang dùng
   cho công việc vì reset thành công thay mật khẩu và hủy refresh token cũ.
