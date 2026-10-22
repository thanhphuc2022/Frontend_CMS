# Lượt 2: CRUD Post/News và phân trang

**Kết quả mới nhất:** [chuỗi CRUD live và dọn bài test đã hoàn tất](integration-round2-live-success.md).
Các kết quả mock/local và những mục “chưa kiểm thử” bên dưới là lịch sử theo từng lần kiểm tra.

Lần kiểm tra mới được người dùng chuyển sang API live và cấp quyền ghi riêng cho
bản ghi test có tiền tố `TEST_CMS_ROUND2_`. Xem [kết quả kiểm tra live](integration-round2-live.md).
Các số liệu và kết quả local dưới đây là lịch sử kiểm chứng, không đại diện cho
trạng thái API live.

Đối chiếu source đang có tại `D:\CMSfix_codex\Backend_Tinhocnhuy`, commit
`2b204ab02a824540f0938c293e37ba63e0c71edf`. Không sửa backend hoặc dữ liệu thật.
Working tree backend vẫn chỉ có `cms-test-scope.patch` chưa track từ trước.

## Nguyên nhân và thay đổi

- Bản ghi danh sách thiếu content và quan hệ. Form sửa nay chỉ mở sau GET chi tiết
  theo **id**: `/post/:id` hoặc `/Newsid/:id`; không dùng slug hay bản ghi danh sách
  để thay thế chi tiết. GET lỗi giữ form cũ nếu đang mở, không mở form thiếu dữ liệu.
- Form tạo/sửa chung dùng TinyMCE. Chọn danh mục Post/loại News từ `/loadAllCategories`
  và `/alltype`, ánh xạ categoryId/typesid sang **name** để gửi trường category/types.
  News hỗ trợ chọn nhiều tag từ `/alltag`, giữ cả tag cũ không còn trong danh sách.
- Tạo bài cần ảnh đại diện; cập nhật có thể bỏ ảnh để giữ ảnh hiện tại. Field upload
  vẫn là file; nội dung TinyMCE dùng `/uploadimagesPost` hoặc `/uploadimagesNews`
  tương ứng, đọc token lúc upload, không tự đặt multipart Content-Type.
- Chỉ thành công khi có cả message thành công đúng controller và id tương ứng.
  HTTP 200 với lỗi nghiệp vụ không xóa form hoặc chuyển bước.
- HTTP 409 giữ bản nháp để đối chiếu. Các trạng thái creationStatus/updateStatus/
  deleteStatus = unknown (503), lỗi kết nối, hoặc response 2xx không đủ xác nhận
  sẽ khóa gửi tiếp, giữ bản nháp, cho phép đọc lại danh sách/chi tiết và yêu cầu
  người dùng xác nhận đã đối chiếu. Không có cơ chế tự retry request ghi.
- Danh sách dùng data/total/pages/currentPage/limit. Post 9/trang, News 8/trang.
  Ghi nhớ trang riêng trong query postsPage/newsPage và module đang mở trong
  contentModule. Tải lại sau thao tác thành công giữ trang hiện tại. Nếu trang
  vượt số trang còn lại, GET lại trang hợp lệ trước khi hiển thị.
- Backend News báo currentPage đã clamp nhưng skip theo page yêu cầu. Frontend
  không gán response rỗng của trang vượt giới hạn thành dữ liệu trang cuối.

## Payload và giới hạn hợp đồng

| Thao tác | Post | News |
| --- | --- | --- |
| Tạo POST | `/createPost`: title, description, content, category, file | `/createNews`: title, description, content, types, tag tùy chọn, file |
| Sửa POST | `/updatePost/:id`: title, slug, description, content, category; file tùy chọn | `/updateNews/:id`: title, slug, description, content, types, tag; file tùy chọn |
| Xóa POST | `/deletePost/:id` | `/deleteNews/:id` |
| Chi tiết GET | `/post/:id` | `/Newsid/:id` |
| Danh sách GET | `/AllPost?page=N` | `/AllNews?page=N` |

Tạo hoặc sửa có ảnh dùng FormData. Nhiều tag được gửi bằng các field tag lặp lại
(Multer nhận string/array). Sửa không có ảnh dùng JSON, được body-parser + multer
hiện tại hỗ trợ, để có thể gửi `tag: []` khi xóa hết tag.

Với cách đọc field multipart của backend hiện tại, chưa có biểu diễn mảng tag rỗng
được hỗ trợ. Nếu vừa xóa hết tag cũ vừa chọn ảnh mới,
form giữ dữ liệu và hướng dẫn lưu xóa tag không đổi ảnh trước, rồi đổi ảnh ở lần
lưu tiếp theo. Không âm thầm giữ tag cũ hoặc gửi chuỗi JSON như một tên tag.
Đây là giới hạn hợp đồng backend, không được khắc phục bằng việc sửa backend.

Giới hạn phía form: title 200, slug 250, description 5000, content 500000,
category/types 100, từng tag 100 ký tự; ảnh tối đa 5 MB.
Kiểm chứng bổ sung phát hiện giới hạn middleware chặt hơn khi gửi multipart:
mỗi trường chữ phải nhỏ hơn 102400 byte UTF-8; tối đa 19 trường chữ kèm một file.
JSON tối đa 1 MiB. Frontend đã kiểm tra thêm các giới hạn này trước khi gửi.

## Kiểm chứng

- Typecheck: đạt. Build production của bản sao cùng source trong thư mục gitignore
  `out/integration-round2`: đạt. Không ghi đè `.next` của frontend 3000 đang chạy.
  Vẫn có cảnh báo img hiện có và sharp tùy chọn.
- `node --test tests/articles.test.cjs tests/frontend-flows.test.cjs`: **13 test đạt**.
  Đây là test mock cho transport/React: payload tạo/sửa, ID chi tiết, tag rỗng,
  phân loại response, giữ TinyMCE/form khi lỗi, không tự retry, xác nhận thành công,
  giữ trang và refetch sau khi xóa hết trang cuối, cùng các test lượt 1.
- GET thật backend: Post 9 bản ghi/1 trang; News 25 bản ghi/4 trang. Trang News 4
  có 1 bản ghi; GET trang 5 trả data rỗng nhưng currentPage 4. Chi tiết Post/News
  trả đủ content và quan hệ; danh mục/loại/tag đọc được (2/4/6 lựa chọn tại thời
  điểm kiểm tra).
- Chrome headless: GET thật xác nhận trang News 2 → tải lại vẫn trang 2 → sang
  trang 3 → reload vẫn trang 3; mở sửa tải `/Newsid/:id`, điền đúng loại tin và
  nội dung chi tiết. Request update trong Chrome được chặn bằng Fetch interception,
  trả mock HTTP 200 lỗi nghiệp vụ, 409 và 503 unknown. Bản nháp và TinyMCE được
  giữ nguyên, submit bị khóa sau conflict/unknown, đọc đối chiếu không ghi đè form.
- Mô phỏng xóa bản ghi cuối trang 4: cả POST xóa và metadata danh sách sau xóa
  đều là mock; frontend tải lại trang 4 rồi trang 3, không nhảy về trang 1. Đọc lại
  backend thật xác nhận vẫn 25 News và bản ghi đó còn nguyên.
- Tổng cộng bốn request ghi mỗi lần chạy test Chrome đều bị trả response mock,
  **không request ghi nào được chuyển tới backend thật**. Không gửi email lượt 2.
- `git diff --check`: đạt.

Chưa kiểm thử tạo/sửa/xóa thành công với backend thật vì chưa có bản ghi thử nghiệm
được chỉ định và cho phép ghi. Chưa xác nhận upload ảnh News thật hoặc race 409/
unknown thật. Các kết quả ghi thành công chỉ được kiểm tra bằng mock.

## Tự kiểm tra

1. Dùng backend đúng thư mục, frontend 3000. Mở `/admin?contentModule=news&newsPage=2`.
   Kiểm tra tải lại/đổi trang và mở sửa; Network phải có GET `/Newsid/<id>`.
2. Chỉ lưu/xóa trên bản ghi thử nghiệm được phép. Kiểm tra category/types gửi tên,
   tag nhiều giá trị, ảnh tùy chọn khi sửa và nội dung TinyMCE giữ nguyên khi lỗi.
3. Sau lưu/xóa thành công phải giữ trang; nếu xóa bản ghi cuối trang cuối, phải lùi
   tới trang hợp lệ. Với 409/unknown hãy đối chiếu trước, không bấm gửi lặp mù quáng.
4. Test trình duyệt tự động: Chrome headless profile riêng trên debugging port 9225,
   backend 8080/frontend 3000 đang chạy, Node hỗ trợ WebSocket global (đã chạy bằng
   Node 22), rồi `node tests/articles-browser.cjs`. Script dùng dữ liệu News hiện có
   25 bản ghi/4 trang để kiểm tra GET; chặn mọi non-GET và không ghi dữ liệu thật.

Không mở rộng tài khoản hoặc module khác. Không commit, push, thay đổi Vercel hay deploy.

## Xác minh tích hợp bổ sung — 2026-10-22

Các thay đổi trước đó được giữ nguyên. Backend vẫn ở commit `2b204ab`; không sửa
source, cấu hình, dependencies hay file patch chưa track của backend. Ban đầu cổng
8080 từ chối kết nối; đã khởi động lại đúng source, log được lọc bí mật, MongoDB kết
nối thành công. Chỉ gọi API HTTP tới `localhost:8080`, không gọi API production.

### Đối chiếu source và payload

- `src/Router/post_Router.ts:11,13,15,25,39`: POST create/update/delete, GET chi
  tiết theo ID, POST upload Post. `src/Router/news_Router.ts:11,13,15,19,43` là
  các route tương ứng của News. Các route ghi/upload đều chạy middleware JWT.
- `src/Controller/News.ts:109–115` đọc tag từ req.body và chấp nhận string hoặc
  string array. `:151` và `:166` gán trực tiếp tag vào update, không JSON.parse
  chuỗi tag, không có clearTags và không đọc avatar URL từ JSON.
- `src/middleware/file.ts:8–11`: multer memoryStorage, single("file"), giới hạn
  file 5 MiB, fields 20, fieldSize 100 KiB, parts 21. Boundary giữ do trình duyệt
  tạo; middleware validateImageContent kiểm tra magic bytes ảnh.
- `src/Controller/News.ts:12–23`: uploadImagesNews đọc req.file.buffer, gọi
  uploadImageBuffer với req.userId rồi trả `{ location }`; thiếu file trả 400,
  upload lỗi trả 500. Frontend TinyMCE chọn `/uploadimagesNews` cho News, file
  multipart và Bearer token hiện tại. Chưa gọi upload thật trong lần này.

Đường dẫn source trong mục này đều tương đối với
`D:\CMSfix_codex\Backend_Tinhocnhuy`.

### Kiểm chứng multipart bằng middleware/model thật, không ghi dữ liệu

`tests/backend-multipart.test.cjs` import đúng middleware Multer và model News
đã cài trong backend; dựng byte multipart từ FormData rồi gọi middleware trong
process kiểm tra. Mongoose chỉ cast query, không exec/save. Không import server,
không kết nối DB, không gọi controller, không upload Cloudinary.

| Payload kèm file | req.body.tag sau Multer | Update Mongoose sau cast |
| --- | --- | --- |
| Bỏ trường tag | undefined | Bỏ tag khỏi update; tag cũ không được xóa |
| tag="" | "" | tag: [""] |
| tag[]="" hoặc tag[0]="" | [""] | tag: [""] |
| tag="[]" | Chuỗi "[]" | tag: ["[]"] |
| tag="one", tag="two" | ["one", "two"] | tag: ["one", "two"] |
| JSON tag: [], không có file | [] | tag: [] |

Vì middleware không giải mã part JSON và controller chỉ đổi ảnh qua req.file,
JSON tag: [] cộng avatar/base64/file trong body JSON không thay được ảnh. Upload
News riêng rồi gửi location cũng không phải một request và controller update
không nhận location làm ảnh đại diện. Trong các biểu diễn field được hỗ trợ,
chưa có request đơn đúng hợp đồng để xóa hết tag đồng thời đổi ảnh. Giữ hướng dẫn
hai lần lưu **thủ công**; frontend chặn tổ hợp đó trước request, không tự chia
thành hai request ghi. Hai lần lưu không có tính nguyên tử, có thể thành công
một phần; cần đọc đối chiếu sau từng lần trước khi quyết định tiếp tục.

Phát hiện và sửa lỗi frontend có bằng chứng: frontend trước đây chỉ kiểm tra
content 500000 ký tự, nhưng Multer thật nhận 102399 byte và từ chối 102400 byte
với HTTP 400. Tương tự, 19 field chữ + file được nhận; 20 field chữ + file bị
từ chối do parts limit. `src/lib/articles.ts` nay kiểm tra theo byte UTF-8 và số
field trước khi gửi; JSON kiểm tra tổng byte theo body-parser 1 MiB. Lỗi validation
giữ nguyên form/TinyMCE và không phát request. Không cắt nội dung hoặc tự đổi sang
nhiều request để vượt giới hạn.

### Phần đã kiểm tra / phần còn chờ

- HTTP GET thật local: Post 9 bản ghi; News 25 bản ghi/4 trang; chi tiết cả hai
  trả content và quan hệ; danh mục Post/loại tin/tag có 2/4/6 lựa chọn. Không sửa
  bản ghi hiện có, không gửi request HTTP ghi, email hoặc upload ảnh trong lần này.
- Test bổ sung dùng middleware/model **thật nhưng chạy offline**, khác với test
  backend HTTP thật và khác với mock controller ghi.
- Test tự động hiện có thêm kiểm tra giới hạn payload, giữ bản nháp và không phát
  request khi quá giới hạn. Chạy:
  `node --test tests/articles.test.cjs tests/frontend-flows.test.cjs tests/backend-multipart.test.cjs`.
  Test backend offline cần thư mục backend/dependencies; có thể đặt CMS_BACKEND_DIR.
- Kết quả sau sửa: **16 test đạt**, gồm 14 test mock/frontend và 2 test chạy
  middleware/model backend thật offline. Typecheck, lint file sửa và build bản sao
  `out/integration-round2` đều đạt; build chỉ còn cảnh báo img hiện có.
- Chưa có dữ liệu CRUD được chỉ định cho phép ghi. Tài khoản được cung cấp để
  kiểm thử đăng nhập/upload lượt 1 không được hiểu là cho phép sửa/xóa bài có sẵn
  hoặc tạo mới tài nguyên lượt này. Chưa kiểm thử chuỗi tạo → đọc → sửa → đọc →
  xóa thật, upload News thật, reload sau ghi thật hoặc phân trang sau xóa thật.
- Theo source, `Post.ts:171` và `News.ts:186` chủ động hoãn physical image cleanup;
  delete chỉ gọi deleteOne cho bài viết. prepareUpdatedImageReferences cũng giữ
  tham chiếu ảnh cũ. Vì chưa có chuỗi ghi/xóa thật, chưa xác minh URL ảnh còn truy
  cập được sau xóa; không kết luận đã dọn ảnh. Không gọi cleanup hay xóa tài
  nguyên Cloudinary ngoài phạm vi.

### Checklist sẵn sàng cho dữ liệu được cho phép

- [ ] Người dùng xác nhận được tạo riêng một Post và một News có tiền tố
  `cms-r2-verify-<timestamp>`, tài khoản thực hiện, danh mục/loại tin/tag dùng cho
  fixture, ảnh PNG tự tạo và quyền xóa đúng hai bài thử nghiệm. Không dùng bài có sẵn.
- [ ] Ghi lại tổng/trang hiện tại bằng GET; chỉ dùng proxy local và server env local.
- [ ] Upload ảnh nội dung News: kiểm tra POST /uploadimagesNews, Bearer (chỉ ghi có/
  thiếu, không ghi token), file/boundary, HTTP 200 và location; giữ danh sách URL
  ảnh thử nghiệm để đối chiếu, không tự dọn chúng.
- [ ] Tạo từng bài: kiểm tra message/id đúng, GET chi tiết theo id, reload và so
  sánh title/slug/description/nội dung TinyMCE/quan hệ/tag/ảnh.
- [ ] Sửa bài thử nghiệm: thay nội dung/slug/quan hệ, nhiều tag và ảnh; GET lại
  cùng id và reload để xác nhận dữ liệu, không chỉ dựa vào HTTP 200.
- [ ] News: JSON tag: [] không đổi ảnh phải xóa hết tag thật. Tổ hợp xóa hết tag
  kèm ảnh phải bị chặn và giữ bản nháp, không có request ghi. Nếu người dùng
  quyết định lưu hai lần thủ công, đối chiếu kết quả riêng sau từng lần.
- [ ] Xóa đúng các ID fixture, GET xác nhận không còn bài, reload danh sách đúng
  trang và lùi trang nếu trang cuối rỗng. Trường hợp 409/unknown dừng và đọc đối
  chiếu, không tự retry. Không tạo thêm hàng loạt bài chỉ để làm đầy trang.
- [ ] Với URL ảnh thử nghiệm được tạo trong chuỗi đã cho phép: ghi nhận tồn tại/
  không tồn tại sau xóa. Không gọi destroy/cleanup.

Các ô chưa đánh dấu là phần còn chờ, không phải test đã pass.
