# Tổng hợp tích hợp lượt 1–3

Cập nhật 2026-10-22, múi giờ Asia/Bangkok (UTC+07:00). Báo cáo này phân biệt
kiểm thử HTTP/backend thật, mock và những phần chưa xác minh; không coi build
pass hoặc HTTP 200 đơn thuần là bằng chứng đã hoàn tất nghiệp vụ.

## Xác minh live bổ sung lượt 3

Frontend thật tại `http://localhost:3000`; mọi API từ trình duyệt đi qua
`/api/backend` tới `https://cms-backend-nodejs.vercel.app/api`. Profile Chrome
thử nghiệm riêng; dùng tài khoản người dùng đã cung cấp. Không ghi mật khẩu,
access token, refresh token hoặc danh sách tài khoản vào đầu ra/file báo cáo.

Được phép đăng nhập, refresh, kiểm tra phiên và GET có xác thực. Không gọi các
endpoint ghi tài khoản/banner/logo/giới thiệu/liên hệ, không upload và không
gửi email. Guard kiểm thử chỉ cho POST login/checktoken/refreshtoken cùng GET/
HEAD; không phát sinh request ghi CMS bị chặn. Bảo vệ native form bằng POST và
disabled fieldset đã được kiểm tra độc lập ở lượt 3 trước, không chỉ dựa vào
guard automation.

| Thời điểm 2026-10-22, UTC+07:00 | Bước/endpoint | Kết quả thật |
| --- | --- | --- |
| 21:02:53 | GET `/api/backend/AllPost` trước đăng nhập | 200; response danh sách có `data` array |
| 21:03:03 | POST `/api/backend/login` qua form đã hydration | 200; duy nhất **1 lần đăng nhập**; nhận và lưu hai token, chuyển `/admin` |
| 21:03:05 | POST `/api/backend/checktoken`, access Bearer | 200; giao diện báo phiên đã được backend xác minh |
| 21:03:06 | GET `/api/backend/allaccount`, access Bearer | 200; tìm đúng tài khoản thử nghiệm trong response, `role` là **boolean true (Admin)**; không lưu dữ liệu tài khoản khác |
| 21:03:18 | Xóa riêng access token trong profile thử nghiệm, reload `/admin` | Giữ refresh token; frontend tự chạy kiểm tra phiên rồi refresh; không sửa JWT, thời hạn hoặc cấu hình backend |
| 21:03:19 | POST `/api/backend/refreshtoken`, refresh Bearer | **200, đúng 1 request refresh**; access token mới khác token trước; refresh token không đổi |
| 21:03:20 | POST `/api/backend/checktoken` sau refresh | 200; frontend báo phiên được xác minh lại |
| 21:03:21 | Mở module Tài khoản, GET `/api/backend/allaccount` từ dashboard | 200, danh sách hiển thị; không sửa role hoặc xóa tài khoản |
| 21:03:22–23 | Bấm Đăng xuất, reload dashboard | Cả hai key token localStorage vắng mặt; UI báo chưa đăng nhập; liên kết quản trị trên header không còn |
| 21:03:23 | POST `/api/backend/checktoken` riêng bằng access token đã giữ trong bộ nhớ trước logout | 200 + **true**: server vẫn chấp nhận access token cũ sau logout frontend |

Thời gian bảng chủ yếu là thời điểm bắt đầu request; phiên kết thúc lúc
`2026-10-22T14:03:23.790Z` (21:03:23.790 UTC+07:00). Không gặp 500/503 trong phiên
này, không cần gửi lại đăng nhập hoặc request có kết quả chưa rõ.

### Phạm vi kết luận về refresh và logout

- Đã kiểm thử **refresh HTTP thật do frontend thực hiện** khi chỉ còn refresh
  token trong storage; không phải mock hoặc chỉ gọi endpoint thủ công. Access
  mới được dùng để checktoken và tải module tài khoản thành công.
- Metadata JWT hiện tại cho thấy access có thời hạn 10.800 giây (3 giờ), refresh
  31.536.000 giây (365 ngày), phù hợp source backend đã đối chiếu. Không dùng
  việc decode JWT để kết luận quyền: role Admin được đọc từ GET có xác thực.
- Không chờ access token hết hạn tự nhiên, không sửa `exp`/đồng hồ/thời hạn
  backend để ép kiểm thử. Nhánh tự làm mới token sắp hết hạn và xử lý request
  đồng thời đã được mock ở lượt 3 trước; chưa kiểm thử chúng trong tình huống
  hết hạn tự nhiên hoặc nhiều tab trên live.
- Refresh token không thay đổi trong lần refresh thật này, phù hợp controller
  hiện tại không xoay token. Không khẳng định có hỗ trợ rotation khác.
- Đã xác minh logout **phía frontend** và trạng thái sau reload. Source backend
  hiện không có endpoint logout đang hoạt động. Access cũ vẫn hợp lệ sau logout
  đã được kiểm tra trực tiếp; **không có bằng chứng thu hồi phiên/token phía
  server**, không báo là đã thu hồi. Không thử refresh thêm sau logout.
- Chỉ có credentials của một tài khoản Admin. Không tự tạo tài khoản, đổi role,
  mượn thông tin tài khoản trong danh sách hoặc đoán mật khẩu để thử người dùng
  thường. Quyền thiếu Admin/403 bằng tài khoản thường vẫn **chỉ mock**, chưa
  kiểm thử live. GET không Authorization trả 401 đã được kiểm tra ở phiên trước.

Chrome được đóng, dữ liệu origin/cache được xóa và profile tạm của riêng phiên
được dọn sau khi kiểm tra; không đụng profile cá nhân. Không thay đổi `.env.local`,
Vercel hoặc backend. Working tree backend vẫn chỉ có `?? cms-test-scope.patch`
như trước. Chưa xác định SHA deployment live; commit backend local đối chiếu
vẫn là `2b204ab02a824540f0938c293e37ba63e0c71edf`.

## Trạng thái cả ba lượt

| Phần | Đã kiểm thử backend thật | Chỉ mock/offline | Chưa kiểm thử / giới hạn |
| --- | --- | --- | --- |
| Lượt 1 — kết nối và render | Backend local đúng phiên bản; proxy và server fetch trỏ local; trang danh sách/chi tiết render dữ liệu. Production build chạy tạm đọc lại được dữ liệu backend thật. | Chọn URL/proxy, forward header/query/body/status và mô phỏng build khi backend không kết nối | Runtime mất kết nối vẫn có thể hiện view rỗng/dự phòng cho request hiện tại; đã tránh đóng băng kết quả rỗng thành trang tĩnh. Không đổi cấu hình Vercel. |
| Lượt 1 — đăng nhập, TinyMCE | Đăng nhập local; upload Post thật có Bearer/FormData và nhận location; thiếu/sai token bị 401; Help → Keyboard Navigation mở được, không keynav 404. Lượt 2 có thêm upload inline News live thành công. | Upload handler luôn lấy token hiện tại; bundle Help không cần tải resource script | Không thực hiện upload mới trong phiên xác minh lượt 3 này. |
| Lượt 1 — OTP | Hai flow gọi backend local thật: challenge mới, OTP sai giữ bước xác nhận, quay lại xin mã mới không dùng challenge cũ. Người dùng xác nhận **hai email OTP đăng ký đến hộp thư thực tế**, tương ứng hai yêu cầu gửi mã đã ghi nhận. | Tách challenge hai luồng, lỗi/missing challenge không chuyển bước, mô phỏng success consume challenge | **Chưa xác nhận OTP đúng, tạo tài khoản hoặc đổi/reset mật khẩu thành công.** Email chưa có tài khoản có thể nhận challenge reset giả; chưa chứng minh gửi email reset. Không kết luận gửi trùng. Không gửi thêm email trong lượt 3. |
| Lượt 2 — Post/News | Live tạo → GET chi tiết → sửa → GET/reload → xóa cho hai bản ghi riêng của phiên; category/type đúng, nhiều tag, TinyMCE/ảnh inline và thumbnail; đọc lại dữ liệu đúng sau reload. | Payload/detail-by-ID, business 200, 409/unknown503, giữ bản nháp và không tự gửi lại; parser Multer/Mongoose offline | Không chủ động gây race/unknown trên dữ liệu live. Không chỉnh bản ghi có sẵn. |
| Lượt 2 — tag, ảnh, phân trang | Bỏ tag + đổi ảnh bị frontend chặn trước ghi; hai lần lưu thủ công có GET giữa hai lần, tag rỗng/ảnh mới tồn tại. Post trang 2→1 sau xóa trang cuối; News giữ trang 1/4 sau xóa. Hai ID thử không còn qua GET chi tiết/quét danh sách. | Giới hạn multipart thực tế, clamp/refetch trang và giữ form khi lỗi | Xóa hết tag kèm đổi ảnh không biểu diễn được bằng một request theo hợp đồng hiện tại; hai lần lưu không nguyên tử. **Năm URL ảnh thử còn truy cập được sau xóa**, chưa được dọn. |
| Lượt 3 — form đăng nhập | Đăng nhập live qua form đã hydration, POST200, nhận token và xác minh phiên | Chrome tắt JS/trước hydration và production HTML: native POST, credential fields disabled; không dựa vào chặn GET. | Không đưa mật khẩu/token vào URL. Không thay đổi thông tin tài khoản. |
| Lượt 3 — phiên/refresh/logout | checktoken thật; refresh tự động thật khi thiếu access; access mới được xác minh; refresh token không xoay trong lần thử; logout frontend/reload hết token local; access cũ vẫn được server chấp nhận | Token sắp hết hạn, đồng thời, logout đang refresh, mạng/500/503, checktoken=false/refresh401 mơ hồ không tự xóa token | Chưa chờ token hết hạn tự nhiên; chưa thử refresh invalid/hết hạn trên live, nhiều tab hoặc rotation. Backend không có logout/revocation endpoint đang hoạt động. |
| Lượt 3 — tài khoản/quyền | Tài khoản thử nghiệm có role boolean true; GET danh sách có xác thực và module dashboard thành công; GET thiếu Authorization401 ở phiên trước | Gửi role boolean cả hai giá trị, 403 giữ form/token, 401 nghiệp vụ mật khẩu, update/delete acknowledgement và unknown | Không có credentials người dùng thường; chưa kiểm thử 403 live bằng tài khoản thường. Chưa sửa role, tạo/xóa tài khoản, cập nhật hồ sơ hoặc đổi mật khẩu thật. |
| Lượt 3 — banner/giới thiệu/logo/liên hệ | Sáu GET live qua proxy trả 200, shape được đối chiếu. Xem thời điểm/số bản ghi trong báo cáo lượt 3. | CRUD được backend hỗ trợ, mapping nội dung/contact, multipart, encoded public_id, business200/409/unknown503 giữ form/file và đối chiếu thủ công; form email map payload và acknowledgement đúng | **Không ghi/upload/xóa thật** các module này; không gửi email liên hệ. Singleton không nhận ID; update/delete cũ không trả matchedCount/ID. Không tự thêm endpoint backend không có. |

## Các hạn chế chung còn lại

1. Năm ảnh thử của lượt 2 vẫn được ghi nhận là còn truy cập được sau khi bài test
   bị xóa. Không HEAD lại hoặc dọn trong phiên này; không dùng công cụ Cloudinary.
   HEAD trước đó không chứng minh trạng thái vật lý ở origin thay vì CDN cache.
   Hai bản ghi test Post/News đã được dọn trong lượt 2, chưa có bản ghi mới.
2. Nguồn gốc đợt GET500/login503 trước đó vẫn chưa xác định. Backend đã phục hồi
   mà không đổi source; không kết luận MongoDB hoặc mật khẩu chỉ từ status code.
3. Backend checktoken/refresh/middleware có thể gộp lỗi DB với lỗi token; frontend
   giữ token và báo chưa xác minh được thay vì tự đăng xuất. Chưa có bằng chứng
   live về lỗi hạ tầng trong phiên xác minh mới.
4. Chưa xác nhận SHA backend deploy hoặc thay cấu hình hosting. Không coi GET
   thành công là bằng chứng các ghi module chưa được cấp phép cũng hoạt động.
5. Quyền ghi live của lượt 2 chỉ dành cho bản ghi Post/News của phiên đã hoàn
   tất. Với tài khoản, banner, logo, giới thiệu, liên hệ hoặc email cần phạm vi
   thử nghiệm được người dùng cấp riêng trước khi kiểm thử ghi thật.

## File và kiểm tra của lần xác minh bổ sung

Không phát hiện lỗi frontend mới trong các bước live đã thực hiện; **không sửa
source hoặc backend**, không cần chạy lại typecheck/lint/build chỉ vì sửa báo cáo.
Kết quả lần sửa source gần nhất vẫn là 26/26 test, browser mock và HTTP loopback
pass; typecheck/lint/build pass với cảnh báo `<img>` có sẵn. Không trình bày các
kết quả mock đó như kiểm thử live của phiên mới.

Chỉ cập nhật `docs/integration-round3.md` để dẫn đến kết quả mới và thêm báo cáo
`docs/integration-status.md` này. Script chẩn đoán tạm ở `out/round3-live-auth.cjs`
bị gitignore, nhận credentials trong bộ nhớ và không lưu chúng. Các thay đổi
working tree có sẵn được giữ nguyên. Không commit, push hoặc deploy.

Nguồn chi tiết:
[lượt 1](integration-round1.md),
[hợp đồng lượt 2](integration-round2.md),
[CRUD live lượt 2](integration-round2-live-success.md),
[source/mock/GET lượt 3](integration-round3.md).
