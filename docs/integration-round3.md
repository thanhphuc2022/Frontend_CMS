# Tích hợp lượt 3 — 2026-10-22 (UTC+7)

**Cập nhật mới nhất:** đã kiểm thử đăng nhập, phiên, refresh, quyền Admin và
logout/reload với API live theo quyền bổ sung của người dùng. Xem
[tổng hợp ba lượt và kết quả live lượt 3](integration-status.md).
Các mục “chỉ mock/chưa kiểm thử live” bên dưới ghi nhận lần kiểm tra trước khi
được cấp quyền đăng nhập/refresh; không thay thế kết quả mới trong tổng hợp.

Giữ nguyên thay đổi lượt 1–2. Không sửa backend, cấu hình Vercel hoặc `.env.local`;
không commit/push/deploy. Không ghi dữ liệu live, gửi email hoặc xóa tài nguyên
Cloudinary trong lượt này. Năm ảnh còn sót của lượt 2 được giữ nguyên.

## Nguồn hợp đồng và giới hạn đối chiếu

Đọc trực tiếp backend tại `D:\CMSfix_codex\Backend_Tinhocnhuy`, HEAD
`2b204ab02a824540f0938c293e37ba63e0c71edf`. Working tree backend vẫn chỉ có
`?? cms-test-scope.patch`; không pull, ghi đè hoặc sửa file backend.
Nguồn đối chiếu: `src/Router/Authentication_Router.ts`, `Account_Router.ts`,
`token_Router.ts`, `src/Controller/Authentication.ts`, `Account.ts`,
`src/middleware/jwt.ts`, `authorize.ts`, `file.ts`, toàn bộ
`src/Display/Display_Router`, `Display_Controller`, và `src/Services/mailer.ts`,
`replaceDisplayImage.ts`, `sp.ts`.

Backend live: `https://cms-backend-nodejs.vercel.app/api`. Các GET bên dưới đã
kiểm tra cấu trúc response thực tế qua frontend cổng 3000. Không có bằng chứng
SHA bản triển khai live; không khẳng định toàn bộ code live trùng source local.
Hợp đồng ghi/quyền/token được đối chiếu source và kiểm tra bằng mock, chưa kiểm
thử ghi live theo giới hạn cho phép của lượt 3.

## Lỗi đã xác nhận và thay đổi frontend

| Bằng chứng/nguyên nhân | Thay đổi |
| --- | --- |
| `AuthForms`: form thiếu `method`/`action`; HTML mặc định GET khi chưa có React handler | Tất cả form xác thực có `method="post"`, action về trang tương ứng; `AuthShell` render fieldset disabled từ HTML server, chỉ mở sau hydration; có hướng dẫn noscript. Không gọi endpoint login bằng native form. |
| `Authentication.updateRole`: `typeof role !== 'boolean'` trả 400; dashboard stringify giá trị select thành chuỗi | `cmsJsonBody` chuyển đúng `true`/`false` boolean và từ chối giá trị khác. Không thay đổi backend hoặc bỏ xác thực. |
| Header/dashboard trước đây chỉ kiểm tra sự tồn tại token; `apiRequest` chưa có refresh | Dùng `/checktoken`, refresh qua `/refreshtoken`, trạng thái phiên rõ ràng, kiểm tra lại thủ công. Không xóa token do mạng/500/503 hoặc phản hồi xác thực mơ hồ. |
| `Contact.getContact` trả `{contact: [...]}` nhưng `normalizeList` không đọc key này | Đọc danh sách liên hệ đúng wrapper, kiểm tra shape trước khi coi tải danh sách thành công. |
| `About_Index.findAboutIndex` trả `content`, update yêu cầu `content_about_index` | Thêm ánh xạ nguồn cho form sửa; giữ nguyên HTML đang có. |
| `Types_News.createTypes_News` trả 200 + `Danh mục đã tồn tại`; dashboard trước đây reset mọi 2xx | Phân loại theo acknowledgement đúng từng module/action; lỗi nghiệp vụ giữ form. 409/unknown/mạng/5xx chặn ghi tiếp cho đến khi người dùng tải lại, đối chiếu và xác nhận thủ công. |
| `sp.getPublicIdFromUrl` hiện trả `Tinhocnhuy/<id>`; route xóa ảnh chỉ nhận một `:id` | Encode ID ở dashboard; proxy encode lại từng segment đã được Next decode. Không biến dấu `/` trong ID thành route segment mới. Các ID ảnh GET live hiện có không chứa `/`; trường hợp theo source mới đã kiểm tra bằng mock và HTTP loopback. |
| `mailer.contact2` yêu cầu `contact, subject, info, text`; frontend gửi `name,email,phone,services,content`, success lại là `{mess:'da gui thanh cong'}` | Ánh xạ dữ liệu form liên hệ công khai đúng hợp đồng, giữ thông tin họ tên/email/điện thoại/dịch vụ; chỉ reset khi có acknowledgement `mess` đúng; giữ form và yêu cầu đối chiếu nếu kết quả gửi email chưa rõ. Không gửi email thật. |

Dashboard giữ form, nội dung HTML và file đang chọn khi lỗi; message xuất hiện
trong form sửa. Tải lại phục vụ đối chiếu không ghi đè bản nháp. Có chặn submit
đồng thời và không tự phát lại request ghi. Update banner/about không đổi ảnh
dùng JSON; khi có ảnh vẫn POST FormData field `file`, để trình duyệt tạo boundary.
Có kiểm tra giới hạn ảnh 5 MiB và trường multipart nhỏ hơn 100 KiB UTF-8.

## Quyền và phiên đăng nhập

- `role=true`: Admin. `authorize` truy vấn role trong DB ở mỗi request và chỉ
  chấp nhận boolean true. Quản lý tài khoản và các module Display cần cả
  `middleware` lẫn `authorize`.
- `role=false`: người dùng đã đăng nhập, không phải Admin. Theo router hiện tại,
  Post/News/danh mục/loại tin/tag chỉ cần middleware xác thực; không tự suy diễn
  cơ chế phân quyền theo chủ sở hữu hoặc đổi nghiệp vụ này ở frontend.
- `/allaccount` (GET), `/updateauth/:username`, `/deleteaccount/:username` (POST)
  chỉ Admin. Response danh sách chỉ chọn `username, fullname, email, role`.
  Update JSON `{role: boolean}`; delete không cần body. Thành công trả
  `{message:'Cập nhật thành công'}` / `{message:'Đã xoá'}`. Backend cấm tự sửa
  role hoặc xóa chính mình (400). Frontend ghi rõ quyền và hiển thị lỗi 401/403;
  các nút frontend không thay thế bảo vệ backend.
- `/putAccount`: POST JSON `{fullname,email}` của chính người đăng nhập;
  `/changePass`: POST JSON `{password,newpassword,renewpassword}`. Sai mật khẩu
  hiện tại cũng trả 401: giữ thông báo nghiệp vụ này, không coi là token hết hạn.
  Chỉ sau acknowledgement đổi mật khẩu đúng mới xóa token local và yêu cầu đăng
  nhập lại, vì backend thu hồi refresh token khi đổi mật khẩu.
- `/checktoken`: POST với access Bearer, JSON boolean. Access token có hạn 3 giờ;
  refresh 365 ngày theo source. Decode `exp` chỉ để lên lịch làm mới trước khi
  gửi request; không dùng claim client để cấp quyền hay thay xác minh server.
- `/refreshtoken`: POST, **refresh token trong Authorization Bearer**, không gửi
  trong URL/body; trả `{accesstoken}`. Source hiện tại **không xoay refresh token**.
  Chia sẻ một Promise refresh cho request đồng thời trong cùng runtime; so sánh
  token và thế hệ phiên để refresh đang chờ không khôi phục phiên sau logout/login
  mới. Không giả định cơ chế rotation khác hoặc thêm endpoint. Nhiều tab có thể
  cùng làm mới với refresh token không xoay; chưa có kiểm thử nhiều tab live.
- Token sắp hết hạn: refresh trước request. Khi nhận 401: có thể refresh và thử
  lại GET/HEAD tối đa một lần; **không gửi lại POST/PUT/PATCH/DELETE tự động**.
  Form giữ dữ liệu và yêu cầu thử lại thủ công. 403 báo thiếu quyền, không refresh.
- `/checktoken` bắt cả lỗi DB rồi trả false; refresh/middleware cũng bắt rộng và
  có thể trả 401 khi DB lỗi. Không thể phân biệt chính xác token sai và backend
  lỗi chỉ từ các response này. Frontend báo chưa xác minh được phiên và giữ
  token; không khẳng định đã đăng xuất.
- Không có endpoint logout đang hoạt động. Đăng xuất hiện tại chỉ xóa hai token
  ở localStorage và cập nhật UI; không khẳng định refresh token bị thu hồi trên
  server. Header chỉ hiện liên kết quản trị sau khi phiên được backend xác minh.

## Bảng module Display và liên hệ

GET trong bảng là công khai; các POST quản trị đều cần access Bearer **và Admin**.
POST `/contact` công khai có rate limiter, gửi email tới địa chỉ cố định phía
backend; không phải CRUD thông tin liên hệ CMS.

| Module | Endpoint hiện có | Payload | Response / thao tác frontend |
| --- | --- | --- | --- |
| Banner | GET `/allcontentbanner`; POST `/createcontentbanner`, `/updatecontentbanner/:id`, `/deletecontentbanner/:id` | `title,content,linkservices`; tạo có `file`, sửa ảnh tùy chọn; xóa không cần body | GET `{content_banner:[...]}`; create `Thêm thành công`, update `Cập nhật thành công`, delete `Đã xoá` trong `message`. Frontend đủ danh sách/tạo/sửa/xóa/ảnh; giữ HTML và bản nháp. |
| Block giới thiệu | GET `/allabout`; POST `/createabout`, `/updateabout/:id`, `/deleteabout/:id` | `title,content`; tạo có `file`, sửa ảnh tùy chọn | GET array đầy đủ; message create/update như banner, delete `Đã xoá bài viết`. Frontend đủ CRUD/ảnh. Không có endpoint chi tiết riêng trong router này. |
| Giới thiệu ngắn | GET `/aboutcontent`; POST `/createaboutcontent`, `/updateaboutcontent`, `/deleteaboutcontent` | `{content_about_index:string}`; delete không body | GET array với `content`; message `Thêm thành công`, `Cập nhật thành công`, `Đã xoá`. Đã sửa ánh xạ form; đủ CRUD. Update/delete không nhận ID. |
| Ảnh giới thiệu | GET `/allaboutimage`; POST `/createaboutimage`, `/deleteaboutiamge/:id` | FormData `file`; delete ID=`public_id` đã encode, không cần file/body | GET array `link_images,public_id`; create `{message:'Thêm hình ảnh thành công'}`, delete JSON string `Đã xoá`. Đủ danh sách/thêm/xóa; giữ đúng typo endpoint backend. Không có update riêng. |
| Logo | GET `/allimagelogo`; POST `/createimagelogo`, `/deleteimagelogo/:id` | FormData `file`; delete `public_id` đã encode | GET array `link_Images,public_id`; acknowledgement giống ảnh giới thiệu. Đủ danh sách/thêm/xóa; backend không có update riêng. |
| Thông tin liên hệ CMS | GET `/getcontact`; POST `/createcontact`, `/updatecontact` | JSON `{contact,map}`; tối đa 500/2000 ký tự | GET `{contact:[...]}`; message `Thêm thành công` / `Cập nhật thành công`. Đã sửa danh sách; đủ tạo/sửa. Không có delete hoặc update theo ID. |
| Form liên hệ công khai | POST `/contact` | JSON `{contact,subject,info,text}`; giới hạn 200/200/500/10000 ký tự, subject không CR/LF | Thành công `{mess:'da gui thanh cong'}`; 400 input, 429 rate limit, 503 thiếu cấu hình/rate limiter, 502 gửi mail lỗi. Đã sửa mapping, success và giữ form. Chỉ mock. |

Không bổ sung endpoint mà backend không có. Giới thiệu ngắn/liên hệ dùng
`updateOne`/`deleteOne` không chỉ định ID. Frontend không cho tạo thêm khi đã có
bản ghi; chặn cập nhật/xóa mơ hồ nếu GET trả nhiều bản ghi hoặc chưa tải được
danh sách. Đây là giới hạn chọn bản ghi của backend, không tự sửa bằng cách gửi
ID mà controller bỏ qua. Các controller cũ cũng thường trả message thành công
mà không trả ID/matchedCount; chưa đủ để chứng minh có thay đổi DB nếu bản ghi
biến mất đồng thời. Frontend tải lại danh sách sau acknowledgement.

## Kết quả kiểm tra

### HTTP thật — chỉ GET, không ghi

Qua `http://localhost:3000/api/backend` tới cấu hình API live hiện tại:

| Thời gian UTC+7, 2026-10-22 | Endpoint | Kết quả |
| --- | --- | --- |
| 20:42:04 | `/allcontentbanner` | 200, 6 bản ghi, wrapper đúng |
| 20:42:05 | `/allabout` | 200, 5 bản ghi |
| 20:42:06 | `/aboutcontent` | 200, 1 bản ghi |
| 20:42:06 | `/allaboutimage` | 200, 3 bản ghi |
| 20:42:07 | `/allimagelogo` | 200, 11 bản ghi |
| 20:42:08 | `/getcontact` | 200, 1 bản ghi trong `contact` |
| 20:51:31 | `/allaccount`, không Authorization | 401, thông báo yêu cầu đăng nhập đúng hợp đồng |

Không dùng tài khoản thật, không POST login/checktoken/refresh hoặc ghi live
trong lượt này. GET 200 không chứng minh các thao tác ghi hoặc email đã hoạt động.

### Mock và HTTP loopback

- `node --test tests/articles.test.cjs tests/frontend-flows.test.cjs tests/backend-multipart.test.cjs tests/round3.test.cjs`: **26/26 pass**. Bao gồm hồi quy lượt 1–2, token hiện tại, refresh đồng thời, logout trong lúc refresh, lỗi mạng/500/503, 401 nghiệp vụ/403, payload role boolean, acknowledgement, contact đúng hợp đồng và giữ form/khóa gửi trùng. Hai test multipart dùng parser/model backend offline, không kết nối DB.
- `node tests/round3-browser.cjs`, Chrome riêng cổng 9228, frontend thật cổng 3000: **pass**. Tắt JS và chặn tải script trước hydration: HTML disable credential fields, ép native `form.submit()` vẫn POST, query/body trống do disabled fieldset. Automation không có quy tắc chặn GET có credential; không dựa vào chặn GET để pass. Hydrated login/session mock; contact wrapper, mapping giới thiệu; role boolean cả hai giá trị và giữ form trên 403; duplicate type HTTP 200; banner giữ HTML/file trên unknown 503 và 409, tải lại không ghi đè bản nháp, xác nhận thử lại thủ công; delete logo encode `public_id` và gửi Authorization. Tất cả browser API/non-GET được mock, không upload/email/ghi thật.
- `node tests/round3-proxy-http.cjs`: **pass**, Next production build + backend HTTP giả trên loopback, port riêng. Xác nhận route param chứa slash đi qua Next thật vẫn là một ID, giữ query/method/Authorization/409 và **đúng từng byte multipart/boundary**. Xác nhận HTML production login có POST và disabled fieldset. Không gọi production backend.

### Typecheck / lint / build

- `npx tsc --noEmit --incremental false`: pass.
- `node node_modules/next/dist/bin/next lint --no-cache`: pass, còn cảnh báo
  `@next/next/no-img-element` hiện có; không có lỗi lint hoặc cảnh báo hook mới.
  Lần đầu lint bị sandbox từ chối ghi/xóa cache; đã chạy lại thành công với quyền
  phù hợp, không coi lần lỗi quyền là pass.
- Production build: pass bằng `node node_modules/next/dist/bin/next build` tại
  `out/integration-round3` (bản staging bị gitignore, dùng cùng dependencies).
  Đối chiếu hash toàn bộ source staging với workspace: **0 khác biệt**. Build
  không làm hỏng `.next` của frontend đang chạy; không deploy. Các trang dữ liệu
  `/`, `/posts`, `/news` và chi tiết vẫn dynamic. Build pass không chứng minh dữ
  liệu/ghi live đã hoạt động.

## File thay đổi trong lượt 3

- `src/components/AuthForms.tsx`: native POST/hydration, login acknowledgement,
  trạng thái phiên, giữ form khi account update chưa rõ, xử lý đổi mật khẩu.
- `src/components/Header.tsx`: trạng thái đã xác minh qua backend.
- `src/components/admin/AdminDashboard.tsx`: role, mapping, form/list/error,
  encode ID, giới hạn singleton, multipart/JSON và đối chiếu trước thử lại.
- `src/components/PublicContactForm.tsx`: hợp đồng gửi liên hệ và giữ form.
- `src/lib/api.ts`: session/refresh, 401/403 và wrapper contact.
- `src/lib/use-session.ts` (mới): hook đồng bộ trạng thái phiên.
- `src/lib/cms-modules.ts` (mới): boolean role, acknowledgement/error và payload.
- `src/app/api/backend/[...path]/route.ts`: giữ encoded path parameter.
- `tests/frontend-flows.test.cjs`: cập nhật mock dependency session.
- `tests/round3.test.cjs`, `tests/round3-browser.cjs`,
  `tests/round3-proxy-http.cjs` (mới): kiểm tra lượt 3.
- Báo cáo này. Các file lượt trước tiếp tục được giữ trong working tree.

## Chưa xác minh và cách kiểm tra tiếp

Chưa kiểm thử tài khoản Admin/người dùng thật, sửa role/xóa tài khoản, đổi mật
khẩu, refresh khi hết hạn thực tế, upload/CRUD Display hoặc gửi liên hệ thật.
Chưa xác nhận quyền trên SHA triển khai live; 403 hiện được kiểm tra bằng mock.
Không có quyền ghi live riêng cho các module này, nên không sử dụng dữ liệu
hiện có hoặc tài khoản lượt 2 để thực hiện ghi.

Có thể kiểm tra không ghi trên trình duyệt: tắt JavaScript rồi reload `/login`
(input/button disabled, có hướng dẫn bật JS); bật lại JS, mở Network và kiểm
tra mọi API ở `/api/backend`; mở các tab banner/giới thiệu/logo/liên hệ để xem
GET. Các trường hợp lỗi/unknown, role và ghi hãy chạy browser fixture nêu trên.
Để kiểm tra ghi thật cần phạm vi bản ghi/tài khoản/email thử nghiệm được cho
phép riêng; kiểm tra từng acknowledgement rồi GET đọc lại. Không xóa năm ảnh
Cloudinary của lượt 2 bằng công cụ khác.
